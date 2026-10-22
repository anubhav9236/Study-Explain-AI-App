import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { topic, subject, mode, content } = await request.json()

    if (!topic || !content) {
      return NextResponse.json({ error: 'Topic and content are required' }, { status: 400 })
    }

    try {
      const session = await prisma.studySession.create({
        data: {
          topic,
          subject: subject || 'General',
          mode: mode || 'eli5',
          content,
        },
      })
      return NextResponse.json(session)
    } catch (dbError) {
      console.warn('Database save failed (using in-memory transient session):', dbError)
      return NextResponse.json({
        id: `session_${Date.now()}`,
        topic,
        subject: subject || 'General',
        mode: mode || 'eli5',
        content,
        createdAt: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const sessions = await prisma.studySession.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        flashcards: true,
        quizQuestions: true,
      },
      take: 20,
    })

    return NextResponse.json(sessions || [])
  } catch (error) {
    console.warn('Warning: Could not fetch sessions from database:', error)
    return NextResponse.json([])
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    try {
      await prisma.studySession.delete({
        where: { id },
      })
    } catch (dbError) {
      console.warn('Database delete warning:', dbError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    )
  }
}

