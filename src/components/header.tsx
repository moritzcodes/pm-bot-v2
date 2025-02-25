import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { IconSeparator, IconVercel } from '@/components/ui/icons'
import EnvCard from './cards/envcard'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">PM Bot</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/upload" className="transition-colors hover:text-foreground/80">
              Upload
            </Link>
            <Link href="/transcriptions" className="transition-colors hover:text-foreground/80">
              Transcriptions
            </Link>
            <Link href="/" className="transition-colors hover:text-foreground/80">
              Chat
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
