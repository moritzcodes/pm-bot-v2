'use client';

import { Card } from "@/components/ui/card"
import { type Message } from 'ai/react';
import { useState } from 'react';
import { continueTextConversation } from '@/app/actions';
import { readStreamableValue } from 'ai/rsc';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { IconArrowUp } from '@/components/ui/icons';
import Link from "next/link";
export const maxDuration = 300;

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');  
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true);
    const newMessage: Message = {
      id: crypto.randomUUID(),
      content: input,
      role: 'user',
    };
    const newMessages = [...messages, newMessage];
    setMessages(newMessages);
    setInput('');
    try {
      const result = await continueTextConversation(newMessages);
      for await (const content of readStreamableValue(result)) {
        setMessages([
          ...newMessages,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: content as string,
          },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  }
  
  return (    
    <div className="group w-full overflow-auto ">
      {messages.length <= 0 ? ( 
        <div className="max-w-xl mx-auto mt-10 mb-24">
          <p>Hello, I'm the HBK PM Bot. How can I help you today?</p>
        </div>
      ) 
      : (
        <div className="max-w-xl mx-auto mt-10 mb-24">
          {messages.map((message, index) => (
            <div key={message.id} className="whitespace-pre-wrap flex mb-5">
              <div className={`${message.role === 'user' ? 'bg-slate-200 ml-auto' : 'bg-transparent'} p-2 rounded-lg`}>
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start mb-5">
              <div className="bg-transparent p-2 rounded-lg">
                <div className="flex flex-col space-y-2">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  </div>
                  <span className="text-sm text-gray-500">Retrieving information from knowledge base...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="fixed inset-x-0 bottom-32 w-full">
        <div className="w-full max-w-xl mx-auto px-4">
          <div className="flex flex-wrap gap-2 justify-center">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setInput("What are the current market trends?")}
              disabled={isLoading}
            >
              Market Trends
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setInput("Highlight important information")}
              disabled={isLoading}
            >
              Highlight important information
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setInput("What&apos;s the best information on the products discussed in the meeting?")}
              disabled={isLoading}
            >
              Product Information
            </Button>
           
          </div>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-10 w-full ">
        <div className="w-full max-w-xl mx-auto">
          <Card className="p-2">
            <form onSubmit={handleSubmit}>
              <div className="flex">
                <Input
                  type="text"
                  value={input}
                  onChange={event => {
                    setInput(event.target.value);
                  }}
                  className="w-[95%] mr-2 border-0 ring-offset-0 focus-visible:ring-0 focus-visible:outline-none focus:outline-none focus:ring-0 ring-0 focus-visible:border-none border-transparent focus:border-transparent focus-visible:ring-none"
                  placeholder='Ask me anything...'
                  disabled={isLoading}
                />
                <Button disabled={!input.trim() || isLoading}>
                  <IconArrowUp />
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
