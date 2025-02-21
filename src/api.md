# API Documentation

## Authentication
All API endpoints require authentication using a bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Transcriptions

#### Upload Transcription
```http
POST /api/transcriptions/upload
Content-Type: multipart/form-data

Body:
- file: File (required) - The transcription file to upload
```

Response:
```typescript
{
  id: string;          // Transcription ID
  filename: string;    // Original filename
  uploadedAt: string;  // ISO timestamp
  status: string;      // Upload status
}
```

#### Get Transcription
```http
GET /api/transcriptions/:id
```

Response:
```typescript
{
  id: string;
  filename: string;
  content: string;
  uploadedAt: string;
  fileSize: number;
  mimeType: string;
  status: string;
}
```

#### List Transcriptions
```http
GET /api/transcriptions?page=1&limit=10
```

Response:
```typescript
{
  items: Array<{
    id: string;
    filename: string;
    uploadedAt: string;
    status: string;
  }>;
  total: number;
  page: number;
  limit: number;
}
```

### Summaries

#### Extract Summary
```http
POST /api/summaries/extract
Content-Type: application/json

Body:
{
  transcriptionId: string;  // ID of the transcription
}
```

Response:
```typescript
{
  id: string;              // Summary ID
  content: string;         // Extracted summary
  productMentions: string[];
  isCasual: boolean;
  verificationStatus: string;
}
```

#### Verify Summary
```http
PUT /api/summaries/:id/verify
Content-Type: application/json

Body:
{
  approve: boolean;        // Whether to approve the summary
}
```

Response:
```typescript
{
  id: string;
  verificationStatus: string;
  enrichedData?: {
    marketTrends: string[];
    customerInsights: string[];
    meetingReferences: string[];
  };
}
```

#### Get Summary
```http
GET /api/summaries/:id
```

Response:
```typescript
{
  id: string;
  transcriptionId: string;
  content: string;
  productMentions: string[];
  isCasual: boolean;
  verificationStatus: string;
  enrichedData?: {
    marketTrends: string[];
    customerInsights: string[];
    meetingReferences: string[];
  };
  createdAt: string;
  updatedAt: string;
}
```

#### List Summaries
```http
GET /api/summaries?page=1&limit=10
```

Response:
```typescript
{
  items: Array<{
    id: string;
    content: string;
    verificationStatus: string;
    createdAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
}
```

### Chat

#### Send Message
```http
POST /api/chat
Content-Type: application/json

Body:
{
  message: string;         // User's message
  context?: {             // Optional context filters
    productNames?: string[];
    dateRange?: {
      start: string;      // ISO date
      end: string;        // ISO date
    }
  }
}
```

Response:
```typescript
{
  response: string;       // AI response
  references: Array<{     // Supporting references
    summaryId: string;
    content: string;
    meetingDate: string;
  }>;
}
```

#### Get Chat History
```http
GET /api/chat/history?page=1&limit=10
```

Response:
```typescript
{
  items: Array<{
    id: string;
    message: string;
    response: string;
    timestamp: string;
  }>;
  total: number;
  page: number;
  limit: number;
}
```

## Error Responses
All endpoints return standard error responses:

```typescript
{
  error: {
    code: string;       // Error code
    message: string;    // Human-readable message
    details?: any;      // Additional error details
  }
}
```

Common error codes:
- `unauthorized`: Authentication required or invalid
- `forbidden`: Insufficient permissions
- `not_found`: Resource not found
- `validation_error`: Invalid request data
- `internal_error`: Server error 