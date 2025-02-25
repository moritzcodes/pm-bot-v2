import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
    })

    // Create database record
    const transcription = await prisma.transcription.create({
      data: {
        filename: file.name,
        content: await file.text(),
        fileSize: file.size,
        mimeType: file.type,
        status: 'pending'
      }
    })

    return NextResponse.json({
      id: transcription.id,
      filename: transcription.filename,
      uploadedAt: transcription.uploadedAt,
      status: transcription.status
    })
  } catch (error) {
    console.error('Upload failed:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
} 