'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

// Define types locally instead of importing from Prisma
interface Transcription {
  id: string;
  filename: string;
  content: string;
  uploadedAt: Date | string;
  fileSize: number;
  mimeType: string;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface Summary {
  id: string;
  transcriptionId: string;
  content: string;
  productMentions: string[];
  isCasual: boolean;
  verificationStatus: string;
  enrichedData: any;
  createdAt: Date | string;
  updatedAt: Date | string;
}

type TranscriptionWithSummaries = Transcription & {
  summaries: Summary[];
};

interface TranscriptionDetailsProps {
  transcription: TranscriptionWithSummaries;
}

export function TranscriptionDetails({ transcription }: TranscriptionDetailsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Summary[]>(transcription.summaries || []);
  
  // Draft summary state
  const [draftSummary, setDraftSummary] = useState<boolean>(false);
  
  // Editable fields
  const [editedContent, setEditedContent] = useState<string>('');
  const [editedMarketTrends, setEditedMarketTrends] = useState<string>('');
  const [editedProductMentions, setEditedProductMentions] = useState<string>('');

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [savingKnowledge, setSavingKnowledge] = useState(false);
  const [knowledgeMessage, setKnowledgeMessage] = useState<string>('');
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);
  const [isCasual, setIsCasual] = useState<boolean>(false);
  const [knowledgeStatus, setKnowledgeStatus] = useState<{ 
    success?: boolean; 
    message?: string; 
  }>({});

  const handleGenerateSummary = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch(`/api/transcriptions/${transcription.id}/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ draftMode: true }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate summary');
      }

      // Handle the SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get stream reader');
      }

      let accumulatedText = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.substring(6); // Remove 'data: ' prefix
              const data = JSON.parse(jsonStr);
              
              if (data.token) {
                accumulatedText += data.token;
                // Optionally update UI with streaming tokens
              } else if (data.done) {
                // Stream is complete
                try {
                  const summaryData = JSON.parse(accumulatedText);
                  // Initialize editable fields
                  setDraftSummary(true);
                  setEditedContent(summaryData.summary);
                  setEditedMarketTrends(summaryData.marketTrends.join('\n'));
                  setEditedProductMentions(summaryData.productMentions.join('\n'));
                  setIsCasual(summaryData.isCasual);
                } catch (e) {
                  console.error('Error parsing summary JSON:', e);
                  throw new Error('Generated summary is not valid JSON');
                }
              }
            } catch (e) {
              console.error('Error processing SSE data:', e, line);
            }
          }
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate summary');
      console.error('Error generating summary:', error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleSaveSummary = async () => {
    setIsSaving(true);
    try {
      // Parse edited text areas into arrays
      const marketTrends = editedMarketTrends
        .split('\n')
        .map(item => item.trim())
        .filter(Boolean);
      
      const productMentions = editedProductMentions
        .split('\n')
        .map(item => item.trim())
        .filter(Boolean);
      
      // Prepare the summary data
      const summaryData = {
        editedContent: editedContent,
        marketTrends,
        productMentions,
        isCasual
      };
      
      console.log('Saving summary data:', summaryData);
      
      const response = await fetch(`/api/transcriptions/${transcription.id}/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summaryData,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save summary');
      }
      
      const result = await response.json();
      console.log('Save summary response:', result);
      
