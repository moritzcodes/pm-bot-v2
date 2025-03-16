import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { nanoid } from 'nanoid';
import { getS3Url, generatePresignedUrl } from '@/lib/s3';

// Configure runtime for longer file processing
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const notes = formData.get('notes') as string || '';

    if (!file) {
      return NextResponse.json(
        { error: 'No file received' },
        { status: 400 }
      );
    }

    // Make sure file is a PDF
    if (!file.type || !file.type.includes('pdf')) {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    // Limit file size to 950MB to avoid memory issues
    if (file.size > 950 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum file size is 950MB' },
        { status: 400 }
      );
    }

    // Generate a unique filename using nanoid
    const fileId = nanoid();
    const fileExtension = file.name.split('.').pop();
    const uniqueFilename = `${fileId}.${fileExtension}`;
    
    // Handle uploads differently based on file size
    // For files under 4MB, just upload directly through the API
    // For larger files, generate a presigned URL for client-side upload
    if (file.size > 4 * 1024 * 1024) {
      // For large files, generate a presigned URL for client-side upload
      const s3Key = `pdfs/${uniqueFilename}`;
      const s3Url = getS3Url(s3Key);
      
      // Generate a presigned post for direct uploads to S3
      const { url, fields } = await generatePresignedUrl(s3Key, file.type);
      
      // Create the PDF record before the upload
      const newPdf = await db.pdf.create({
        data: {
          id: fileId,
          filename: file.name,
          url: s3Url,
          fileSize: file.size,
          mimeType: file.type,
          notes,
          status: 'pending',
        },
      });

      // Return the presigned URL to the client for direct upload
      return NextResponse.json({
        id: newPdf.id,
        blobUrl: s3Url,
        uploadUrl: url,
        fields,
        key: s3Key,
      });
    } else {
      // For small files, handle the upload directly in the API route
      const s3Key = `pdfs/${uniqueFilename}`;
      const s3Url = getS3Url(s3Key);
      
      // Convert the file to an ArrayBuffer to prepare for upload
      const fileArrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(fileArrayBuffer);
      
      // Create the PDF record
      const newPdf = await db.pdf.create({
        data: {
          id: fileId,
          filename: file.name,
          url: s3Url,
          fileSize: file.size,
          mimeType: file.type,
          notes,
          status: 'pending',
        },
      });
      
      try {
        // Upload to S3 using the S3 upload API
        // Determine API URL with better fallbacks
        let baseUrl = process.env.NEXT_PUBLIC_API_URL;
        
        // If NEXT_PUBLIC_API_URL is not set, try to use VERCEL_URL
        if (!baseUrl && process.env.VERCEL_URL) {
          baseUrl = `https://${process.env.VERCEL_URL}`;
        }
        
        // If we're in development (and not in Vercel), use localhost
        if (!baseUrl && process.env.NODE_ENV === 'development') {
          baseUrl = 'http://localhost:3000';
        }
        
        // If we still don't have a baseUrl, use a relative URL which will work if
        // the API endpoint is on the same server
        const uploadEndpoint = process.env.S3_UPLOAD_API || 
                            (baseUrl ? `${baseUrl}/api/upload-s3` : '/api/upload-s3');
        
        const uploadResponse = await fetch(uploadEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: s3Key,
            contentType: file.type,
            file: fileBuffer.toString('base64'),
          }),
        });

        if (!uploadResponse.ok) {
          // If upload fails, delete the PDF record
          await db.pdf.delete({
            where: { id: fileId }
          });
          const errorData = await uploadResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to upload to S3: ${uploadResponse.status}`);
        }
      } catch (error: any) {
        // If upload fails, delete the PDF record
        await db.pdf.delete({
          where: { id: fileId }
        });
        return NextResponse.json(
          { error: `Failed to upload to S3: ${error.message}` },
          { status: 500 }
        );
      }
      
      // Return the PDF record info
      return NextResponse.json({
        id: newPdf.id,
        url: s3Url,
      });
    }
  } catch (error: any) {
    console.error('PDF upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload PDF' },
      { status: 500 }
    );
  }
}