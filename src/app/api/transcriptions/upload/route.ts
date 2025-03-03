import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // Upload file to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
    });

    // Create transcription record in database
    const transcription = await prisma.transcription.create({
      data: {
        filename: file.name,
        content: blob.url, // Store the URL to the file
        fileSize: file.size,
        mimeType: file.type,
        status: 'pending',
      },
    });

    return NextResponse.json({
      id: transcription.id,
      url: blob.url,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 