import { NextRequest, NextResponse } from "next/server";
import { generatePresignedUrl, getS3Url } from "@/lib/s3";
import { nanoid } from "nanoid";

// Configure API route settings
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Increase timeout to 60 seconds
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { filename, contentType } = await req.json();
    
    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "Filename and content type are required" },
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

    // Generate a unique file key
    const fileKey = `uploads/${nanoid()}-${filename}`;
    
    try {
      // Generate presigned URL for direct upload to S3 with timeout handling
      const presignedUrl = await generatePresignedUrl(fileKey, contentType);
      
      // Get the S3 URL for the uploaded file
      const fileUrl = getS3Url(fileKey);
      
      return NextResponse.json({ 
        uploadUrl: presignedUrl.url,
        fields: presignedUrl.fields,
        blobUrl: fileUrl,
        fileKey,
        filename: filename
      });
    } catch (s3Error: any) {
      console.error("S3 presigned URL generation error:", s3Error);
      return NextResponse.json(
        { error: `Failed to generate S3 upload URL: ${s3Error.message || 'Unknown S3 error'}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error processing upload request:", error);
    return NextResponse.json(
      { error: `Failed to generate upload URL: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}