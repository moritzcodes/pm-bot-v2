import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { generatePresignedUrl, getS3Url } from '@/lib/s3';
import { db } from '@/lib/db';
import { pdfs } from '@/db/schema';

// New way to configure API routes in Next.js App Router
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes
// This is important for Vercel - sets the maximum payload size
export const runtime = 'nodejs';

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
      const [newPdf] = await db.insert(pdfs).values({
        id: fileId,
        filename: file.name,
        url: s3Url,
        fileSize: file.size,
        mimeType: file.type,
        notes,
        status: 'pending',
      }).returning();

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
      const [newPdf] = await db.insert(pdfs).values({
        id: fileId,
        filename: file.name,
        url: s3Url,
        fileSize: file.size,
        mimeType: file.type,
        notes,
        status: 'pending',
      }).returning();
      
      try {
        // Upload to S3 using the S3 upload API
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
        if (!baseUrl) {
          throw new Error('Unable to determine API URL. Check NEXT_PUBLIC_API_URL or VERCEL_URL environment variables.');
        }
        
        const uploadEndpoint = process.env.S3_UPLOAD_API || `${baseUrl}/api/upload-s3`;
        
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
          await db.delete(pdfs).where({ id: fileId });
          const errorData = await uploadResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to upload to S3: ${uploadResponse.status}`);
        }
      } catch (error: any) {
        // If upload fails, delete the PDF record
        await db.delete(pdfs).where({ id: fileId });
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