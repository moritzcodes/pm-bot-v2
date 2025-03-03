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

    // Get the file from Vercel Blob
    const response = await fetch(transcription.content);
    const audioBlob = await response.blob();
    
    // Convert Blob to File
    const audioFile = new File([audioBlob], transcription.filename, {
      type: transcription.mimeType,
    });

    // Transcribe using OpenAI's Whisper
    const result = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    });

    // Update transcription in database with actual text content
    const updatedTranscription = await prisma.transcription.update({
      where: { id: params.id },
      data: {
        content: result.text,
        status: 'processed',
      },
    });

    return NextResponse.json({
      id: updatedTranscription.id,
      transcription: result.text,
      status: 'processed'
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe file' },
      { status: 500 }
    );
  }
} 