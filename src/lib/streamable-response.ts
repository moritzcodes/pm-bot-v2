import { NextResponse } from 'next/server';

type TokenCallback = (token: string) => void;

/**
 * Creates a streamable response for SSE (Server-Sent Events)
 * @param generator Function that generates content and calls the provided callback for each token
 * @returns A Next.js streaming response
 */
export async function getStreamableResponse(
  generator: (tokenCallback: TokenCallback) => Promise<void>
) {
  const encoder = new TextEncoder();
  
  // Create a readable stream
  const stream = new ReadableStream({
    async start(controller) {
      // Function to handle each token
      const onToken = (token: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
      };
      
      try {
        // Run the generator with our token callback
        await generator(onToken);
        
        // Signal completion
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      } catch (error) {
        // Handle errors
        console.error('Stream error:', error);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: String(error) })}\n\n`)
        );
        controller.close();
      }
    },
  });
  
  // Return a streaming response
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
} 