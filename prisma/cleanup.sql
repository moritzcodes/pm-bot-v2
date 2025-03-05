-- Drop all existing tables in the correct order
DROP TABLE IF EXISTS "_TranscriptionToProductTerm" CASCADE;
DROP TABLE IF EXISTS "_ChatMessageToSummary" CASCADE;
DROP TABLE IF EXISTS "ChatMessage" CASCADE;
DROP TABLE IF EXISTS "Summary" CASCADE;
DROP TABLE IF EXISTS "ProductTerm" CASCADE;
DROP TABLE IF EXISTS "Transcription" CASCADE;
DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;