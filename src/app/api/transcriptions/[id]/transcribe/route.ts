import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI();

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get transcription from database
    const transcription = await prisma.transcription.findUnique({
      where: { id: params.id },
    });

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    // Get the file from Vercel Blob
    const response = await fetch(transcription.content);
    const audioBlob = await response.blob();
    
    // Convert Blob to File
    const audioFile = new File([audioBlob], transcription.filename, {
      type: transcription.mimeType,
    });

    // Create a FormData instance
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');

    // Transcribe using OpenAI's Whisper
    const result = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    });

    // Update transcription in database
    const updatedTranscription = await prisma.transcription.update({
      where: { id: params.id },
      data: {
        content: result.text,
        status: 'processed',
      },
    });

    return NextResponse.json({
      transcription: result.text,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe file' },
      { status: 500 }
    );
  }
} 