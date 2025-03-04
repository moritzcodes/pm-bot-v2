import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Configure your PM Bot settings'
};

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your PM Bot settings and preferences
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        <div className="md:col-span-1">
          <nav className="space-y-2">
            <Link 
              href="/settings/product-terms" 
              className="block px-3 py-2 rounded-md hover:bg-muted"
            >
              Product Terms
            </Link>
            <Link 
              href="/settings" 
              className="block px-3 py-2 rounded-md hover:bg-muted"
            >
              General
            </Link>
          </nav>
        </div>
        
        <div className="md:col-span-4">
          {children}
        </div>
      </div>
    </div>
  );
} 