'use client'

import React, { useState, useEffect, useId } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import mermaid from 'mermaid'

interface MermaidBlockProps {
  chart: string
}

function MermaidBlock({ chart }: MermaidBlockProps) {
  const [svg, setSvg] = useState<string>('')
  const [hasError, setHasError] = useState(false)
  const uniqueId = useId().replace(/[^a-zA-Z0-9]/g, '_')
  const diagramId = `mermaid_${uniqueId}`

  useEffect(() => {
    let isCancelled = false

    const renderChart = async () => {
      try {
        const isDark = document.documentElement.classList.contains('dark')
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'neutral',
          securityLevel: 'loose',
          fontFamily: 'inherit',
        })

        // Clean chart input
        const cleanChart = chart.trim()
        const { svg: renderedSvg } = await mermaid.render(diagramId, cleanChart)
        if (!isCancelled) {
          setSvg(renderedSvg)
          setHasError(false)
        }
      } catch (err) {
        console.warn('Mermaid rendering notice:', err)
        if (!isCancelled) {
          setHasError(true)
        }
      }
    }

    renderChart()

    return () => {
      isCancelled = true
    }
  }, [chart, diagramId])

  if (hasError) {
    return (
      <div className="my-4 rounded-xl border border-border p-4 bg-muted/40 font-mono text-xs">
        <div className="text-muted-foreground font-semibold mb-2 flex items-center gap-2">
          <span>Flowchart / Diagram Definition</span>
        </div>
        <pre className="overflow-x-auto text-foreground p-2 rounded bg-card">
          <code>{chart}</code>
        </pre>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="my-4 p-4 text-center text-xs text-muted-foreground animate-pulse border border-border rounded-lg">
        Rendering diagram...
      </div>
    )
  }

  return (
    <div
      className="mermaid my-6 flex justify-center overflow-x-auto p-4 rounded-xl border border-border bg-card shadow-sm"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

interface ExplanationViewerProps {
  content: string
}

export default function ExplanationViewer({ content }: ExplanationViewerProps) {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''

            if (language === 'mermaid') {
              return <MermaidBlock chart={String(children).replace(/\n$/, '')} />
            }

            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
