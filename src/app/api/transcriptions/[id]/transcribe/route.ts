import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ElevenLabsClient } from 'elevenlabs';

// Initialize Eleven Labs client
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`[Transcribe] Starting transcription for ID: ${params.id}`);
    
    const transcription = await prisma.transcription.findUnique({
      where: { id: params.id },
      include: { productTerms: true },
    });

    if (!transcription) {
      console.log(`[Transcribe] Transcription not found for ID: ${params.id}`);
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    console.log(`[Transcribe] Found transcription: ${transcription.id}, filename: ${transcription.filename}`);

    // Only transcribe if content is a URL (audio/video files)
    if (!transcription.content.startsWith('http')) {
      console.log(`[Transcribe] Content is not a URL: ${transcription.content.substring(0, 30)}...`);
      return NextResponse.json(
        { error: 'Transcription already processed' },
        { status: 400 }
      );
    }

    // Get ALL product terms to improve transcription accuracy
    const productTerms = await prisma.productTerm.findMany();
    const productTermsList = productTerms.map((term: { term: string }) => term.term);
    
    console.log(`[Transcribe] Retrieved ${productTermsList.length} product terms`);
    if (productTermsList.length > 0) {
      console.log(`[Transcribe] Product terms sample: ${productTermsList.slice(0, 5).join(', ')}${productTermsList.length > 5 ? '...' : ''}`);
    }

    console.log(`[Transcribe] Fetching audio file from: ${transcription.content}`);
    // Get the file from Vercel Blob
    const response = await fetch(transcription.content);
    const audioBlob = await response.blob();
    
    console.log(`[Transcribe] Audio file size: ${(audioBlob.size / 1024 / 1024).toFixed(2)} MB, type: ${audioBlob.type}`);
    
    // Convert Blob to a File object which is supported by the elevenlabs API
    const audioFile = new File([audioBlob], transcription.filename, {
      type: audioBlob.type,
    });

    // Format product terms as biased keywords for improved accuracy
    // Each term gets a positive bias (0.8) to make the model more likely to recognize these terms
    // Format: ["term1:0.8", "term2:0.8"] as per Eleven Labs API docs
    const biasedKeywords = productTermsList.length > 0
      ? productTermsList.map(term => `${term}:10`)
      : undefined;
    
    if (biasedKeywords) {
      console.log(`[Transcribe] Formatted ${biasedKeywords.length} biased keywords`);
      console.log(`[Transcribe] Biased keywords sample: ${biasedKeywords.slice(0, 5).join(', ')}${biasedKeywords.length > 5 ? '...' : ''}`);
    } else {
      console.log(`[Transcribe] No biased keywords to add`);
    }

    // Log the request parameters for debugging
    console.log(`[Transcribe] Sending request to Eleven Labs API with params:`, {
      model_id: 'scribe_v1',
      file_size: (audioBlob.size / 1024 / 1024).toFixed(2) + ' MB',
      biased_keywords_count: biasedKeywords ? biasedKeywords.length : 0,
      biasedKeywords: biasedKeywords,
      diarize: true,
      tag_audio_events: true
    });

    // Use Eleven Labs Speech to Text API for transcription
    console.log(`[Transcribe] Calling Eleven Labs API...`);
    const transcriptionResponse = await elevenlabs.speechToText.convert({
      file: audioFile,
      model_id: 'scribe_v1',
      biased_keywords: biasedKeywords,
      diarize: false, // Enable speaker detection for meetings
      tag_audio_events: true, // Include audio events like (laughter), etc.
    });
    
    console.log(`[Transcribe] API response received, text length: ${transcriptionResponse.text.length} characters`);
    console.log(`[Transcribe] Language detected: ${transcriptionResponse.language_code}, probability: ${transcriptionResponse.language_probability}`);
    
    // Log a sample of the transcription text
    if (transcriptionResponse.text.length > 0) {
      const sample = transcriptionResponse.text.substring(0, 100);
      console.log(`[Transcribe] Text sample: "${sample}${transcriptionResponse.text.length > 100 ? '...' : ''}"`);
    }
    
    // If words with timing are available, log sample
    if (transcriptionResponse.words && transcriptionResponse.words.length > 0) {
      console.log(`[Transcribe] Word count with timing: ${transcriptionResponse.words.length}`);
      console.log(`[Transcribe] First few words:`, transcriptionResponse.words.slice(0, 3));
    }

    // Update transcription in database with actual text content
    console.log(`[Transcribe] Updating database record...`);
    const updatedTranscription = await prisma.transcription.update({
      where: { id: params.id },
      data: {
        content: transcriptionResponse.text,
        status: 'processed',
      },
    });

    console.log(`[Transcribe] Transcription complete for ID: ${params.id}`);
    
    // Return the transcription data
    return NextResponse.json({
      id: updatedTranscription.id,
      content: transcriptionResponse.text, 
      transcription: transcriptionResponse.text,
      status: 'processed',
      language_code: transcriptionResponse.language_code,
      language_probability: transcriptionResponse.language_probability,
    });
  } catch (error) {
    console.error(`[Transcribe] Error during transcription:`, error);
    
    // Update transcription status to failed if there's an error
    if (params.id) {
      console.log(`[Transcribe] Updating status to failed for ID: ${params.id}`);
      await prisma.transcription.update({
        where: { id: params.id },
        data: {
          status: 'failed',
        },
      }).catch((err: Error) => console.error('[Transcribe] Failed to update transcription status:', err));
    }
    
    return NextResponse.json(
      { error: 'Failed to transcribe file' },
      { status: 500 }
    );
  }
} 