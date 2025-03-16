import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ElevenLabsClient } from 'elevenlabs';

// Use Node.js runtime with increased timeout
// Edge runtime can have compatibility issues with Prisma
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes in seconds
export const dynamic = 'force-dynamic';

// Initialize Eleven Labs client
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// Add timeout configuration for fetch operations
const FETCH_TIMEOUT = 60000; // 1 minute timeout for fetch operations

// Add timeout configuration
const TRANSCRIPTION_TIMEOUT = 300000; // 5 minutes

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`[Transcribe] Starting transcription for ID: ${params.id}`);
    
    // Memory optimization for large requests
    request.headers; // Read headers before they're consumed

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
    
    // Get the file from S3 with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    let response;
    
    try {
      response = await fetch(transcription.content, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      // Check if the response is valid
      if (!response.ok) {
        throw new Error(`Failed to fetch audio file: ${response.status} ${response.statusText}`);
      }
      
      // Process in chunks to avoid memory issues with large files
      const contentType = response.headers.get('content-type');
      console.log(`[Transcribe] Content-Type from response headers: ${contentType}`);
      
      const audioBlob = await response.blob();
      console.log(`[Transcribe] Audio file size: ${(audioBlob.size / 1024 / 1024).toFixed(2)} MB, type: ${audioBlob.type}`);
      
      // Validate that we have an audio file
      const isAudioFile = audioBlob.type.startsWith('audio/') || 
                          contentType?.startsWith('audio/') ||
                          transcription.filename.endsWith('.mp3') || 
                          transcription.filename.endsWith('.wav') ||
                          transcription.filename.endsWith('.m4a');
                          
      if (!isAudioFile) {
        throw new Error(`Invalid audio file type: ${audioBlob.type}. File appears to be ${contentType || 'unknown type'}`);
      }
      
      // Force the correct MIME type for MP3 files
      const forcedMimeType = transcription.filename.endsWith('.mp3') ? 'audio/mpeg' : 
                            (transcription.filename.endsWith('.wav') ? 'audio/wav' : 
                            (transcription.filename.endsWith('.m4a') ? 'audio/m4a' : audioBlob.type));
      
      // Convert Blob to a File object which is supported by the elevenlabs API
      const audioFile = new File([audioBlob], transcription.filename, {
        type: forcedMimeType,
      });
      
      console.log(`[Transcribe] Created File object with type: ${forcedMimeType}`);

      // Explicitly release the blob to help with memory
      // @ts-ignore - TypeScript doesn't recognize close() method
      if (audioBlob.close) audioBlob.close();

      // Log the request parameters for debugging
      console.log(`[Transcribe] Sending request to Eleven Labs API with params:`, {
        model_id: 'scribe_v1',
        file_size: (audioBlob.size / 1024 / 1024).toFixed(2) + ' MB',
        diarize: false,
        tag_audio_events: true
      });

      // Add error handling specifically for the API call
      try {
        // Use Eleven Labs Speech to Text API for transcription
        console.log(`[Transcribe] Calling Eleven Labs API...`);
        const transcriptionResponse = await elevenlabs.speechToText.convert({
          file: audioFile,
          model_id: 'scribe_v1',
          diarize: false, // Disabled to reduce processing load
          tag_audio_events: true, // Include audio events like (laughter), etc.
        });
        
        console.log(`[Transcribe] API response received, text length: ${transcriptionResponse.text?.length || 0} characters`);
        
        // Log language info if available for debugging
        if (transcriptionResponse.language_code) {
          console.log(`[Transcribe] Language detected: ${transcriptionResponse.language_code}, probability: ${transcriptionResponse.language_probability}`);
        }
        
        // Log a sample of the transcription text
        if (transcriptionResponse.text?.length > 0) {
          const sample = transcriptionResponse.text.substring(0, 100);
          console.log(`[Transcribe] Text sample: "${sample}${transcriptionResponse.text.length > 100 ? '...' : ''}"`);
        }
        
        // Check if we got a valid response with text
        if (!transcriptionResponse.text) {
          throw new Error('No transcription text received from ElevenLabs API');
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
      } catch (apiError) {
        console.error(`[Transcribe] ElevenLabs API Error:`, apiError);
        throw new Error(`ElevenLabs API Error: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error(`[Transcribe] Error during fetch:`, fetchError);
      throw fetchError;
    }
  } catch (error) {
    console.error(`[Transcribe] Error during transcription:`, error);
    
    // Extract error details for better diagnostics
    let errorMessage = 'Failed to transcribe file';
    let errorDetails = null;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      // Check if it's an ElevenLabs error with details
      if ('detail' in (error as any)) {
        errorDetails = (error as any).detail;
      }
    }
    
    // Update transcription status to failed if there's an error
    try {
      if (params.id) {
        console.log(`[Transcribe] Updating status to failed for ID: ${params.id}`);
        await prisma.transcription.update({
          where: { id: params.id },
          data: {
            status: 'failed',
            // Store error details in the database for debugging
            enrichedData: {
              error: errorMessage,
              errorDetails: errorDetails,
              timestamp: new Date().toISOString()
            }
          },
        });
      }
    } catch (dbError) {
      console.error('[Transcribe] Failed to update transcription status:', dbError);
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails || String(error)
      },
      { status: 500 }
    );
  }
}