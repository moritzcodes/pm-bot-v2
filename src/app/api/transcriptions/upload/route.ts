import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      return NextResponse.json(
        { error: 'File size exceeds 100MB limit' },
        { status: 400 }
      );
    }

    // Upload to blob storage
    const { url } = await put(file.name, file, {
      access: 'public',
    });

    // Create transcription record in database
    const transcription = await prisma.transcription.create({
      data: {
        filename: file.name,
        content: url,
        fileSize: file.size,
        mimeType: file.type,
        status: 'pending',
      },
    });

    return NextResponse.json({
      id: transcription.id,
      url: url,
    });
  } catch (error) {
    console.error('Error in transcription upload:', error);
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
} 