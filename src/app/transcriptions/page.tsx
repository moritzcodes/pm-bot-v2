import { UploadForm } from "@/components/upload/UploadForm";
import { TranscriptionList } from "@/components/transcriptions/TranscriptionList";

export default function TranscriptionsPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <UploadForm />
      <TranscriptionList />
    </div>
  );
} 