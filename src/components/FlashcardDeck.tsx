'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, RotateCcw, Sparkles } from 'lucide-react'

interface Flashcard {
  question: string
  answer: string
}

interface FlashcardDeckProps {
  flashcards: Flashcard[]
}

export default function FlashcardDeck({ flashcards }: FlashcardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (currentIndex < flashcards.length - 1) {
          setIsFlipped(false)
          setCurrentIndex((prev) => prev + 1)
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (currentIndex > 0) {
          setIsFlipped(false)
          setCurrentIndex((prev) => prev - 1)
        }
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setIsFlipped((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, flashcards.length])

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No flashcards available.</p>
      </div>
    )
  }

  const currentCard = flashcards[currentIndex]

  const handleNext = () => {
    setIsFlipped(false)
    setCurrentIndex((prev) => Math.min(prev + 1, flashcards.length - 1))
  }

  const handlePrevious = () => {
    setIsFlipped(false)
    setCurrentIndex((prev) => Math.max(prev - 1, 0))
  }

  const handleFlip = () => {
    setIsFlipped((prev) => !prev)
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs px-2.5 py-1">
          Card {currentIndex + 1} of {flashcards.length}
        </Badge>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Use Space to flip, Arrows to switch
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCurrentIndex(0)
              setIsFlipped(false)
            }}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Restart
          </Button>
        </div>
      </div>

      <div className="relative h-80 perspective-1000 select-none">
        <div
          className="w-full h-full relative transition-transform duration-500 cursor-pointer"
          onClick={handleFlip}
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front: Question */}
          <Card
            className="absolute inset-0 w-full h-full border border-border shadow-md hover:shadow-lg transition-all flex flex-col justify-between p-7 bg-card rounded-2xl"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              <span>Question</span>
              <span className="text-primary flex items-center gap-1 font-medium lowercase">
                <Sparkles className="h-3.5 w-3.5" /> Click card to flip
              </span>
            </div>
            <div className="flex-1 flex items-center justify-center py-4 px-2">
              <p className="text-xl md:text-2xl font-semibold text-center text-foreground leading-relaxed">
                {currentCard.question}
              </p>
            </div>
            <div className="text-center text-xs text-muted-foreground">
              Tap or press Space to reveal answer
            </div>
          </Card>

          {/* Back: Answer */}
          <Card
            className="absolute inset-0 w-full h-full border border-primary/40 shadow-md hover:shadow-lg transition-all flex flex-col justify-between p-7 bg-primary/5 rounded-2xl"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-primary">
              <span>Answer</span>
              <span className="font-normal lowercase">Click to return to question</span>
            </div>
            <div className="flex-1 flex items-center justify-center py-4 px-2 overflow-y-auto">
              <p className="text-lg md:text-xl text-center text-foreground font-medium leading-relaxed">
                {currentCard.answer}
              </p>
            </div>
            <div className="text-center text-xs text-muted-foreground">
              Tap or press Space to flip back
            </div>
          </Card>
        </div>
      </div>

      <div className="flex justify-center items-center gap-3 pt-2">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <Button
          variant="default"
          onClick={handleFlip}
          className="min-w-[130px]"
        >
          {isFlipped ? 'Show Question' : 'Show Answer'}
        </Button>
        <Button
          variant="outline"
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
