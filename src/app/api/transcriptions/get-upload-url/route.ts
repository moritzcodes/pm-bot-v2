import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';

export async function POST(request: Request) {
  try {
    const { filename, fileType, fileSize } = await request.json();
    
    if (!filename || !fileType) {
      return NextResponse.json(
        { error: 'Filename and file type are required' },
        { status: 400 }
      );
    }

    // Check file size
    if (fileSize > 100 * 1024 * 1024) { // 100MB limit
      return NextResponse.json(
        { error: 'File size exceeds 100MB limit' },
        { status: 400 }
      );
    }

    // Create a placeholder record in the database
    const transcription = await prisma.transcription.create({
      data: {
        filename: filename,
        content: '', // Will be updated after upload
        fileSize: fileSize,
        mimeType: fileType,
        status: 'pending',
      },
    });

    // Generate a unique filename to avoid collisions
    const uniqueFilename = `${Date.now()}-${filename}`;
    
    // Get a URL for client-side upload using an empty buffer instead of Blob
    const { url } = await put(uniqueFilename, Buffer.from([]), {
      access: 'public',
      contentType: fileType,
      multipart: true,
    });

    return NextResponse.json({
      id: transcription.id,
      uploadUrl: url,
      blobUrl: url.split('?')[0], // Remove query parameters for the final URL
      filename: uniqueFilename
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
} 