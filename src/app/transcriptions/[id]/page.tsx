import { PrismaClient } from '@prisma/client';
import { TranscriptionDetails } from '@/components/transcriptions/TranscriptionDetails';
import { notFound } from 'next/navigation';

const prisma = new PrismaClient();

export default async function TranscriptionPage({ params }: { params: { id: string } }) {
  try {
    const transcription = await prisma.transcription.findUnique({
      where: { id: params.id },
      include: {
        summaries: true,
      },
    });

    if (!transcription) {
      notFound();
    }

    return (
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">Transcription Details</h1>
        <TranscriptionDetails transcription={transcription} />
      </div>
    );
  } catch (error) {
    console.error("Error fetching transcription:", error);
    return <div>Error loading transcription</div>;
  }
} 