import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Update the transcription record with the URL
    const transcription = await prisma.transcription.update({
      where: { id },
      data: {
        content: url,
      },
    });

    return NextResponse.json({
      success: true,
      id: transcription.id,
    });
  } catch (error) {
    console.error('Error updating transcription URL:', error);
    return NextResponse.json(
      { error: 'Failed to update transcription URL' },
      { status: 500 }
    );
  }
} 