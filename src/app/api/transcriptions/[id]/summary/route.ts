import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStreamableResponse } from '@/lib/streamable-response';
import { generateSummary } from '@/lib/ai/generate-summary';
import { revalidatePath } from 'next/cache';

// Helper function to parse arrays from various formats
function parseArrayData(data: string | string[]): string[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [data];
    } catch (e) {
      // If not JSON, split by commas and trim
      return data.split(',').map(item => item.trim()).filter(Boolean);
    }
  }
  return [];
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transcriptionId = params.id;
    console.log('Processing summary request for:', transcriptionId);
    
    const transcription = await prisma.transcription.findUnique({
      where: { id: transcriptionId },
    });
    
    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    if (body.summaryData) {
      const { summaryData } = body;
      
      console.log('Saving summary data:', JSON.stringify(summaryData, null, 2));
      
      // Parse arrays from the input data
      const productMentions = parseArrayData(summaryData.productMentions || []);
      const marketTrends = parseArrayData(summaryData.marketTrends || []);
      
      try {
        // Create a new summary
        const summary = await prisma.summary.create({
          data: {
            transcriptionId,
            content: summaryData.editedContent || '',
            productMentions,
            isCasual: summaryData.isCasual || false,
            verificationStatus: 'HUMAN_VERIFIED',
            enrichedData: {
              marketTrends,
              customerInsights: [],
              meetingReferences: [],
            },
          },
        });
        
        console.log('Created summary:', summary.id);
        
        // Update the cache for UI refresh
        revalidatePath(`/transcriptions/${transcriptionId}`);
        
        return NextResponse.json({ success: true, summary });
      } catch (error) {
        console.error('Error saving summary:', error);
        return NextResponse.json(
          { error: 'Failed to save summary', details: String(error) },
          { status: 500 }
        );
      }
    }
    
    // Generate new summary
    const { format } = body;
    
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start the summary generation in the background
    generateSummary(transcription.content, {
      format,
      onToken: async (token) => {
        await writer.write(encoder.encode(token));
      },
    }).catch(async (error) => {
      console.error('Summary generation error:', error);
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`)
      );
    }).finally(async () => {
      await writer.close();
    });

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in summary route:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: String(error) },
      { status: 500 }
    );
  }
} 
