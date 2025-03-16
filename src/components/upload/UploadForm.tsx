'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';

interface ProductTerm {
  id: string;
  term: string;
  description: string | null;
  category: string | null;
}

type UploadStatus = 'idle' | 'uploading' | 'transcribing' | 'editing' | 'success' | 'error';

import { Input } from "@/components/ui/input";
import { getS3Url } from "@/lib/s3";

export function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string>('');

  const isValidFileType = (file: File) => {
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'video/mp4', 'video/webm'];
    return validTypes.includes(file.type);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setStatus('uploading');
    setError(null);

    try {
      let uploadData;
      
      // Show status for file upload
      setError(`Preparing upload for ${(file.size / (1024 * 1024)).toFixed(2)}MB file...`);
      
      // 1. Get a pre-signed URL for direct upload to S3
      const uploadUrlResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
        // Set reasonable timeout
        signal: AbortSignal.timeout(60000), // 60 second timeout
      }).catch(err => {
        console.error('Network error getting S3 upload URL:', err);
        // Provide more helpful error message for timeout errors
        if (err.name === 'TimeoutError' || err.message.includes('timed out')) {
          throw new Error(`Upload service timed out. This could be due to server configuration issues or network problems. Please try again later or contact support.`);
        }
        throw new Error(`Network error getting S3 upload URL: ${err.message}`);
      });

      if (!uploadUrlResponse.ok) {
        let errorMessage = `Failed to get S3 upload URL: ${uploadUrlResponse.status}`;
        try {
          const errorData = await uploadUrlResponse.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // If we can't parse the error JSON, just use the status code
        }
        throw new Error(errorMessage);
      }

      const { uploadUrl, fields, fileKey, blobUrl } = await uploadUrlResponse.json();
      if (!uploadUrl || !fields || !fileKey) {
        throw new Error('Invalid response from server: missing upload URL or file key');
      }
      
      // Update status to show progress
      setError(`Uploading ${(file.size / (1024 * 1024)).toFixed(2)}MB file to S3...`);
      
      // 2. Upload directly to S3 using the presigned URL
      try {
        // Use the uploadUrl and fields from the response
        
        // Create a FormData object and append all the required fields
        const formData = new FormData();
        Object.entries(fields).forEach(([key, value]) => {
          formData.append(key, value as string);
        });
        
        // Append the actual file as the last field
        formData.append('file', file);
        
        // Upload to S3 using the presigned URL
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
          mode: 'no-cors', // Use no-cors mode for direct S3 uploads
          // Set reasonable timeout based on file size
          signal: AbortSignal.timeout(Math.max(60000, file.size / 10000)), // At least 60s, more for larger files
        }).catch(err => {
          console.error('Network error uploading file to S3:', err);
          // Provide more detailed error information
          const errorMessage = err.message || 'Unknown error';
          const isCorsError = errorMessage.includes('CORS') || 
                             errorMessage.includes('cross-origin') || 
                             errorMessage.includes('blocked by CORS policy');
          
          if (isCorsError) {
            throw new Error(`CORS error: The S3 bucket may not be configured to allow uploads from this domain. Please check S3 bucket CORS configuration. Details: ${errorMessage}`);
          } else {
            throw new Error(`Network error uploading file to S3: ${errorMessage}`);
          }
        });
        
        // Log response status for debugging
        console.log('S3 upload response status:', uploadResponse.status);

        // When using no-cors mode, the response status is always 0 (opaque)
        // We can't rely on response.ok check as it will always be false
        // Instead, we assume the upload was successful if we got a response without errors
        // The actual success/failure will be determined when we try to use the file URL later
      } catch (s3Error) {
        console.error('S3 upload error:', s3Error);
        throw s3Error;
      }
      
      // Use the blobUrl from the API response
      const fileUrl = blobUrl;
      
      // Update status
      setError(`Creating transcription record...`);
      
      // 3. Create a transcription record
      const createResponse = await fetch('/api/transcriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          url: fileUrl,
          fileSize: file.size,
          mimeType: file.type,
        }),
      }).catch(err => {
        console.error('Network error creating record:', err);
        throw new Error(`Network error creating record: ${err.message}`);
      });
      
      if (!createResponse.ok) {
        let errorMessage = `Failed to create transcription record: ${createResponse.status}`;
        try {
          const errorData = await createResponse.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // If we can't parse the error JSON, just use the status code
        }
        throw new Error(errorMessage);
      }
      
      uploadData = await createResponse.json();
      
      // Clear the informational error message
      setError(null);
      
      setTranscriptionId(uploadData.id);

      // Start transcription process
      setStatus('transcribing');
      const transcribeResponse = await fetch(`/api/transcriptions/${uploadData.id}/transcribe`, {
        method: 'POST',
      });

      if (!transcribeResponse.ok) {
        const errorData = await transcribeResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to transcribe audio: ${transcribeResponse.status}`);
      }

      const transcribeData = await transcribeResponse.json();

      // Set transcription for editing
      setTranscription(transcribeData.transcription || transcribeData.content);
      setStatus('editing');
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  };

  const handleTranscriptionEdit = async () => {
    if (!transcription || !transcriptionId) return;

    try {
      const response = await fetch('/api/transcriptions/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcription,
          id: transcriptionId,
        }),
      });

      if (!response.ok) throw new Error('Failed to save transcription');
      
      setStatus('success');
      
      // Redirect to the transcription details page
      setTimeout(() => {
        router.push(`/transcriptions/${transcriptionId}`);
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save transcription');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Upload Media</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="space-y-4">
          <div>
            <label htmlFor="file" className="block text-sm font-medium mb-2">
              Select audio or video file
            </label>
            <input
              id="file"
              type="file"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0] || null;
                if (selectedFile && isValidFileType(selectedFile)) {
                  setFile(selectedFile);
                  setStatus('idle');
                  // Show file size warning for large files
                  if (selectedFile.size > 20 * 1024 * 1024) {
                    setError(`Warning: Large file (${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB). Upload may take several minutes.`);
                  } else {
                    setError(null);
                  }
                } else if (selectedFile) {
                  setError('Invalid file type. Please upload an audio or video file.');
                }
              }}
              accept="audio/*,video/*"
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
          
          <p className="text-sm text-muted-foreground">
            Note: All product terms will be automatically included to improve transcription accuracy.
          </p>
          
          {file && file.size > 20 * 1024 * 1024 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Large file detected:</strong> {(file.size / (1024 * 1024)).toFixed(2)}MB
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Large files will be uploaded directly to AWS S3. This may take several minutes for very large files.
              </p>
            </div>
          )}
        </div>

        {status === 'editing' && (
          <div className="mt-4">
            <label htmlFor="transcription" className="block text-sm font-medium">
              Review and edit transcription
            </label>
            <Textarea
              id="transcription"
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              className="w-full mt-2 p-2 min-h-[200px] rounded-md border"
            />
            <Button
              type="button"
              onClick={handleTranscriptionEdit}
              className="mt-4"
            >
              Save Transcription
            </Button>
          </div>
        )}

        {status === 'idle' && file && (
          <Button type="submit" className="mt-4">
            Upload & Process
          </Button>
        )}

        {(status === 'uploading' || status === 'transcribing') && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">
              {status === 'uploading' ? 'Uploading...' : 'Transcribing...'}
            </p>
            {status === 'transcribing' && (
              <p className="text-xs text-muted-foreground mt-1">
                This may take a few minutes for longer audio/video files
              </p>
            )}
          </div>
        )}

        {status === 'success' && (
          <p className="text-sm text-green-600 mt-4">
            Transcription saved successfully! Redirecting...
          </p>
        )}
      </Card>
    </form>
  );
}

