import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { filename, url, fileSize, mimeType } = await request.json();
    
    if (!filename || !url) {
      return NextResponse.json(
        { error: 'Filename and URL are required' },
        { status: 400 }
      );
    }

    // Create transcription record in database
    const transcription = await prisma.transcription.create({
      data: {
        filename,
        content: url,
        fileSize: fileSize || 0,
        mimeType: mimeType || 'application/octet-stream',
        status: 'pending',
      },
    });

    return NextResponse.json({
      id: transcription.id,
      url,
    });
  } catch (error: any) {
    console.error('Error creating transcription record:', error);
    return NextResponse.json(
      { error: `Failed to create transcription record: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
} 