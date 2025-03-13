import { NextResponse } from 'next/server';

// New way to configure API routes in Next.js App Router
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check if the BLOB_READ_WRITE_TOKEN is defined
    const tokenExists = !!process.env.BLOB_READ_WRITE_TOKEN;
    
    // Don't expose the actual token, just whether it exists
    return NextResponse.json({
      tokenExists,
      tokenLength: tokenExists ? process.env.BLOB_READ_WRITE_TOKEN!.length : 0,
      env: process.env.NODE_ENV
    });
  } catch (error) {
    console.error('Error checking blob token:', error);
    return NextResponse.json(
      { error: 'Failed to check blob token' },
      { status: 500 }
    );
  }
} 