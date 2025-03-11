import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { db } from '@/lib/db';

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
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    // Upload to blob storage
    const { url } = await put(file.name, file, {
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
  } catch (error) {
    console.error('Error in PDF upload:', error);
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
} 