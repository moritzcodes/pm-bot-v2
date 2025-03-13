import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';

// Set the maximum file size to 100MB
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

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

    // Generate a unique filename to avoid collisions
    const uniqueFilename = `${Date.now()}-${file.name}`;

    // Upload to blob storage
    try {
      const { url } = await put(uniqueFilename, file, {
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
    } catch (blobError: any) {
      console.error('Blob storage error:', blobError);
      return NextResponse.json(
        { error: `Failed to upload to storage: ${blobError.message || 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in transcription upload:', error);
    return NextResponse.json(
      { error: `Failed to process upload: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
} 