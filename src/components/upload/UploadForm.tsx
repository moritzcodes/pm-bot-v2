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
      
      // For large files, use direct upload to Vercel Blob
      if (file.size > 4 * 1024 * 1024) { // If file is larger than 4MB
        try {
          // 1. Get a pre-signed URL for direct upload
          const directUploadResponse = await fetch('/api/direct-upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filename: file.name,
              fileType: file.type,
              fileSize: file.size,
            }),
          });

          if (!directUploadResponse.ok) {
            const errorData = await directUploadResponse.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to get upload URL: ${directUploadResponse.status}`);
          }

          const { uploadUrl, blobUrl, filename } = await directUploadResponse.json();
          
          // 2. Upload directly to Vercel Blob
          const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': file.type,
            },
            body: file,
          });

          if (!uploadResponse.ok) {
            throw new Error(`Failed to upload file to storage: ${uploadResponse.status}`);
          }
          
          // 3. Create a transcription record
          const createResponse = await fetch('/api/transcriptions/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filename: file.name,
              url: blobUrl,
              fileSize: file.size,
              mimeType: file.type,
            }),
          });
          
          if (!createResponse.ok) {
            const errorData = await createResponse.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to create transcription record: ${createResponse.status}`);
          }
          
          uploadData = await createResponse.json();
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }
      } else {
        // For smaller files, use the standard upload
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch('/api/transcriptions/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to upload file: ${uploadResponse.status}`);
        }

        uploadData = await uploadResponse.json();
      }
      
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