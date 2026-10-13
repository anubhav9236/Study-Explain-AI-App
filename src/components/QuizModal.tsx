'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, ChevronRight, ChevronLeft, RotateCcw, Award } from 'lucide-react'

interface QuizQuestion {
  question: string
  options: string[] | string
  correctAnswer: string
  explanation: string
}

interface QuizModalProps {
  quizQuestions: QuizQuestion[]
  onClose: () => void
}

export default function QuizModal({ quizQuestions, onClose }: QuizModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({})
  const [isFinished, setIsFinished] = useState(false)

  if (!quizQuestions || quizQuestions.length === 0) {
    return (
      <Card className="max-w-xl mx-auto border-border">
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">No quiz questions available.</p>
          <Button onClick={onClose} className="mt-4">
            Close
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Calculate score dynamically based on user selections
  const score = Object.entries(userAnswers).reduce((acc, [indexStr, answer]) => {
    const idx = parseInt(indexStr, 10)
    if (quizQuestions[idx] && quizQuestions[idx].correctAnswer === answer) {
      return acc + 1
    }
    return acc
  }, 0)

  const answeredCount = Object.keys(userAnswers).length

  const handleAnswerSelect = (option: string) => {
    if (userAnswers[currentIndex] !== undefined) return
    setUserAnswers((prev) => ({
      ...prev,
      [currentIndex]: option,
    }))
  }

  const handleNext = () => {
    if (currentIndex < quizQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const handleRestart = () => {
    setUserAnswers({})
    setCurrentIndex(0)
    setIsFinished(false)
  }

  if (isFinished) {
    const percent = Math.round((score / quizQuestions.length) * 100)
    return (
      <Card className="max-w-xl mx-auto shadow-lg border-border">
        <CardHeader className="text-center pb-2">
          <Award className="w-16 h-16 mx-auto text-primary mb-2" />
          <CardTitle className="text-2xl font-bold">Quiz Complete!</CardTitle>
          <CardDescription>Performance summary for this session</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="py-2">
            <div className="text-5xl font-extrabold text-primary mb-2">
              {score} / {quizQuestions.length}
            </div>
            <Badge variant={percent >= 70 ? 'default' : 'secondary'} className="text-sm px-3 py-1">
              {percent}% Correct
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {percent === 100
              ? 'Outstanding! You have mastered this concept.'
              : percent >= 70
              ? 'Great job! You have a solid grasp on the main concepts.'
              : 'Review the explanation and try again to improve your score.'}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" onClick={handleRestart}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake Quiz
            </Button>
            <Button onClick={() => setIsFinished(false)}>
              Review Answers
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentQuestion = quizQuestions[currentIndex]
  // Parse options safely whether array or string
  let options: string[] = []
  if (Array.isArray(currentQuestion.options)) {
    options = currentQuestion.options
  } else if (typeof currentQuestion.options === 'string') {
    try {
      options = JSON.parse(currentQuestion.options)
    } catch {
      options = []
    }
  }

  const selectedAnswer = userAnswers[currentIndex]
  const isAnswered = selectedAnswer !== undefined

  return (
    <Card className="max-w-2xl mx-auto shadow-md border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Quiz Challenge</CardTitle>
          <Badge variant="outline" className="text-xs">
            Question {currentIndex + 1} of {quizQuestions.length}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>Score: <strong className="text-foreground">{score}</strong> / {answeredCount} answered</span>
          <span>{Math.round((answeredCount / quizQuestions.length) * 100)}% Completed</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-base font-semibold mb-4 leading-relaxed text-foreground">
            {currentQuestion.question}
          </h3>
          <div className="space-y-2.5">
            {options.map((option, index) => {
              const isSelected = selectedAnswer === option
              const isCorrectOption = option === currentQuestion.correctAnswer

              let buttonStyle = 'border-border hover:bg-accent'
              if (isAnswered) {
                if (isCorrectOption) {
                  buttonStyle = 'bg-emerald-600 hover:bg-emerald-600 text-white border-emerald-600 font-medium'
                } else if (isSelected && !isCorrectOption) {
                  buttonStyle = 'bg-rose-600 hover:bg-rose-600 text-white border-rose-600 font-medium'
                } else {
                  buttonStyle = 'opacity-60 border-border'
                }
              }

              return (
                <Button
                  key={index}
                  variant="outline"
                  className={`w-full justify-start text-left h-auto py-3 px-4 transition-all duration-150 ${buttonStyle}`}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={isAnswered}
                >
                  <span className="flex-1 whitespace-normal break-words">{option}</span>
                  {isAnswered && isCorrectOption && (
                    <CheckCircle className="h-5 w-5 ml-2 shrink-0 text-white" />
                  )}
                  {isAnswered && isSelected && !isCorrectOption && (
                    <XCircle className="h-5 w-5 ml-2 shrink-0 text-white" />
                  )}
                </Button>
              )
            })}
          </div>
        </div>

        {isAnswered && (
          <div className="bg-muted/70 border border-border p-4 rounded-xl space-y-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Explanation
            </h4>
            <p className="text-sm text-foreground leading-relaxed">
              {currentQuestion.explanation}
            </p>
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentIndex === quizQuestions.length - 1 ? (
            <Button
              onClick={() => setIsFinished(true)}
              disabled={!isAnswered}
            >
              Finish & View Score
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!isAnswered}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
