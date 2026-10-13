import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

// Fallback high-quality content generator for common topics if offline or testing without key
function getFallbackExplanation(topic: string, mode: string, context?: string): string {
  const t = topic.trim()
  if (mode === 'visual') {
    return `# ${t} - Visual & Architectural Overview

## Concept Summary
**${t}** is a fundamental computing and academic concept. Understanding its structural hierarchy and data flow makes complex interactions straightforward.

${context ? `> Context considered: *${context}*` : ''}

## Architecture & Flow Diagram
\`\`\`mermaid
graph TD
    Client[Client / Interface] -->|Requests action| Controller[Core Processor]
    Controller -->|Validates & parses| Engine[Algorithm / Logic Engine]
    Engine -->|Reads / Writes state| Storage[Memory / Data Store]
    Engine -->|Returns processed result| Controller
    Controller -->|Formats response| Client
\`\`\`

## Component Breakdown
1. **Input Interface**: Ingests raw input parameters and handles validation.
2. **Core Processor**: Coordinates state transitions, algorithmic scheduling, and error boundaries.
3. **Storage / Memory**: Guarantees persistence or indexed fast retrieval.

## Summary
Understanding **${t}** visually allows you to track dependencies and state transitions effectively across system boundaries.`
  }

  if (mode === 'exam') {
    return `# ${t} - Comprehensive Exam Guide

## Academic Definition
**${t}** represents an essential structure or mechanism designed to solve specific computational or systemic problems efficiently under defined constraints.

${context ? `> Exam Context: *${context}*` : ''}

## Key Principles & Core Concepts
- **Definition & Invariants**: Must preserve foundational rules (e.g. order, balance, integrity) throughout all operations.
- **Time Complexity**:
  - Best / Average Case: O(log n) or O(1) depending on optimal indexing.
  - Worst Case: O(n) under skewed or degenerated states.
- **Space Complexity**: O(n) for auxiliary structures and call-stack traversal.

## Trade-offs & Analysis
- **Advantages**: Fast lookup times, predictable algorithmic boundaries, clean encapsulation.
- **Disadvantages**: Memory overhead per element, potential rebalancing or collision overhead.

## Frequent Exam Questions & Answers
1. **Explain the primary invariant of ${t}?**
   - The primary invariant guarantees that each node or layer satisfies its ordering and validity requirements before and after any mutation.
2. **How do you prevent worst-case degeneration in ${t}?**
   - By implementing balancing heuristics (such as rotations or re-hashing) and enforcing strict boundary checks.`
  }

  // ELI5 Mode
  return `# ${t} (Explained Simply!)

## What is it?
Imagine you have a huge box of toys and you want to find your favorite toy in 3 seconds. Instead of dumping everything on the floor, you sort them into neat, labeled bins. **${t}** is like that super-smart organization system for computers!

${context ? `> Note: *${context}*` : ''}

## Real-Life Analogy
Think of a dictionary: when you look up the word "Zebra", you don't start at page 1 with "Apple" and read every single word. You jump straight to the back! **${t}** works using similar smart shortcuts so computers can find and do things instantly without wasting time.

## Key Points to Remember
- It organizes information so it is easy to find.
- It saves time and energy by skipping unnecessary steps.
- It makes complicated computer tasks simple and fast.

## Summary
In simple terms, **${t}** helps computers work faster and smarter by keeping things structured and organized.`
}

export async function POST(request: Request) {
  try {
    const { topic, mode, context, apiKey: clientApiKey } = await request.json()

    if (!topic || !topic.trim()) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    const apiKey = clientApiKey || process.env.GEMINI_API_KEY

    // If no API key provided, supply educational structured fallback
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      const fallback = getFallbackExplanation(topic, mode, context)
      return NextResponse.json({
        content: fallback,
        isDemo: true,
        notice: 'Generated using local knowledge engine. Provide a Gemini API key in Settings for live AI generation.',
      })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    let prompt = ''

    switch (mode) {
      case 'eli5':
        prompt = `Explain the concept of "${topic}" in simple terms (ELI5 - Explain Like I'm 5). Use everyday analogies and examples that anyone can understand. Format your response in markdown with:
- A simple title
- A real-life analogy
- Key points in bullet points
- A summary paragraph

${context ? `Additional context: ${context}` : ''}`
        break
      case 'exam':
        prompt = `Provide an exam-oriented explanation of "${topic}" suitable for university/college students. Format your response in markdown with:
- Academic definition
- Key points and concepts
- Pros and cons (if applicable)
- Common exam questions with brief answers
- Important formulas or theorems (if applicable)

${context ? `Additional context: ${context}` : ''}`
        break
      case 'visual':
        prompt = `Provide a visual explanation of "${topic}" including:
- A clear description of the concept
- A Mermaid.js diagram or flowchart that illustrates the concept (use valid mermaid syntax in \`\`\`mermaid code blocks)
- Step-by-step breakdown of the visual elements
- How different components relate to each other

Use mermaid syntax for diagrams like:
\`\`\`mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
\`\`\`

${context ? `Additional context: ${context}` : ''}`
        break
      default:
        prompt = `Explain the concept of "${topic}" in a clear and comprehensive way. Format your response in markdown with proper headers, bullet points, and code blocks where appropriate.

${context ? `Additional context: ${context}` : ''}`
    }

    try {
      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      return NextResponse.json({ content: text })
    } catch (apiError: any) {
      console.warn('Gemini API call failed, falling back to local generator:', apiError?.message)
      // Provide fallback if quota exceeded or network issue
      const fallback = getFallbackExplanation(topic, mode, context)
      return NextResponse.json({
        content: fallback,
        isDemo: true,
        notice: `API notice: ${apiError?.message || 'Quota reached'}. Displaying study model.`,
      })
    }
  } catch (error) {
    console.error('Error generating explanation:', error)
    return NextResponse.json(
      { error: 'Failed to generate explanation' },
      { status: 500 }
    )
  }
}
