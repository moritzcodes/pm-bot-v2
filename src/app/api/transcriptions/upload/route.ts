import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { generatePresignedUrl, getS3Url } from '@/lib/s3';
import { prisma } from '@/lib/prisma';

// New way to configure API routes in Next.js App Router
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
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

    // Check file size
    if (file.size > 950 * 1024 * 1024) { // 950MB limit
      return NextResponse.json(
        { error: 'File size exceeds 950MB limit' },
        { status: 400 }
      );
    }

    // Validate AWS credentials are configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_S3_BUCKET_NAME) {
      console.error("Missing AWS credentials or bucket name");
      return NextResponse.json(
        { error: "Server configuration error: AWS credentials not properly configured" },
        { status: 500 }
      );
    }

    // Generate a unique file key for S3
    const fileKey = `uploads/${nanoid()}-${file.name}`;

    try {
      // Generate presigned URL for S3 upload
      const presignedUrl = await generatePresignedUrl(fileKey, file.type);
      
      // Convert file to ArrayBuffer for upload
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Create FormData for S3 upload
      const formDataForS3 = new FormData();
      Object.entries(presignedUrl.fields).forEach(([key, value]) => {
        formDataForS3.append(key, value as string);
      });
      formDataForS3.append('file', new Blob([buffer], { type: file.type }));
      
      // Upload to S3
      const uploadResponse = await fetch(presignedUrl.url, {
        method: 'POST',
        body: formDataForS3,
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload to S3: ${uploadResponse.status}`);
      }
      
      // Get the S3 URL for the uploaded file
      const fileUrl = getS3Url(fileKey);

      // Create transcription record in database
      const transcription = await prisma.transcription.create({
        data: {
          filename: file.name,
          content: fileUrl,
          fileSize: file.size,
          mimeType: file.type,
          status: 'pending',
        },
      });

      return NextResponse.json({
        id: transcription.id,
        url: fileUrl,
      });
    } catch (s3Error: any) {
      console.error('S3 upload error:', s3Error);
      return NextResponse.json(
        { error: `Failed to upload to S3: ${s3Error.message || 'Unknown error'}` },
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