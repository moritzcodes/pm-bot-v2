import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: Request) {
  try {
    const { filename, fileType } = await request.json();
    
    // Generate a unique filename to avoid collisions
    const uniqueFilename = `${Date.now()}-${filename}`;
    
    // Get a URL for client-side upload using an empty buffer instead of Blob
    const { url } = await put(uniqueFilename, Buffer.from([]), {
      access: 'public',
      contentType: fileType,
      multipart: true,
    });
    
    return NextResponse.json({
      uploadUrl: url,
      blobUrl: url.split('?')[0], // Remove query parameters for the final URL
      filename: uniqueFilename
    });
  } catch (error) {
    console.error('Error getting upload URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
} 