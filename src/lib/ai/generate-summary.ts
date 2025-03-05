import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type SummaryOptions = {
  format?: 'casual' | 'formal';
  onToken?: (token: string) => void;
};

/**
 * Generates a summary of a transcription using OpenAI
 */
export async function generateSummary(
  transcriptionContent: string,
  options: SummaryOptions = {}
) {
  try {
    console.log('Starting summary generation with options:', options);
    
    const productTerms = await prisma.productTerm.findMany();
    console.log('Found product terms:', productTerms.length);
    
    const format = options.format || 'formal';
    
    // Create the prompt
    const prompt = `
      Analyze the following meeting transcription and:
      1. Create a concise ${format} summary of the key points (max 250 words)
      2. Identify 3-5 market trends mentioned
      3. Detect any product names mentioned, especially these known products if they appear: ${productTerms.map(t => t.term).join(", ")}
      4. Determine if this is a casual conversation or a formal meeting
      
      Format your response as JSON with the following structure:
      {
        "summary": "The concise summary...",
        "marketTrends": ["Trend 1", "Trend 2", ...],
        "productMentions": ["Product 1", "Product 2", ...],
        "isCasual": true/false
      }

      Here is the transcription:
      ${transcriptionContent}
    `;

    console.log('Created prompt, length:', prompt.length);
    
    if (options.onToken) {
      console.log('Initiating streaming request to OpenAI...');
      const stream = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        response_format: { type: "json_object" },
        messages: [
          { 
            role: "system", 
            content: "You are an AI that analyzes meeting transcriptions to extract summaries and market trends. Respond only with valid JSON." 
          },
          { role: "user", content: prompt }
        ],
        stream: true,
      });
      
      console.log('Stream created, beginning processing...');
      
      let fullText = '';
      for await (const chunk of stream) {
        console.log('Received chunk:', chunk.choices[0]?.delta);
        const token = chunk.choices[0]?.delta?.content || '';
        fullText += token;
        
        if (options.onToken && token) {
          console.log('Sending token:', token);
          await options.onToken(`data: ${token}\n\n`);
        }
      }
      
      console.log('Stream complete. Full text:', fullText);
      
      try {
        const parsedJson = JSON.parse(fullText);
        console.log('Successfully parsed JSON:', parsedJson);
        return JSON.stringify(parsedJson);
      } catch (e) {
        console.error('Invalid JSON in summary response:', fullText);
        throw new Error('Generated summary is not valid JSON');
      }
    } else {
      console.log('Using non-streaming mode');
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
        throw new Error('Empty response from OpenAI');
      }
      
      try {
        JSON.parse(responseText); // Verify JSON is valid
        return responseText;
      } catch (e) {
        console.error('Invalid JSON in summary response:', responseText);
        throw new Error('Generated summary is not valid JSON');
      }
    }
  } catch (error) {
    console.error('Error in generateSummary:', error);
    throw error;
  }
} 
