import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { transcriptionId } = await request.json();

    if (!transcriptionId) {
      return NextResponse.json(
        { error: 'Missing transcription ID' },
        { status: 400 }
      );
    }

    // Get transcription from database
    const transcription = await prisma.transcription.findUnique({
      where: { id: transcriptionId },
    });

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    // Use OpenAI to generate a summary with market trend detection
    const prompt = `
      Analyze the following meeting transcription and:
      1. Create a concise summary of the key points (max 250 words)
      2. Identify 3-5 market trends mentioned
      3. Detect any product names mentioned
      4. Determine if this is a casual conversation or a formal meeting
      
      Format your response as JSON with the following structure:
      {
        "summary": "The concise summary...",
        "marketTrends": ["Trend 1", "Trend 2", ...],
        "productMentions": ["Product 1", "Product 2", ...],
        "isCasual": true/false
      }

      Here is the transcription:
      ${transcription.content}
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      response_format: { type: "json_object" },
      messages: [
        { 
          role: "system", 
          content: "You are an AI that analyzes meeting transcriptions to extract summaries and market trends. Respond only with valid JSON." 
        },
        { role: "user", content: prompt }
      ],
    });

    const responseText = completion.choices[0].message.content;
    
    if (!responseText) {
      throw new Error('Failed to generate summary');
    }

    const analysisResult = JSON.parse(responseText);

    // Create summary in database
    const summary = await prisma.summary.create({
      data: {
        transcriptionId,
        content: analysisResult.summary,
        productMentions: analysisResult.productMentions || [],
        isCasual: analysisResult.isCasual || false,
        verificationStatus: 'pending',
        enrichedData: {
          marketTrends: analysisResult.marketTrends || [],
          customerInsights: [], // To be filled later with RAG
          meetingReferences: [] // To be filled later with RAG
        }
      },
    });

    return NextResponse.json({
      id: summary.id,
      content: summary.content,
      productMentions: summary.productMentions,
      marketTrends: analysisResult.marketTrends,
      isCasual: summary.isCasual
    });
  } catch (error) {
    console.error('Summary generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
} 