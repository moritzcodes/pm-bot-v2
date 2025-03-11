import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ElevenLabsClient } from 'elevenlabs';

// Initialize Eleven Labs client
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const transcription = await prisma.transcription.findUnique({
      where: { id: params.id },
      include: { productTerms: true },
    });

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    // Only transcribe if content is a URL (audio/video files)
    if (!transcription.content.startsWith('http')) {
      return NextResponse.json(
        { error: 'Transcription already processed' },
        { status: 400 }
      );
    }

    // Get ALL product terms to improve transcription accuracy
    const productTerms = await prisma.productTerm.findMany();
    const productTermsList = productTerms.map((term: { term: string }) => term.term);

    // Get the file from Vercel Blob
    const response = await fetch(transcription.content);
    const audioBlob = await response.blob();
    
    // Convert Blob to a File object which is supported by the elevenlabs API
    const audioFile = new File([audioBlob], transcription.filename, {
      type: audioBlob.type,
    });

    // Use Eleven Labs Speech to Text API for transcription
    const transcriptionResponse = await elevenlabs.speechToText.convert({
      file: audioFile,
      model_id: 'scribe_v1',
      // Use product terms as biased keywords to improve accuracy
      biased_keywords: productTermsList.length > 0 
        ? productTermsList.map(term => `${term}:1.0`) 
        : undefined,
      diarize: true, // Enable speaker detection for meetings
      tag_audio_events: true, // Include audio events like (laughter), etc.
    });

    // Update transcription in database with actual text content
    const updatedTranscription = await prisma.transcription.update({
      where: { id: params.id },
      data: {
        content: transcriptionResponse.text,
        status: 'processed',
      },
    });

    // Return the transcription data
    return NextResponse.json({
      id: updatedTranscription.id,
      content: transcriptionResponse.text, 
      transcription: transcriptionResponse.text,
      status: 'processed',
      language_code: transcriptionResponse.language_code,
      language_probability: transcriptionResponse.language_probability,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    
    // Update transcription status to failed if there's an error
    if (params.id) {
      await prisma.transcription.update({
        where: { id: params.id },
        data: {
          status: 'failed',
        },
      }).catch((err: Error) => console.error('Failed to update transcription status:', err));
    }
    
    return NextResponse.json(
      { error: 'Failed to transcribe file' },
      { status: 500 }
    );
  }
} 