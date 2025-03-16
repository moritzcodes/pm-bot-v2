import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

// Initialize S3 client
export const s3Client = new S3Client({
  region: (process.env.AWS_REGION || "us-east-1").replace(/"/g, ""), // Remove any quotes from region
  credentials: {
    accessKeyId: (process.env.AWS_ACCESS_KEY_ID || "").replace(/"/g, ""), // Remove any quotes
    secretAccessKey: (process.env.AWS_SECRET_ACCESS_KEY || "").replace(/"/g, ""), // Remove any quotes
  },
  // Set a reasonable timeout to prevent hanging
  requestHandler: {
    timeout: 10000 // 10 seconds timeout for AWS SDK requests
  }
});

export const BUCKET_NAME = (process.env.AWS_S3_BUCKET_NAME || "").replace(/"/g, ""); // Remove any quotes

// Generate a presigned URL for uploading
export async function generatePresignedUrl(key: string, contentType: string) {
  try {
    // Create a presigned POST for browser-based uploads
    const signedUrl = await createPresignedPost(s3Client, {
      Bucket: BUCKET_NAME,
      Key: key,
      Conditions: [
        ["content-length-range", 0, 100 * 1024 * 1024], // Limit file size to 100MB
        ["eq", "$Content-Type", contentType],
      ],
      Fields: {
        "Content-Type": contentType,
      },
      Expires: 3600, // URL expires in 1 hour
    });
    
    return signedUrl;
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw error;
  }
}

// Get a file URL from S3
export function getS3Url(key: string) {
  return `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
}