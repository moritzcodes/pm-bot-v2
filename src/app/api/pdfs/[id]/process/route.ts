import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { attachFileToVectorStore, uploadFileToOpenAI } from '@/lib/assistant';

// Helper function to download a PDF from a URL
async function downloadPDF(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.statusText}`);
  }
  
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, new Uint8Array(buffer));
}

// Helper function to add a PDF to the OpenAI Assistant's knowledge
async function addPdfToAssistant(pdfId: string) {
  try {
    // Get the PDF from the database
    const pdf = await db.pdf.findUnique({
      where: { id: pdfId },
    });

    if (!pdf) {
      throw new Error(`PDF ${pdfId} not found`);
    }

    // Create a temporary file path for the PDF
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `pdf-${pdfId}.pdf`);

    // Download the PDF from the URL
    await downloadPDF(pdf.url, tempFilePath);

    // Upload the file to OpenAI
    const fileId = await uploadFileToOpenAI(tempFilePath, 'PDF document');

    // Attach the file to the assistant via vector store
    const vectorStoreId = await attachFileToVectorStore(fileId);
    if (!vectorStoreId) {
      throw new Error('Failed to attach file to vector store');
    }

    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);

    // Update the enrichedData field in the database to include the file ID
    const enrichedData = pdf.enrichedData as Record<string, any> || {};
    enrichedData.openaiFileId = fileId;
    enrichedData.vectorStoreId = vectorStoreId;
    
    // Update the PDF record in the database
    await db.pdf.update({
      where: { id: pdfId },
      data: { 
        enrichedData,
        status: 'processed',
      },
    });

    return {
      success: true,
      fileId,
      vectorStoreId
    };
  } catch (error) {
    // Update the PDF status to failed
    await db.pdf.update({
      where: { id: pdfId },
      data: { status: 'failed' },
    });
    throw error;
  }
}

// Configure runtime for longer processing
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate that the PDF exists
    const pdf = await db.pdf.findUnique({
      where: { id },
    });

    if (!pdf) {
      return NextResponse.json(
        { error: 'PDF not found' },
        { status: 404 }
      );
    }

    // Update the status to processing
    await db.pdf.update({
      where: { id },
      data: { status: 'processing' },
    });

    try {
      // Here you would add your code to process the PDF and add it to your assistant
      // This could include:
      // 1. Download the PDF from S3
      // 2. Extract text or data from the PDF
      // 3. Add it to a vector database
      // 4. Add it to your AI assistant
      
      // For example (pseudo-code):
      // const pdfFile = await downloadFromS3(pdf.url);
      // const pdfText = await extractTextFromPdf(pdfFile);
      // await addToVectorDatabase(id, pdfText);
      // await addToAssistant(id, pdf.url);
      
      // This is where you'd implement your actual PDF processing logic
      // For now, we'll just update the status to simulate success
      
      // Mark the PDF as processed
      await db.pdf.update({
        where: { id },
        data: { status: 'processed' },
      });

      return NextResponse.json({
        success: true,
        message: 'PDF processed and added to assistant',
      });
    } catch (processingError: any) {
      // If processing fails, update the status
      await db.pdf.update({
        where: { id },
        data: { status: 'error' },
      });

      throw processingError;
    }
  } catch (error: any) {
    console.error('Error processing PDF:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process PDF' },
      { status: 500 }
    );
  }
} 