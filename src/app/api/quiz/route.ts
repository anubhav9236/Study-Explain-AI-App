import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function generateFallbackQuiz(explanation: string): Array<{
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
}> {
  return [
    {
      question: 'What is the primary objective of understanding this topic conceptually?',
      options: [
        'To memorize without practical application',
        'To understand core invariants, structure, and operational efficiency',
        'To ignore time and space constraints',
        'To avoid using standard abstractions',
      ],
      correctAnswer: 'To understand core invariants, structure, and operational efficiency',
      explanation: 'Grasping foundational principles and invariants is critical for analyzing complexity and real-world system behavior.',
    },
    {
      question: 'Under standard conditions, how does this mechanism achieve efficiency?',
      options: [
        'By avoiding all memory allocations',
        'Through hierarchical structuring and reducing the search/traversal space',
        'By performing brute-force iterations over all elements',
        'By running completely without validation',
      ],
      correctAnswer: 'Through hierarchical structuring and reducing the search/traversal space',
      explanation: 'Organized structures reduce operational search spaces (often from O(n) down to O(log n)).',
    },
    {
      question: 'What is a critical consideration when answering exam questions about this topic?',
      options: [
        'Only write code comments without answers',
        'State formal definitions, trade-offs, and edge case behaviors',
        'Skip complexity analysis',
        'Never mention worst-case scenarios',
      ],
      correctAnswer: 'State formal definitions, trade-offs, and edge case behaviors',
      explanation: 'Exams look for clear definitions, analytical complexity comparisons, and edge-case awareness.',
    },
  ]
}

export async function POST(request: Request) {
  try {
    const { sessionId, explanation, apiKey: clientApiKey } = await request.json()

    if (!explanation) {
      return NextResponse.json({ error: 'Explanation is required' }, { status: 400 })
    }

    const apiKey = clientApiKey || process.env.GEMINI_API_KEY
    let quizQuestions: Array<{
      question: string
      options: string[]
      correctAnswer: string
      explanation: string
    }> = []

    if (apiKey && apiKey !== 'your_gemini_api_key_here') {
      try {
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

        const prompt = `Based on the following explanation, create 3-5 multiple-choice quiz questions to test understanding. Return the response as a valid JSON array with this exact structure:
[
  {
    "question": "The question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "The exact text of the correct option",
    "explanation": "Brief explanation of why this is the correct answer"
  }
]

Explanation:
${explanation}

Return ONLY the raw JSON array without markdown formatting.`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        // Clean response to extract JSON
        const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()
        const jsonMatch = cleaned.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          quizQuestions = JSON.parse(jsonMatch[0])
        }
      } catch (e) {
        console.warn('Gemini quiz generation fallback:', e)
      }
    }

    if (!quizQuestions || quizQuestions.length === 0) {
      quizQuestions = generateFallbackQuiz(explanation)
    }

    // Save to database if sessionId is provided and exists
    if (sessionId) {
      try {
        await prisma.quizQuestion.createMany({
          data: quizQuestions.map((q: any) => ({
            sessionId,
            question: q.question,
            options: typeof q.options === 'string' ? q.options : JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
          })),
        })
      } catch (dbError) {
        console.warn('Failed to save quiz questions to db:', dbError)
      }
    }

    return NextResponse.json({ quizQuestions })
  } catch (error) {
    console.error('Error generating quiz:', error)
    return NextResponse.json(
      { error: 'Failed to generate quiz' },
      { status: 500 }
    )
  }
}
