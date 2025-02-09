'use client';

import { Card } from "@/components/ui/card"
import { type Message } from 'ai/react';
import { useState } from 'react';
import { continueTextConversation } from '@/app/actions';
import { readStreamableValue } from 'ai/rsc';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { IconArrowUp } from '@/components/ui/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const maxDuration = 30;

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState('general');

  const quickPrompts = {
    general: [
      { label: "Highlight Important Info", prompt: "Highlight important information from the discussion" },
      { label: "Key Takeaways", prompt: "What are the key takeaways from this meeting?" },
      { label: "Action Items", prompt: "List all action items mentioned" }
    ],
    product: [
      { label: "Product Details", prompt: "What's the best information on the products discussed in the meeting?" },
      { label: "Feature Analysis", prompt: "Analyze the key features discussed" },
      { label: "Product Roadmap", prompt: "Summarize the product roadmap points" }
    ],
    market: [
      { label: "Market Trends", prompt: "What are the current market trends?" },
      { label: "Competition", prompt: "Analyze competitive landscape discussed" },
      { label: "Market Strategy", prompt: "Summarize market strategy points" }
    ]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newMessage: Message = {
      id: crypto.randomUUID(),
      content: input,
      role: 'user',
    };
    const newMessages = [...messages, newMessage];
    setMessages(newMessages);
    setInput('');
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
  }
  
  return (    
    <div className="flex flex-col h-full max-w-5xl mx-auto px-4">
      <Card className="flex-1 mt-4 mb-32 p-4 bg-white/50 backdrop-blur-sm border-none shadow-lg">
        <Tabs defaultValue="general" className="h-full" onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList className="grid w-[400px] grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="product">Product</TabsTrigger>
              <TabsTrigger value="market">Market</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[calc(100vh-300px)] pr-4">
            {messages.length <= 0 ? ( 
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="/hbk-logo.png" />
                  <AvatarFallback>HBK</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Welcome to HBK PM Bot</h2>
                  <p className="text-muted-foreground">How can I help you today?</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} 
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start gap-2 max-w-[80%] ${
                      message.role === 'user' 
                        ? 'flex-row-reverse' 
                        : 'flex-row'
                    }`}>
                      <Avatar className="h-8 w-8">
                        {message.role === 'assistant' ? (
                          <>
                            <AvatarImage src="/hbk-logo.png" />
                            <AvatarFallback>HBK</AvatarFallback>
                          </>
                        ) : (
                          <AvatarFallback>You</AvatarFallback>
                        )}
                      </Avatar>
                      <div className={`rounded-lg p-3 ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Tabs>
      </Card>

      <div className="fixed inset-x-0 bottom-20 w-full">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-2">
            {quickPrompts[activeTab as keyof typeof quickPrompts].map((item, index) => (
              <Button 
                key={index}
                variant="secondary" 
                size="sm"
                onClick={() => setInput(item.prompt)}
                className="w-full"
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-4 w-full">
        <div className="max-w-5xl mx-auto px-4">
          <Card className="p-2 border-none shadow-lg bg-white/50 backdrop-blur-sm">
            <form onSubmit={handleSubmit}>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  placeholder="Ask me anything..."
                  className="flex-1 border-none focus-visible:ring-1"
                />
                <Button type="submit" size="icon" disabled={!input.trim()}>
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
