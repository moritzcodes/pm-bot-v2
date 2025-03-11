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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Find the PDF in the database
    const pdf = await db.pdf.findUnique({
      where: { id },
    });

    if (!pdf) {
      return NextResponse.json(
        { error: 'PDF not found' },
        { status: 404 }
      );
    }

    // Check if the PDF is already processed or failed
    if (pdf.status === 'processed') {
      return NextResponse.json({
        success: true,
        message: 'PDF already processed',
        enrichedData: pdf.enrichedData,
      });
    }

    if (pdf.status === 'failed') {
      return NextResponse.json(
        { error: 'PDF processing previously failed' },
        { status: 400 }
      );
    }

    // Process the PDF and add to assistant
    const result = await addPdfToAssistant(id);

    return NextResponse.json({
      success: true,
      fileId: result.fileId,
      vectorStoreId: result.vectorStoreId,
    });
  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF', details: String(error) },
      { status: 500 }
    );
  }
} 