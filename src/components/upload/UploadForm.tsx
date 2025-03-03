'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type UploadStatus = 'idle' | 'uploading' | 'transcribing' | 'editing' | 'success' | 'error';

export function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string>('');
  const [transcription, setTranscription] = useState<string>('');
  const [transcriptionId, setTranscriptionId] = useState<string>('');

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (isValidFileType(droppedFile)) {
      setFile(droppedFile);
      setError('');
    } else {
      setError('Invalid file type. Please upload an MP3, MP4, or text file.');
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isValidFileType(selectedFile)) {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Invalid file type. Please upload an MP3, MP4, or text file.');
    }
  }, []);

  const isValidFileType = (file: File) => {
    const validTypes = ['audio/mp3', 'audio/mpeg', 'video/mp4', 'text/plain'];
    return validTypes.includes(file.type);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      setStatus('uploading');
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload file
      const uploadResponse = await fetch('/api/transcriptions/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) throw new Error('Upload failed');
      const { id } = await uploadResponse.json();
      setTranscriptionId(id);

      // If it's an audio/video file, transcribe it
      if (file.type === 'audio/mp3' || file.type === 'audio/mpeg' || file.type === 'video/mp4') {
        setStatus('transcribing');
        const transcribeResponse = await fetch(`/api/transcriptions/${id}/transcribe`, {
          method: 'POST',
        });
        
        if (!transcribeResponse.ok) throw new Error('Transcription failed');
        const { transcription } = await transcribeResponse.json();
        setTranscription(transcription);
        setStatus('editing');
      } else if (file.type === 'text/plain') {
        // For text files, read content directly
        const text = await file.text();
        setTranscription(text);
        
        // Save the text content directly
        const saveResponse = await fetch('/api/transcriptions/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            transcription: text,
            id: id,
          }),
        });
        
        if (!saveResponse.ok) throw new Error('Failed to save text content');
        setStatus('editing');
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred');
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
      router.push('/transcriptions'); // Redirect to transcriptions list
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save transcription');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card className="p-6">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed rounded-lg p-10 text-center hover:border-primary cursor-pointer"
        >
          <input
            type="file"
            onChange={handleFileChange}
            accept=".mp3,.mp4,.txt"
            className="hidden"
            id="file-upload"
          />
          <Label htmlFor="file-upload" className="cursor-pointer">
            {file ? (
              <p className="text-sm">Selected file: {file.name}</p>
            ) : (
              <div>
                <p className="text-lg font-medium">Drag and drop your file here</p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to select a file (MP3, MP4, or text)
                </p>
              </div>
            )}
          </Label>
        </div>

        {error && (
          <p className="text-sm text-destructive mt-2">{error}</p>
        )}

        {status === 'editing' && (
          <div className="mt-6">
            <Label htmlFor="transcription">Edit Transcription</Label>
            <textarea
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
              {status === 'uploading' ? 'Uploading...' : 'Transcribing with Whisper...'}
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
            Transcription saved successfully!
          </p>
        )}
      </Card>
    </form>
  );
} 