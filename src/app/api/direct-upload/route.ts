import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { filename, fileType, fileSize } = await request.json();
    
    if (!filename || !fileType) {
      return NextResponse.json(
        { error: 'Filename and file type are required' },
        { status: 400 }
      );
    }

    // Generate a unique filename to avoid collisions
    const uniqueFilename = `${Date.now()}-${filename}`;
    
    try {
      // Get a URL for client-side upload
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
    } catch (error: any) {
      console.error('Error generating upload URL:', error);
      return NextResponse.json(
        { error: `Failed to generate upload URL: ${error.message || 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in direct upload request:', error);
    return NextResponse.json(
      { error: `Failed to process request: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
} 