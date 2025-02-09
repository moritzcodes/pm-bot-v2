'use server';

import { createStreamableValue } from 'ai/rsc';
import { Message } from 'ai/react';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Streaming Chat 
export async function continueTextConversation(messages: Message[]) {
  const threadMessages = messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  const thread = await openai.beta.threads.create({
    messages: threadMessages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }))
  });

  const run = await openai.beta.threads.runs.create(
    thread.id,
    { assistant_id: process.env.OPENAI_ASSISTANT_ID! }
  );

  const stream = new ReadableStream({
    async start(controller) {
      while (true) {
        const runStatus = await openai.beta.threads.runs.retrieve(
          thread.id,
          run.id
        );

        if (runStatus.status === 'completed') {
          const messages = await openai.beta.threads.messages.list(thread.id);
          const lastMessage = messages.data[0];
          if (lastMessage.role === 'assistant' && lastMessage.content[0].type === 'text') {
            controller.enqueue(lastMessage.content[0].text.value);
          }
          controller.close();
          break;
        } else if (runStatus.status === 'failed') {
          controller.error('Assistant run failed');
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  });

  const streamableValue = createStreamableValue(stream);
  return streamableValue.value;
}

// Utils
export async function checkAIAvailability() {
  const envVarExists = !!process.env.OPENAI_API_KEY;
  return envVarExists;
}