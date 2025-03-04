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
    // Get product terms to improve analysis
    const productTerms = await prisma.productTerm.findMany();
    const productTermsList = productTerms.map((term: { term: string }) => term.term).join(", ");
    
    // Set the format based on options
    const format = options.format || 'formal';
    
    // Create the prompt
    const prompt = `
      Analyze the following meeting transcription and:
      1. Create a concise ${format} summary of the key points (max 250 words)
      2. Identify 3-5 market trends mentioned
      3. Detect any product names mentioned, especially these known products if they appear: ${productTermsList}
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
    
    // Generate the completion with streaming if onToken is provided
    if (options.onToken) {
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
      
      // Process the stream
      let fullText = '';
      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || '';
        fullText += token;
        if (options.onToken) {
          options.onToken(token);
        }
      }
      
      try {
        // Verify JSON is valid
        JSON.parse(fullText);
        return fullText;
      } catch (e) {
        console.error('Invalid JSON in summary response:', fullText);
        throw new Error('Generated summary is not valid JSON');
      }
    } else {
      // Non-streaming version
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
      
      try {
        // Verify JSON is valid
        JSON.parse(responseText);
        return responseText;
      } catch (e) {
        console.error('Invalid JSON in summary response:', responseText);
        throw new Error('Generated summary is not valid JSON');
      }
    }
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
} 