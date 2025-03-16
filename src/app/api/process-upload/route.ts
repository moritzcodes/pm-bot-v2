import { NextRequest, NextResponse } from "next/server";
import { processUploadedFile } from "@/lib/uploadUtils";

export async function POST(req: NextRequest) {
  try {
    const { fileKey } = await req.json();
    
    if (!fileKey) {
      return NextResponse.json(
        { error: "File key is required" },
        { status: 400 }
      );
    }
    
    const result = await processUploadedFile(fileKey);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: "File processed successfully",
      // You can include additional data here as needed
    });
  } catch (error) {
    console.error("Error processing file:", error);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 }
    );
  }
}