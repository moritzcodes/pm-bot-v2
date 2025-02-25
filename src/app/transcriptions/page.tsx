import { PrismaClient } from '@prisma/client';

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
      <div className="grid gap-4">
        {transcriptions.map((transcription) => (
          <div
            key={transcription.id}
            className="p-4 rounded-lg border bg-card"
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
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Summaries</h3>
                <ul className="space-y-2">
                  {transcription.summaries.map((summary) => (
                    <li key={summary.id} className="text-sm">
                      {summary.content.slice(0, 100)}...
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 