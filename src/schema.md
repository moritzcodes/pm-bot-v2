# Data Schema

## Transcriptions
```typescript
interface Transcription {
  id: string;              // UUID
  filename: string;        // Original file name
  content: string;         // Raw transcription text
  uploadedAt: Date;        // Upload timestamp
  fileSize: number;        // Size in bytes
  mimeType: string;        // File type
  status: 'pending' | 'processed' | 'failed';
}
```

## Summaries
```typescript
interface Summary {
  id: string;              // UUID
  transcriptionId: string; // Reference to parent transcription
  content: string;         // Extracted summary text
  productMentions: string[]; // Detected product names
  isCasual: boolean;      // Whether it's a casual transcription
  verificationStatus: 'pending' | 'verified' | 'rejected';
  enrichedData?: {        // Additional RAG-provided info
    marketTrends: string[];
    customerInsights: string[];
    meetingReferences: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}
```

## API Endpoints

### Transcriptions
- `POST /api/transcriptions/upload` - Upload new transcription file
- `GET /api/transcriptions/:id` - Get transcription by ID
- `GET /api/transcriptions` - List all transcriptions (paginated)

### Summaries
- `POST /api/summaries/extract` - Extract summary from transcription
- `PUT /api/summaries/:id/verify` - Verify and enrich summary with RAG
- `GET /api/summaries/:id` - Get summary by ID
- `GET /api/summaries` - List all summaries (paginated)

### Chat
- `POST /api/chat` - Send chat message and get response
- `GET /api/chat/history` - Get chat history 