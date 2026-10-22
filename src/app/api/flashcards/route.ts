import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function generateFallbackFlashcards(explanation: string): Array<{ question: string; answer: string }> {
  const cards: Array<{ question: string; answer: string }> = []
  const lines = explanation.split('\n')
  let currentHeader = ''
  let currentSection = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#')) {
      if (currentHeader && currentSection) {
        cards.push({
          question: `What is the significance of: ${currentHeader}?`,
          answer: currentSection.slice(0, 200).trim(),
        })
      }
      currentHeader = trimmed.replace(/^#+\s*/, '')
      currentSection = ''
    } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const bullet = trimmed.replace(/^[-*]\s*/, '')
      if (bullet.includes(':')) {
        const [term, ...def] = bullet.split(':')
        if (term.length < 50 && def.join(':').trim().length > 10) {
          cards.push({
            question: `Define / Explain: ${term.trim()}`,
            answer: def.join(':').trim(),
          })
        }
      } else {
        currentSection += ' ' + bullet
      }
    } else if (trimmed.length > 0) {
      currentSection += ' ' + trimmed
    }
  }

  if (currentHeader && currentSection && cards.length < 5) {
    cards.push({
      question: `Key summary for: ${currentHeader}`,
      answer: currentSection.slice(0, 200).trim(),
    })
  }

  // Ensure at least 3 cards
  if (cards.length === 0) {
    return [
      {
        question: 'What is the main concept discussed in this lesson?',
        answer: 'The core mechanism and definitions outlined in the study guide.',
      },
      {
        question: 'What are the key advantages or invariants?',
        answer: 'Optimal time complexity and predictable behavior under operational constraints.',
      },
      {
        question: 'How should you prepare this topic for exams or interviews?',
        answer: 'Master the formal definition, time/space trade-offs, and boundary edge cases.',
      },
    ]
  }

  return cards.slice(0, 6)
}

export async function POST(request: Request) {
  try {
    const { sessionId, explanation, apiKey: clientApiKey } = await request.json()

    if (!explanation) {
      return NextResponse.json({ error: 'Explanation is required' }, { status: 400 })
    }

    const apiKey = clientApiKey || process.env.GEMINI_API_KEY
    let flashcards: Array<{ question: string; answer: string }> = []

    if (apiKey && apiKey !== 'your_gemini_api_key_here') {
      try {
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

        const prompt = `Based on the following explanation, extract 5-8 key concepts or definitions and create flashcards. Return the response as a valid JSON array with this exact structure:
[
  {
    "question": "The question or term to define",
    "answer": "The answer or definition"
  }
]

Explanation:
${explanation}

Return ONLY the raw JSON array without markdown formatting.`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        // Clean text to extract JSON
        const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()
        const jsonMatch = cleaned.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          flashcards = JSON.parse(jsonMatch[0])
        }
      } catch (e) {
        console.warn('Gemini flashcard generation fallback:', e)
      }
    }

    if (!flashcards || flashcards.length === 0) {
      flashcards = generateFallbackFlashcards(explanation)
    }

    // Save to database if sessionId is valid and exists
    if (sessionId) {
      try {
        await prisma.flashcard.createMany({
          data: flashcards.map((card: any) => ({
            sessionId,
            question: String(card.question || ''),
            answer: String(card.answer || ''),
          })),
        })
      } catch (dbError) {
        console.warn('Failed to save flashcards to db:', dbError)
      }
    }

    return NextResponse.json({ flashcards })
  } catch (error) {
    console.error('Error in flashcards endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to generate flashcards' },
      { status: 500 }
    )
  }
}
