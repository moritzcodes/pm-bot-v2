import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: Request) {
  try {
    const { filename, fileType } = await request.json();
    
    if (!filename || !fileType) {
      return NextResponse.json(
        { error: 'Filename and file type are required' },
        { status: 400 }
      );
    }

    // Verify that the BLOB_READ_WRITE_TOKEN is available
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN is not defined');
      return NextResponse.json(
        { error: 'Storage configuration error' },
        { status: 500 }
      );
    }
    
    // Generate a unique filename to avoid collisions
    const uniqueFilename = `${Date.now()}-${filename}`;
    
    try {
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
    } catch (blobError: any) {
      console.error('Blob error:', blobError);
      return NextResponse.json(
        { error: 'Failed to generate upload URL: ' + (blobError.message || 'Unknown error') },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error getting upload URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
} 