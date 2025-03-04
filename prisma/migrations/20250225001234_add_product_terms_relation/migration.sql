-- CreateTable
CREATE TABLE "_TranscriptionToProductTerm" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_TranscriptionToProductTerm_AB_unique" ON "_TranscriptionToProductTerm"("A", "B");

-- CreateIndex
CREATE INDEX "_TranscriptionToProductTerm_B_index" ON "_TranscriptionToProductTerm"("B");

-- AddForeignKey
ALTER TABLE "_TranscriptionToProductTerm" ADD CONSTRAINT "_TranscriptionToProductTerm_A_fkey" FOREIGN KEY ("A") REFERENCES "Transcription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TranscriptionToProductTerm" ADD CONSTRAINT "_TranscriptionToProductTerm_B_fkey" FOREIGN KEY ("B") REFERENCES "ProductTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE; 