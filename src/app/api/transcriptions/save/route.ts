import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { transcription, id } = await request.json();

    if (!transcription || !id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update transcription in database
    const updatedTranscription = await prisma.transcription.update({
      where: { id },
      data: {
        content: transcription,
        status: 'processed',
      },
    });

    return NextResponse.json({
      id: updatedTranscription.id,
      status: updatedTranscription.status,
    });
  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json(
      { error: 'Failed to save transcription' },
      { status: 500 }
    );
  }
} 