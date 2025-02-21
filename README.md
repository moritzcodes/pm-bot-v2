# PM Bot v2

A Next.js application for managing meeting transcriptions, extracting summaries, and providing AI-powered insights.

## Features

- Upload and process meeting transcriptions
- Automatic summary extraction with product mention detection
- RAG-powered verification and enrichment
- Chat interface for querying market trends
- Reference-based responses with meeting context

## Tech Stack

- **Frontend:** Next.js, TailwindCSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL with Prisma ORM
- **Storage:** Vercel Blob Storage
- **AI:** O3 Mini (primary) / DeepSeek (fallback)

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/pm-bot-v2.git
   cd pm-bot-v2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Update the variables with your values:
     - `DATABASE_URL`: PostgreSQL connection string
     - `BLOB_READ_WRITE_TOKEN`: Vercel Blob storage token
     - `JWT_SECRET`: Secret for JWT authentication
     - AI model settings (if using different models)

4. **Set up the database**
   ```bash
   # Create and apply migrations
   npx prisma migrate dev
   
   # Generate Prisma Client
   npx prisma generate
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
pm-bot-v2/
├── src/
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   ├── lib/             # Utility functions
│   └── project-plan/    # Project documentation
├── prisma/              # Database schema and migrations
├── public/             # Static assets
└── .env               # Environment variables
```

## API Documentation

See [src/api.md](src/api.md) for detailed API documentation.

## Database Schema

See [src/schema.md](src/schema.md) for database schema documentation.

## Project Plan

See [src/project-plan/overview.md](src/project-plan/overview.md) for the detailed project plan.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
