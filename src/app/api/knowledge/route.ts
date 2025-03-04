import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addTranscriptionToAssistant, addSummaryToAssistant } from '@/lib/assistant';

type AssistantResult = {
  success: boolean;
  fileId?: string;
  error?: unknown;
} | null;

interface KnowledgeResults {
  transcription: AssistantResult;
  summary: AssistantResult;
}

/**
 * Add transcriptions and summaries to the OpenAI Assistant knowledge base
 */
export async function POST(request: Request) {
  try {
    const { transcriptionId, summaryId } = await request.json();
    
    if (!transcriptionId && !summaryId) {
      return NextResponse.json(
        { error: 'At least one ID (transcriptionId or summaryId) is required' },
        { status: 400 }
      );
    }
    
    const results: KnowledgeResults = {
      transcription: null,
      summary: null
    };
    
    // Add transcription to assistant if ID provided
    if (transcriptionId) {
      results.transcription = await addTranscriptionToAssistant(transcriptionId);
    }
    
    // Add summary to assistant if ID provided
    if (summaryId) {
      results.summary = await addSummaryToAssistant(summaryId);
    }
    
    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error adding to assistant knowledge:', error);
    return NextResponse.json(
      { error: 'Failed to add to assistant knowledge', details: error },
      { status: 500 }
    );
  }
}

interface TranscriptionWithEnrichedData {
  id: string;
  filename: string;
  status: string;
  uploadedAt: Date;
  enrichedData: any;
}

interface SummaryWithEnrichedData {
  id: string;
  content: string;
  productMentions: string[];
  createdAt: Date;
  enrichedData: any;
  transcription: {
    id: string;
    filename: string;
  };
}

/**
 * Get all transcriptions and summaries that have been added to the assistant
 */
export async function GET() {
  try {
    // Find all transcriptions with assistantFileId in enrichedData
    const transcriptions = await prisma.transcription.findMany({
      where: {
        NOT: {
          enrichedData: null
        }
      },
      select: {
        id: true,
        filename: true,
        status: true,
        uploadedAt: true,
        enrichedData: true
      }
    });
    
    // Find all summaries with assistantFileId in enrichedData
    const summaries = await prisma.summary.findMany({
      where: {
        NOT: {
          enrichedData: null
        }
      },
      select: {
        id: true,
        content: true,
        productMentions: true,
        createdAt: true,
        enrichedData: true,
        transcription: {
          select: {
            id: true,
            filename: true
          }
        }
      }
    });
    
    // Filter to only include items with assistantFileId
    const filteredTranscriptions = transcriptions.filter((t: TranscriptionWithEnrichedData) => {
      try {
        const data = typeof t.enrichedData === 'string' ? JSON.parse(t.enrichedData) : t.enrichedData;
        return data && data.assistantFileId;
      } catch {
        return false;
      }
    });
    
    const filteredSummaries = summaries.filter((s: SummaryWithEnrichedData) => {
      try {
        const data = typeof s.enrichedData === 'string' ? JSON.parse(s.enrichedData) : s.enrichedData;
        return data && data.assistantFileId;
      } catch {
        return false;
      }
    });
    
    return NextResponse.json({
      transcriptions: filteredTranscriptions,
      summaries: filteredSummaries
    });
  } catch (error) {
    console.error('Error fetching assistant knowledge:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assistant knowledge', details: error },
      { status: 500 }
    );
  }
} 