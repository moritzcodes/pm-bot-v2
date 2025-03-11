import { ProductTermsManager } from '@/components/settings/ProductTermsManager';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Product Terms - Settings',
  description: 'Configure product terms to improve transcription accuracy'
};

export default function ProductTermsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Product Terms Configuration</h1>
      <p className="text-muted-foreground mb-6">
        Add product names and terminology to improve transcription accuracy with our AI.
        These terms will be used to help the AI better recognize specific product names and industry terminology.
      </p>
      <ProductTermsManager />
    </>
  );
} 