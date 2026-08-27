import { useState } from 'react'
import './App.css'
import { extractPdfText } from './lib/pdf'
import { evaluateBP, askAdvisor, optimizeBP } from './lib/ai'
import type { ChatMessage, EvaluationReport } from './lib/schema'
import { ReportCard } from './components/ReportCard'
import { Chat } from './components/Chat'
import ReactMarkdown from 'react-markdown'

type Stage = 'upload' | 'report'

export default function App() {
  const [stage, setStage] = useState<Stage>('upload')
  const [bpText, setBpText] = useState('')
  const [report, setReport] = useState<EvaluationReport | null>(null)
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [optimized, setOptimized] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const handleFile = async (file: File) => {
    setError('')
    setBusy('解析 PDF 并评估中…')
    try {
      const text = await extractPdfText(file)
      setBpText(text)
      const rep = await evaluateBP(text)
      setReport(rep)
      setStage('report')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy('')
    }
  }

  const handleAsk = async (question: string) => {
    setError('')
    const next = [...history, { role: 'user' as const, content: question }]
    setHistory(next)
    setBusy('ask')
    try {
      const answer = await askAdvisor(bpText, history, question)
      setHistory([...next, { role: 'assistant', content: answer }])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy('')
    }
  }

  const handleOptimize = async () => {
    setError('')
    setBusy('产出优化 BP 中…')
    try {
      const md = await optimizeBP(bpText, history)
      setOptimized(md)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy('')
    }
  }

  const downloadOptimized = () => {
    const blob = new Blob([optimized], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '优化后的BP.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>OPC 军师</h1>
        <span className="tagline">投资人视角的 BP 诊断与优化</span>
      </header>

      {error && <div className="error">⚠️ {error}</div>}

      {stage === 'upload' && (
        <section className="upload">
          <div className="upload-card">
            <h2>上传你的商业计划书（PDF）</h2>
            <p className="upload-sub">军师会按红杉六维度打分、点评，并陪你把它改得更好。</p>
            <label className="upload-btn">
              {busy || '选择 PDF 文件'}
              <input
                type="file"
                accept="application/pdf"
                disabled={!!busy}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
            </label>
          </div>
        </section>
      )}

      {stage === 'report' && report && (
        <section className="workspace">
          <div className="col col-report">
            <ReportCard report={report} />
          </div>
          <div className="col col-side">
            <Chat history={history} onAsk={handleAsk} loading={busy === 'ask'} />
            <div className="optimize">
              <button className="primary" onClick={handleOptimize} disabled={!!busy}>
                {busy && busy !== 'ask' ? busy : '产出优化后的 BP'}
              </button>
              {optimized && (
                <div className="optimized">
                  <div className="optimized-head">
                    <h3>优化后的 BP</h3>
                    <button onClick={downloadOptimized}>下载 .md</button>
                  </div>
                  <div className="optimized-body">
                    <ReactMarkdown>{optimized}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
