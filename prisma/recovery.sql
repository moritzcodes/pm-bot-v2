-- First, remove the failed migration record
DELETE FROM "_prisma_migrations" WHERE migration_name = '20250221232552_init';

-- Then clean up any existing tables
DROP TABLE IF EXISTS "_TranscriptionToProductTerm" CASCADE;
DROP TABLE IF EXISTS "_ChatMessageToSummary" CASCADE;
DROP TABLE IF EXISTS "ChatMessage" CASCADE;
DROP TABLE IF EXISTS "Summary" CASCADE;
DROP TABLE IF EXISTS "ProductTerm" CASCADE;
DROP TABLE IF EXISTS "Transcription" CASCADE;