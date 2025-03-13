import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { db } from '@/lib/db';

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
    const notes = formData.get('notes') as string || '';
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check if it's a PDF
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > 100 * 1024 * 1024) { // 100MB limit (increased from 50MB)
      return NextResponse.json(
        { error: 'File size exceeds 100MB limit' },
        { status: 400 }
      );
    }

    // Generate a unique filename to avoid collisions
    const uniqueFilename = `${Date.now()}-${file.name}`;

    try {
      // Upload to blob storage
      const { url } = await put(uniqueFilename, file, {
        access: 'public',
      });

      // Create PDF record in database
      const pdf = await db.pdf.create({
        data: {
          filename: file.name,
          url: url,
          fileSize: file.size,
          mimeType: file.type,
          notes: notes,
          status: 'pending',
        },
      });

      return NextResponse.json({
        id: pdf.id,
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
    console.error('Error in PDF upload:', error);
    return NextResponse.json(
      { error: `Failed to process upload: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
} 