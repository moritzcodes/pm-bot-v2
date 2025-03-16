import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import { getS3Url, generatePresignedUrl } from '@/lib/s3';

export async function POST(req: Request) {
  try {
    // Parse form data
    const formData = await req.formData();
    const filename = formData.get('filename') as string;
    const contentType = formData.get('contentType') as string;
    const fileSize = parseInt(formData.get('fileSize') as string);
    const notes = formData.get('notes') as string || '';

    if (!filename || !contentType || isNaN(fileSize)) {
      return NextResponse.json(
        { error: 'Missing required information (filename, contentType, or fileSize)' },
        { status: 400 }
      );
    }

    // Check if it's a PDF
    if (!contentType.includes('pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Check file size (950MB limit)
    if (fileSize > 950 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 950MB limit' },
        { status: 400 }
      );
    }

    // Generate a unique ID for both the database and S3
    const fileId = nanoid();
    const fileExtension = filename.split('.').pop() || 'pdf';
    const s3Key = `pdfs/${fileId}.${fileExtension}`;
    
    // Get the final S3 URL that the file will have
    const s3Url = getS3Url(s3Key);
    
    // Generate presigned URL for the client to upload directly to S3
    const { url, fields } = await generatePresignedUrl(s3Key, contentType);
    
    // Create the PDF record in the database with pending status
    const newPdf = await db.pdf.create({
      data: {
        id: fileId,
        filename,
        url: s3Url,
        fileSize,
        mimeType: contentType,
        notes,
        status: 'pending',
      },
    });
    
    // Return everything the client needs for upload
    return NextResponse.json({
      id: newPdf.id,
      uploadUrl: url,
      fields,
      blobUrl: s3Url,
    });
  } catch (error: any) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
} 