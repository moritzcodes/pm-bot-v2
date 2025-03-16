import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { filename, url, fileSize, mimeType, notes } = await request.json();
    
    if (!filename || !url) {
      return NextResponse.json(
        { error: 'Filename and URL are required' },
        { status: 400 }
      );
    }

    // Create PDF record in database
    const pdf = await db.pdf.create({
      data: {
        filename,
        url,
        fileSize: fileSize || 0,
        mimeType: mimeType || 'application/pdf',
        notes: notes || '',
        status: 'pending',
      },
    });

    return NextResponse.json({
      id: pdf.id,
      url,
    });
  } catch (error: any) {
    console.error('Error creating PDF record:', error);
    return NextResponse.json(
      { error: `Failed to create PDF record: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
} 