import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { BUCKET_NAME, s3Client } from "./s3";

// Function to get file content from S3
export async function getFileFromS3(fileKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });

  try {
    const response = await s3Client.send(command);
    const stream = response.Body;
    
    if (!stream) {
      throw new Error("No file body returned from S3");
    }
    
    // Convert stream to string
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as any) {
      chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);
    return buffer.toString('utf-8');
  } catch (error) {
    console.error("Error retrieving file from S3:", error);
    throw error;
  }
}

// Function to process the uploaded file
export async function processUploadedFile(fileKey: string) {
  try {
    const fileContent = await getFileFromS3(fileKey);
    
    // Process the file content as needed
    // This will depend on what you want to do with the uploaded files
    
    return { success: true, fileContent };
  } catch (error) {
    console.error("Error processing uploaded file:", error);
    return { success: false, error: "Failed to process file" };
  }
}