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
    // Get the file from S3
    const response = await fetch(transcription.content);
    
    // Check if the response is valid
    if (!response.ok) {
      throw new Error(`Failed to fetch audio file: ${response.status} ${response.statusText}`);
    }
    
    // Get the content type from the response headers
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

    // Format product terms as biased keywords for improved accuracy
    // The API expects just the terms without bias values for the biased_keywords parameter
    // We'll pass the terms directly without the bias suffix
   

    // Log the request parameters for debugging
    console.log(`[Transcribe] Sending request to Eleven Labs API with params:`, {
      model_id: 'scribe_v1',
      file_size: (audioBlob.size / 1024 / 1024).toFixed(2) + ' MB',
      diarize: true,
      tag_audio_events: true
    });

    // Use Eleven Labs Speech to Text API for transcription
    console.log(`[Transcribe] Calling Eleven Labs API...`);
    const transcriptionResponse = await elevenlabs.speechToText.convert({
      file: audioFile,
      model_id: 'scribe_v1',
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
      }).catch((err: Error) => console.error('[Transcribe] Failed to update transcription status:', err));
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