      if (result.success && result.summary) {
        // Update the summaries array with the new summary
        setSummaries([result.summary, ...summaries]);
        
        // Clear draft summary
        setDraftSummary(false);
        setEditedContent('');
        setEditedMarketTrends('');
        setEditedProductMentions('');
      } else {
        throw new Error('Summary creation response did not include the summary data');
      }
    } catch (error) {
      console.error('Error saving summary:', error);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDiscardDraft = () => {
    setDraftSummary(false);
    setEditedContent('');
    setEditedMarketTrends('');
    setEditedProductMentions('');
  };

  const handleAddToKnowledge = async () => {
    setSavingKnowledge(true);
    setKnowledgeMessage('');

    try {
      // Get the latest summary ID (if available)
      const latestSummaryId = summaries.length > 0 ? summaries[0].id : null;
      
      // Use selectedSummaryId if available, otherwise use latest summary
      const summaryIdToAdd = selectedSummaryId || latestSummaryId;
      
      console.log(`Adding to knowledge: transcriptionId=${transcription.id}, summaryId=${summaryIdToAdd}`);
      
      if (!summaryIdToAdd) {
        setKnowledgeMessage('No summary available to add to knowledge base');
        setSavingKnowledge(false);
        return;
      }

      const response = await fetch('/api/knowledge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptionId: transcription.id,
          summaryId: summaryIdToAdd,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add to knowledge base');
      }

      console.log('Knowledge base response:', data);
      
      if (data.transcription?.success) {
        setKnowledgeMessage((prev: string) => `${prev}Transcription added successfully. `);
      } else if (data.transcription?.error) {
        setKnowledgeMessage((prev: string) => `${prev}Transcription error: ${data.transcription.error}. `);
      }
      
      if (data.summary?.success) {
        setKnowledgeMessage((prev: string) => `${prev}Summary added successfully.`);
      } else if (data.summary?.error) {
        setKnowledgeMessage((prev: string) => `${prev}Summary error: ${data.summary.error}.`);
      }
      
    } catch (error) {
      console.error('Error adding to knowledge base:', error);
      setKnowledgeMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSavingKnowledge(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{transcription.filename}</h2>
            <p className="text-sm text-muted-foreground">
              Uploaded {new Date(transcription.uploadedAt).toLocaleString()}
            </p>
          </div>
          <span
            className={`text-sm px-2 py-1 rounded-full ${
              transcription.status === 'processed'
                ? 'bg-green-100 text-green-800'
                : transcription.status === 'failed'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {transcription.status}
          </span>
        </div>

        <div className="mt-6">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-medium">Transcription Content</h3>
            {!draftSummary && (
              <Button 
                onClick={handleGenerateSummary} 
                disabled={isGenerating}
                className="text-sm"
              >
                {isGenerating ? 'Analyzing...' : 'Generate Summary & Trends'}
              </Button>
            )}
          </div>
          <div className="p-4 border rounded-md bg-muted/40 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm">{transcription.content}</pre>
          </div>

          {error && (
            <p className="mt-4 text-sm text-destructive">{error}</p>
          )}
        </div>
      </Card>
      
      {/* Draft Summary Editor */}
      {draftSummary && (
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Edit Summary Before Saving</h3>
          <Tabs defaultValue="summary" className="w-full">
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="marketTrends">Market Trends</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Summary Content</label>
                <Textarea 
                  value={editedContent}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditedContent(e.target.value)}
                  className="min-h-[200px]"
                  placeholder="Edit the summary content..."
                />
              </div>
            </TabsContent>
            
            <TabsContent value="marketTrends" className="mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Market Trends (one per line)</label>
                <Textarea 
                  value={editedMarketTrends}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditedMarketTrends(e.target.value)}
                  className="min-h-[200px]"
                  placeholder="Edit market trends (one per line)..."
                />
              </div>
            </TabsContent>
            
            <TabsContent value="products" className="mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Product Mentions (one per line)</label>
                <Textarea 
                  value={editedProductMentions}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditedProductMentions(e.target.value)}
                  className="min-h-[200px]"
                  placeholder="Edit product mentions (one per line)..."
                />
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 flex space-x-2 justify-end">
            <Button 
              variant="outline" 
              onClick={handleDiscardDraft}
              disabled={isSaving}
            >
              Discard
            </Button>
            <Button 
              onClick={handleSaveSummary}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Summary'}
            </Button>
          </div>
        </Card>
      )}

      {summaries.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Summaries</h3>
          <Tabs defaultValue="summaries" className="w-full">
            <TabsList>
              <TabsTrigger value="summaries">Summaries</TabsTrigger>
              <TabsTrigger value="marketTrends">Market Trends</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
            </TabsList>
            <TabsContent value="summaries" className="mt-4">
              {summaries.map((summary) => (
                <div key={summary.id} className="mb-4 p-4 border rounded-md">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      {new Date(summary.createdAt).toLocaleString()}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      summary.isCasual ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {summary.isCasual ? 'Casual' : 'Formal'}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{summary.content}</p>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="marketTrends" className="mt-4">
              {summaries.map((summary) => {
                const enrichedData = summary.enrichedData as { marketTrends: string[] } | null;
                return (
                  <div key={summary.id} className="mb-4 p-4 border rounded-md">
                    <div className="mb-2">
                      <span className="text-sm text-muted-foreground">
                        {new Date(summary.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {enrichedData?.marketTrends && enrichedData.marketTrends.length > 0 ? (
                      <ul className="list-disc pl-5 space-y-1">
                        {enrichedData.marketTrends.map((trend, index) => (
                          <li key={index} className="text-sm">{trend}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No market trends detected</p>
                    )}
                  </div>
                );
              })}
            </TabsContent>
            <TabsContent value="products" className="mt-4">
              {summaries.map((summary) => (
                <div key={summary.id} className="mb-4 p-4 border rounded-md">
                  <div className="mb-2">
                    <span className="text-sm text-muted-foreground">
                      {new Date(summary.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {summary.productMentions && summary.productMentions.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1">
                      {summary.productMentions.map((product: string, index: number) => (
                        <li key={index} className="text-sm">{product}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No products mentioned</p>
                  )}
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </Card>
      )}

      {/* Add to Knowledge Base section */}
      <div className="border p-4 rounded-md">
        <h3 className="text-lg font-medium mb-2">Add to Knowledge Base</h3>
        <p className="text-sm text-gray-500 mb-2">
          Add this transcription and its summary to the AI assistant's knowledge base.
        </p>
        
        {summaries.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Select summary to add (optional, defaults to latest)
            </label>
            <select
              className="w-full border p-2 rounded"
              value={selectedSummaryId || ''}
              onChange={(e) => setSelectedSummaryId(e.target.value || null)}
            >
              <option value="">Latest Summary</option>
              {summaries.map((summary) => (
                <option key={summary.id} value={summary.id}>
                  {new Date(summary.createdAt).toLocaleString()} - {summary.verificationStatus}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <Button
          onClick={handleAddToKnowledge}
          className="mb-2"
          disabled={savingKnowledge || summaries.length === 0}
        >
          {savingKnowledge ? 'Adding...' : 'Add to Knowledge Base'}
        </Button>
        
        {knowledgeMessage && (
          <div className={`p-2 rounded text-sm ${knowledgeMessage.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {knowledgeMessage}
          </div>
        )}
      </div>
    </div>
  );
} 
