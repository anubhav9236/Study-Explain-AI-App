'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import {
  BookOpen,
  Brain,
  Lightbulb,
  MessageSquare,
  History,
  Settings,
  Moon,
  Sun,
  Sparkles,
  Download,
  Copy,
  PlusCircle,
  Trash2,
  Check,
  AlertCircle,
  Key,
} from 'lucide-react'
import ExplanationViewer from '@/components/ExplanationViewer'
import FlashcardDeck from '@/components/FlashcardDeck'
import QuizModal from '@/components/QuizModal'

interface StudySessionItem {
  id: string
  topic: string
  subject: string
  mode: string
  content: string
  createdAt: string
  flashcards?: any[]
  quizQuestions?: any[]
}

export default function Home() {
  const [darkMode, setDarkMode] = useState(false)
  const [activeTab, setActiveTab] = useState<'input' | 'explanation' | 'flashcards' | 'quiz'>('input')
  const [selectedMode, setSelectedMode] = useState<'eli5' | 'exam' | 'visual'>('eli5')
  const [topic, setTopic] = useState('')
  const [context, setContext] = useState('')
  const [content, setContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [flashcards, setFlashcards] = useState<any[]>([])
  const [quizQuestions, setQuizQuestions] = useState<any[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [sessions, setSessions] = useState<StudySessionItem[]>([])
  const [copied, setCopied] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [demoNotice, setDemoNotice] = useState<string | null>(null)

  const quickTags = [
    'Binary Search Trees',
    'TCP/IP Protocol Suite',
    'HashMap Implementation',
    'Virtual Memory & Paging',
    'Relational Database Normalization',
    'Gradient Descent & Neural Networks',
  ]

  // Initialize theme, API key and load sessions from database
  useEffect(() => {
    // Check saved dark mode or system preference
    const savedTheme = localStorage.getItem('study_theme')
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    } else {
      setDarkMode(false)
      document.documentElement.classList.remove('dark')
    }

    // Load saved API key
    const savedKey = localStorage.getItem('gemini_api_key') || ''
    setApiKey(savedKey)

    // Load sessions from database
    fetchSessions()
  }, [])

  const toggleDarkMode = () => {
    const nextMode = !darkMode
    setDarkMode(nextMode)
    if (nextMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('study_theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('study_theme', 'light')
    }
  }

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions')
      if (res.ok) {
        const data = await res.json()
        setSessions(data)
      }
    } catch (e) {
      console.warn('Failed to load past sessions:', e)
    }
  }

  const handleSelectSession = (s: StudySessionItem) => {
    setCurrentSessionId(s.id)
    setTopic(s.topic)
    setContent(s.content)
    setSelectedMode((s.mode as any) || 'eli5')
    setFlashcards(s.flashcards || [])
    setQuizQuestions(s.quizQuestions || [])
    setErrorMessage(null)
    setActiveTab('explanation')
  }

  const handleNewSession = () => {
    setCurrentSessionId(null)
    setTopic('')
    setContext('')
    setContent('')
    setFlashcards([])
    setQuizQuestions([])
    setErrorMessage(null)
    setActiveTab('input')
  }

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/sessions?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id))
        if (currentSessionId === id) {
          handleNewSession()
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }

  const handleGenerate = async () => {
    if (!topic.trim()) return
    setIsGenerating(true)
    setErrorMessage(null)
    setDemoNotice(null)

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          mode: selectedMode,
          context,
          apiKey: apiKey.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to generate explanation')
      }

      setContent(data.content)
      if (data.notice) {
        setDemoNotice(data.notice)
      }

      // Automatically switch to explanation tab so the user sees the generated study guide
      setActiveTab('explanation')

      // Save to database
      let newSessionId: string | null = null
      try {
        const sessionRes = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            subject: 'Computer Science',
            mode: selectedMode,
            content: data.content,
          }),
        })
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json()
          newSessionId = sessionData.id
          setCurrentSessionId(sessionData.id)
          // Refresh sessions list
          fetchSessions()
        }
      } catch (dbErr) {
        console.warn('Session persistence error:', dbErr)
      }

      // Generate flashcards and quiz
      generateFlashcards(newSessionId, data.content)
      generateQuiz(newSessionId, data.content)
    } catch (error: any) {
      console.error('Error generating explanation:', error)
      setErrorMessage(error.message || 'Something went wrong while generating the explanation.')
    } finally {
      setIsGenerating(false)
    }
  }

  const generateFlashcards = async (sessionId: string | null, explanation: string) => {
    try {
      const response = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          explanation,
          apiKey: apiKey.trim() || undefined,
        }),
      })

      const data = await response.json()
      if (data.flashcards) {
        setFlashcards(data.flashcards)
      }
    } catch (error) {
      console.error('Error generating flashcards:', error)
    }
  }

  const generateQuiz = async (sessionId: string | null, explanation: string) => {
    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          explanation,
          apiKey: apiKey.trim() || undefined,
        }),
      })

      const data = await response.json()
      if (data.quizQuestions) {
        setQuizQuestions(data.quizQuestions)
      }
    } catch (error) {
      console.error('Error generating quiz:', error)
    }
  }

  const handleTagClick = (tag: string) => {
    setTopic(tag)
  }

  const handleCopyMarkdown = () => {
    if (!content) return
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportPDF = () => {
    window.print()
  }

  const handleSaveApiKey = () => {
    localStorage.setItem('gemini_api_key', apiKey.trim())
    setShowSettings(false)
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 border-r border-border bg-card/60 backdrop-blur p-4 flex flex-col shrink-0 no-print">
        <div className="flex items-center gap-3 mb-6 px-1">
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">StudyExplain AI</h1>
            <p className="text-xs text-muted-foreground">Smart Study Companion</p>
          </div>
        </div>

        <Button
          onClick={handleNewSession}
          variant="outline"
          className="w-full mb-4 justify-start border-dashed border-border hover:border-primary/50"
        >
          <PlusCircle className="h-4 w-4 mr-2 text-primary" />
          New Study Session
        </Button>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            <span className="flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" />
              Recent Sessions
            </span>
            <span>{sessions.length}</span>
          </div>

          <ScrollArea className="flex-1 pr-1">
            <div className="space-y-2">
              {sessions.length === 0 ? (
                <div className="text-xs text-muted-foreground p-4 text-center border border-dashed rounded-lg">
                  No sessions yet. Type a topic and click Generate!
                </div>
              ) : (
                sessions.map((s) => {
                  const isActive = currentSessionId === s.id
                  return (
                    <Card
                      key={s.id}
                      onClick={() => handleSelectSession(s)}
                      className={`p-3 cursor-pointer group transition-all duration-150 border-border hover:border-primary/40 ${
                        isActive ? 'bg-primary/10 border-primary/50 shadow-sm' : 'hover:bg-accent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-xs leading-snug truncate flex-1">
                          {s.topic}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={(e) => handleDeleteSession(e, s.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-muted-foreground truncate">
                          {s.subject}
                        </span>
                        <Badge variant="secondary" className="text-[10px] uppercase font-mono px-1.5 py-0">
                          {s.mode}
                        </Badge>
                      </div>
                    </Card>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="border-b border-border bg-card/40 backdrop-blur p-4 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-foreground">
              {topic ? topic : 'Study Workspace'}
            </h2>
            <Badge variant="secondary" className="text-xs font-normal">
              Mode: {selectedMode.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Settings">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-primary" />
                    Settings & API Key
                  </DialogTitle>
                  <DialogDescription>
                    Configure your Google Gemini API key to generate custom explanations with full AI power.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                      Gemini API Key
                    </label>
                    <Input
                      type="password"
                      placeholder="AIzaSy..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      Your key is kept safe locally in your browser storage or configured in <code>.env</code>.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setShowSettings(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveApiKey}>
                      Save Settings
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
            </Button>
          </div>
        </header>

        {/* Workspace Body */}
        <div className="flex-1 p-6 overflow-auto">
          {errorMessage && (
            <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold">Notice</div>
                <div>{errorMessage}</div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => setShowSettings(true)}
              >
                Set API Key
              </Button>
            </div>
          )}

          {demoNotice && (
            <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <span>{demoNotice}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs font-medium text-primary hover:text-primary"
                onClick={() => setShowSettings(true)}
              >
                Add Key
              </Button>
            </div>
          )}

          <Tabs
            value={activeTab}
            onValueChange={(val: any) => setActiveTab(val)}
            className="h-full flex flex-col"
          >
            <TabsList className="mb-5 no-print self-start bg-muted/80 p-1 rounded-xl">
              <TabsTrigger value="input" className="px-4 py-1.5 text-xs font-medium rounded-lg">
                Input Topic
              </TabsTrigger>
              <TabsTrigger value="explanation" className="px-4 py-1.5 text-xs font-medium rounded-lg">
                Explanation & Diagrams
              </TabsTrigger>
              <TabsTrigger value="flashcards" className="px-4 py-1.5 text-xs font-medium rounded-lg">
                Flashcards {flashcards.length > 0 && `(${flashcards.length})`}
              </TabsTrigger>
              <TabsTrigger value="quiz" className="px-4 py-1.5 text-xs font-medium rounded-lg">
                Quiz {quizQuestions.length > 0 && `(${quizQuestions.length})`}
              </TabsTrigger>
            </TabsList>

            {/* Input Tab */}
            <TabsContent value="input" className="space-y-4 max-w-4xl">
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Concept Explainer</CardTitle>
                  <CardDescription>
                    Enter a computer science or academic topic to generate structured explanations, visual diagrams, flashcards, and quizzes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                      Explanation Mode
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Button
                        type="button"
                        variant={selectedMode === 'eli5' ? 'default' : 'outline'}
                        onClick={() => setSelectedMode('eli5')}
                        className="h-auto py-3 px-4 flex flex-col items-start gap-1"
                      >
                        <div className="flex items-center font-semibold text-sm">
                          <Lightbulb className="h-4 w-4 mr-2 shrink-0" />
                          ELI5
                        </div>
                        <span className="text-[11px] font-normal opacity-80 text-left">
                          Simple analogies & plain English
                        </span>
                      </Button>

                      <Button
                        type="button"
                        variant={selectedMode === 'exam' ? 'default' : 'outline'}
                        onClick={() => setSelectedMode('exam')}
                        className="h-auto py-3 px-4 flex flex-col items-start gap-1"
                      >
                        <div className="flex items-center font-semibold text-sm">
                          <Brain className="h-4 w-4 mr-2 shrink-0" />
                          Exam-Oriented
                        </div>
                        <span className="text-[11px] font-normal opacity-80 text-left">
                          Academic definitions, trade-offs & Q&As
                        </span>
                      </Button>

                      <Button
                        type="button"
                        variant={selectedMode === 'visual' ? 'default' : 'outline'}
                        onClick={() => setSelectedMode('visual')}
                        className="h-auto py-3 px-4 flex flex-col items-start gap-1"
                      >
                        <div className="flex items-center font-semibold text-sm">
                          <BookOpen className="h-4 w-4 mr-2 shrink-0" />
                          Visual / Diagram
                        </div>
                        <span className="text-[11px] font-normal opacity-80 text-left">
                          Mermaid flowcharts & architectural breakdown
                        </span>
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                      Topic or Concept
                    </label>
                    <Input
                      placeholder="e.g. Binary Search Trees, TCP 3-Way Handshake, Dynamic Programming..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isGenerating && topic.trim()) {
                          handleGenerate()
                        }
                      }}
                      className="text-base py-5"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                      Popular Quick Topics
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {quickTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors py-1 px-3 text-xs"
                          onClick={() => handleTagClick(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                      Additional Context (Optional)
                    </label>
                    <Textarea
                      placeholder="Add syllabus focus, specific exam questions, or key constraints..."
                      rows={3}
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !topic.trim()}
                    className="w-full py-6 text-base font-semibold shadow-md"
                  >
                    {isGenerating ? (
                      <>
                        <Sparkles className="h-5 w-5 mr-2 animate-spin" />
                        Generating Explanation & Study Materials...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Generate Complete Study Guide
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Explanation Tab */}
            <TabsContent value="explanation" className="flex-1">
              <Card className="border-border shadow-sm">
                <CardHeader className="no-print">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-lg">
                        {topic ? topic : 'Explanation & Notes'}
                      </CardTitle>
                      <CardDescription>
                        Clear study guide with formatted markdown and diagrams
                      </CardDescription>
                    </div>
                    {content && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyMarkdown}
                          className="text-xs"
                        >
                          {copied ? (
                            <>
                              <Check className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 mr-1.5" />
                              Copy Markdown
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExportPDF}
                          className="text-xs"
                        >
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          Print / Export PDF
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {content ? (
                    <div className="p-2">
                      <ExplanationViewer content={content} />
                    </div>
                  ) : (
                    <div className="text-center py-16 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-40" />
                      <p className="text-sm font-medium">No explanation generated yet.</p>
                      <p className="text-xs opacity-75 mt-1">
                        Go to the Input Topic tab, enter a concept, and click Generate!
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 text-xs"
                        onClick={() => setActiveTab('input')}
                      >
                        Go to Input
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Flashcards Tab */}
            <TabsContent value="flashcards">
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Interactive Flashcards</CardTitle>
                  <CardDescription>
                    Test your memory and recall key definitions from this session
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2 pb-8">
                  {flashcards.length > 0 ? (
                    <FlashcardDeck flashcards={flashcards} />
                  ) : (
                    <div className="text-center py-16 text-muted-foreground">
                      <Brain className="h-12 w-12 mx-auto mb-4 opacity-40" />
                      <p className="text-sm font-medium">Flashcards are not yet generated.</p>
                      <p className="text-xs opacity-75 mt-1">
                        Generate an explanation or select a session from the sidebar to review flashcards.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Quiz Tab */}
            <TabsContent value="quiz">
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Knowledge Check Quiz</CardTitle>
                  <CardDescription>
                    Multiple-choice questions to evaluate your understanding
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2 pb-8">
                  {quizQuestions.length > 0 ? (
                    <QuizModal
                      quizQuestions={quizQuestions}
                      onClose={() => setActiveTab('explanation')}
                    />
                  ) : (
                    <div className="text-center py-16 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-40" />
                      <p className="text-sm font-medium">No quiz questions generated yet.</p>
                      <p className="text-xs opacity-75 mt-1">
                        Generate an explanation or select an existing session from the sidebar.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
