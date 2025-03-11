import { PdfUploadForm } from "@/components/pdf-upload/PdfUploadForm";

export default function PdfUploadPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-8">Upload PDF to Assistant</h1>
      <PdfUploadForm />
    </div>
  );
} 