import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

    // Get ALL product terms to improve Whisper accuracy - simplified approach
    const productTerms = await prisma.productTerm.findMany();
    const productTermsList = productTerms.map((term: { term: string }) => term.term);

    // Get the file from Vercel Blob
    const response = await fetch(transcription.content);
    const audioBlob = await response.blob();

    // Convert blob to file
    const audioFile = new File([audioBlob], transcription.filename, {
      type: audioBlob.type,
    });

    // Use OpenAI Whisper model for transcription
    const transcriptionResponse = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      // Always include product terms in prompt if available
      prompt: productTermsList.length > 0 
        ? `This is a business meeting that may mention the following terms: ${productTermsList.join(', ')}.` 
        : undefined,
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
      status: 'processed'
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