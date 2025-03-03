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

    // Upload to Vercel Blob for backup/original file storage
    const blob = await put(file.name, file, {
      access: 'public',
    })

    // Get the actual content based on file type
    let content = ''
    if (file.type === 'text/plain') {
      content = await file.text()
    } else {
      // For audio/video, we store the blob URL and will transcribe later
      content = blob.url
    }

    // Create database record
    const transcription = await prisma.transcription.create({
      data: {
        filename: file.name,
        content: content,
        fileSize: file.size,
        mimeType: file.type,
        status: file.type === 'text/plain' ? 'processed' : 'pending'
      }
    })

    return NextResponse.json({
      id: transcription.id,
      filename: transcription.filename,
      uploadedAt: transcription.uploadedAt,
      status: transcription.status,
      blobUrl: blob.url
    })
  } catch (error) {
    console.error('Upload failed:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const transcriptions = await prisma.transcription.findMany({
      orderBy: { uploadedAt: 'desc' }
    });

    return NextResponse.json(transcriptions);
  } catch (error) {
    console.error('Failed to fetch transcriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcriptions' },
      { status: 500 }
    );
  }
} 