 'use client';

import { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";

interface Transcription {
  id: string;
  filename: string;
  content: string;
  status: string;
  uploadedAt: string;
}

export function TranscriptionList() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);

  const fetchTranscriptions = async () => {
    const response = await fetch('/api/transcriptions');
    if (response.ok) {
      const data = await response.json();
      setTranscriptions(data);
    }
  };

  useEffect(() => {
    fetchTranscriptions();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Transcriptions</h2>
      {transcriptions.map((transcription) => (
        <Card key={transcription.id} className="p-4">
          <h3 className="font-medium">{transcription.filename}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Status: {transcription.status}
          </p>
          <p className="text-sm mt-2">{transcription.content}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Uploaded: {new Date(transcription.uploadedAt).toLocaleString()}
          </p>
        </Card>
      ))}
    </div>
  );
}