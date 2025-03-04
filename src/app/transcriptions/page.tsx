import { PrismaClient } from '@prisma/client';
import Link from 'next/link';

const prisma = new PrismaClient();

export default async function TranscriptionsPage() {
  const transcriptions = await prisma.transcription.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      summaries: true,
    },
  });

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-8">Transcriptions</h1>
      
      {transcriptions.length === 0 ? (
        <div className="text-center py-12 border rounded-md">
          <p className="text-muted-foreground">No transcriptions yet</p>
          <Link 
            href="/upload" 
            className="mt-4 inline-block text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Upload Your First Transcription
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {transcriptions.map((transcription) => (
            <Link 
              key={transcription.id} 
              href={`/transcriptions/${transcription.id}`}
              className="block p-4 rounded-lg border bg-card hover:border-primary transition-colors"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{transcription.filename}</h2>
                <span className={`text-sm px-2 py-1 rounded-full ${
                  transcription.status === 'processed'
                    ? 'bg-green-100 text-green-800'
                    : transcription.status === 'failed'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {transcription.status}
                </span>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Uploaded {new Date(transcription.uploadedAt).toLocaleDateString()}
              </div>
              
              {transcription.summaries.length > 0 && (
                <div className="mt-4 flex items-center">
                  <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {transcription.summaries.length} {transcription.summaries.length === 1 ? 'Summary' : 'Summaries'}
                  </span>
                  
                  <span className="ml-4 text-xs text-muted-foreground">
                    {transcription.summaries[0].content.substring(0, 100)}...
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
} 