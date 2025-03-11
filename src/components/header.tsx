'use client';

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { IconSeparator, IconVercel } from '@/components/ui/icons'
import EnvCard from './cards/envcard'
import { Settings } from 'lucide-react'

export function Header() {
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">PM Bot</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/upload" className="transition-colors hover:text-foreground/80">
              Upload
            </Link>
            <Link href="/pdf-upload" className="transition-colors hover:text-foreground/80">
              PDF Upload
            </Link>
            <Link href="/transcriptions" className="transition-colors hover:text-foreground/80">
              Transcriptions
            </Link>
            <Link href="/" className="transition-colors hover:text-foreground/80">
              Chat
            </Link>
          </nav>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setSettingsOpen(!settingsOpen)} 
            className="flex items-center p-2 rounded-md hover:bg-muted"
            aria-expanded={settingsOpen}
            aria-haspopup="true"
          >
            <Settings size={18} className="mr-1" />
            <span className="text-sm">Settings</span>
          </button>
          
          {settingsOpen && (
            <div 
              className="absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-lg z-50 overflow-hidden"
              onBlur={() => setSettingsOpen(false)}
            >
              <Link 
                href="/settings" 
                className="block px-4 py-2 text-sm hover:bg-muted"
                onClick={() => setSettingsOpen(false)}
              >
                General Settings
              </Link>
              <Link 
                href="/settings/product-terms" 
                className="block px-4 py-2 text-sm hover:bg-muted"
                onClick={() => setSettingsOpen(false)}
              >
                Product Terms
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
