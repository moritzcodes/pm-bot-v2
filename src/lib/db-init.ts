import { prisma } from './prisma'

export async function initializeDatabase() {
  try {
    // Test database connection
    await prisma.$connect()
    console.log('Database connected successfully')

    // Create initial test data if needed
    const transcriptionCount = await prisma.transcription.count()
    if (transcriptionCount === 0) {
      console.log('Initializing test data...')
      await createTestData()
    }
  } catch (error) {
    console.error('Database initialization failed:', error)
    throw error
  }
}

async function createTestData() {
  const testTranscription = await prisma.transcription.create({
    data: {
      filename: 'test-meeting.txt',
      content: 'This is a test meeting transcription.',
      fileSize: 1024,
      mimeType: 'text/plain',
      summaries: {
        create: {
          content: 'Test summary of the meeting.',
          productMentions: ['Product A', 'Product B'],
          verificationStatus: 'pending',
          enrichedData: {
            marketTrends: ['Trend 1', 'Trend 2'],
            customerInsights: ['Insight 1'],
            meetingReferences: ['REF-001']
          }
        }
      }
    }
  })

  console.log('Test data created:', testTranscription)
} 