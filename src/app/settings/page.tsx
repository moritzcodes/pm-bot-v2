import { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export const metadata: Metadata = {
  title: 'General Settings',
  description: 'Configure your general PM Bot settings'
};

export default function SettingsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold mb-6">General Settings</h1>
      <p className="text-muted-foreground mb-6">
        Configure your transcription and AI settings to improve accuracy and performance.
      </p>
      
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Transcription Settings</h2>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="autoProcess" className="text-base">Auto-Process Audio Files</Label>
              <p className="text-sm text-muted-foreground">Automatically transcribe files upon upload</p>
            </div>
            <Switch id="autoProcess" defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="autoSummarize" className="text-base">Auto-Generate Summaries</Label>
              <p className="text-sm text-muted-foreground">Automatically create summaries after transcription</p>
            </div>
            <Switch id="autoSummarize" />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enhancedAudio" className="text-base">Enhanced Audio Processing</Label>
              <p className="text-sm text-muted-foreground">Apply noise reduction and voice enhancement</p>
            </div>
            <Switch id="enhancedAudio" defaultChecked />
          </div>
        </div>
      </Card>
      
      <Card className="p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">AI Models & Accuracy</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Configure AI models and settings to optimize for your specific needs.
        </p>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="whisperModel" className="text-base">Whisper Transcription Model</Label>
            <select 
              id="whisperModel" 
              className="w-full mt-1 p-2 border rounded-md"
              defaultValue="whisper-1"
            >
              <option value="whisper-1">Whisper (Standard)</option>
              <option value="whisper-large">Whisper Large (Higher Accuracy)</option>
            </select>
          </div>
          
          <div>
            <Label htmlFor="language" className="text-base">Primary Language</Label>
            <select 
              id="language" 
              className="w-full mt-1 p-2 border rounded-md"
              defaultValue="en"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Setting a primary language can improve transcription accuracy
            </p>
          </div>
          
          <div>
            <Label htmlFor="summaryModel" className="text-base">Summary Generation Model</Label>
            <select 
              id="summaryModel" 
              className="w-full mt-1 p-2 border rounded-md"
              defaultValue="gpt-4-turbo"
            >
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="productTerms" className="text-base">Use Product Terms Dictionary</Label>
              <p className="text-sm text-muted-foreground">Apply product terms to improve transcription accuracy</p>
            </div>
            <Switch id="productTerms" defaultChecked />
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button>
            Save Settings
          </Button>
        </div>
      </Card>
    </>
  );
} 