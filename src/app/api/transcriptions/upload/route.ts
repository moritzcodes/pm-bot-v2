import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';

// New way to configure API routes in Next.js App Router
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
// This is important for Vercel - sets the maximum payload size
export const runtime = 'nodejs';

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

    // Check file size - Vercel has a 4.5MB limit for serverless functions
    if (file.size > 4.5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds Vercel\'s 4.5MB limit. Please use a smaller file or contact support for alternative upload methods.' },
        { status: 413 }
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