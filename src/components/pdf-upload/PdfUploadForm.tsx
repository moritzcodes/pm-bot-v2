'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from '@/components/ui/textarea';

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export function PdfUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');

  const isValidFileType = (file: File) => {
    const validTypes = ['application/pdf'];
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
      
      // For all files, use the PDF upload endpoint which handles both small and large files
      const formData = new FormData();
      formData.append('file', file);
      if (notes.trim()) {
        formData.append('notes', notes);
      }

      const uploadResponse = await fetch('/api/pdfs/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to upload PDF file: ${uploadResponse.status}`);
      }

      const responseData = await uploadResponse.json();
      
      // Check if we got a presigned URL for a large file
      if (responseData.uploadUrl && responseData.fields) {
        // This is a large file that needs client-side upload to S3
        setError(`Uploading ${(file.size / (1024 * 1024)).toFixed(2)}MB file to storage...`);
        
        try {
          // Create a FormData object for the S3 upload
          const s3FormData = new FormData();
          
          // Append all the required fields from the presigned post
          Object.entries(responseData.fields).forEach(([key, value]) => {
            s3FormData.append(key, value as string);
          });
          
          // Append the actual file as the last field
          s3FormData.append('file', file);
          
          // Upload directly to S3 using the presigned URL
          const s3UploadResponse = await fetch(responseData.uploadUrl, {
            method: 'POST',
            body: s3FormData,
            mode: 'no-cors', // Use no-cors mode for direct S3 uploads
          });
          
          // S3 response with no-cors is opaque, so we can't check status
          // Just proceed assuming it worked
          
          uploadData = {
            id: responseData.id,
            url: responseData.blobUrl
          };
        } catch (s3Error: any) {
          console.error('S3 upload error:', s3Error);
          throw new Error(`Failed to upload to S3: ${s3Error.message}`);
        }
      } else {
        // Small file that was uploaded directly through the API
        uploadData = responseData;
      }
      
      setFileId(uploadData.id);

      // Process the PDF and add to vector database
      setStatus('processing');
      setError('Processing PDF...');
      
      const processResponse = await fetch(`/api/pdfs/${uploadData.id}/process`, {
        method: 'POST',
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to process PDF: ${processResponse.status}`);
      }

      // Successfully added to assistant
      setStatus('success');
      setError(null);
      
      // Redirect to a confirmation page or home after success
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Upload PDF Document</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="space-y-4">
          <div>
            <label htmlFor="file" className="block text-sm font-medium mb-2">
              Select PDF file
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
                  setError('Invalid file type. Please upload a PDF file.');
                }
              }}
              accept="application/pdf"
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
          
          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-2">
              Notes (optional)
            </label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any context or notes about this PDF"
              className="w-full"
            />
          </div>
          
          {file && file.size > 4 * 1024 * 1024 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Large file detected:</strong> {(file.size / (1024 * 1024)).toFixed(2)}MB
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Files larger than 4MB will be uploaded directly to storage. This may take several minutes for very large files.
              </p>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground">
            Note: PDF will be processed and added to the assistant's knowledge base.
          </p>
        </div>

          <Button type="submit" className="mt-4">
            Upload & Process
          </Button>

        {(status === 'uploading' || status === 'processing') && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">
              {status === 'uploading' ? 'Uploading...' : 'Processing PDF and adding to assistant...'}
            </p>
            {status === 'processing' && (
              <p className="text-xs text-muted-foreground mt-1">
                This may take a few minutes for larger documents
              </p>
            )}
          </div>
        )}

        {status === 'success' && (
          <p className="text-sm text-green-600 mt-4">
            PDF successfully added to assistant! Redirecting...
          </p>
        )}
      </Card>
    </form>
  );
} 