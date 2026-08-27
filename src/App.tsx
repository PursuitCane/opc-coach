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
  const [pasteMode, setPasteMode] = useState(false)
  const [pasteText, setPasteText] = useState('')

  const runEvaluation = async (text: string) => {
    setBpText(text)
    const rep = await evaluateBP(text)
    setReport(rep)
    setStage('report')
  }

  const handleFile = async (file: File) => {
    setError('')
    setBusy('解析 PDF 并评估中…')
    try {
      const text = await extractPdfText(file)
      await runEvaluation(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy('')
    }
  }

  const handlePasteSubmit = async (text: string) => {
    const t = text.trim()
    if (t.length < 20) {
      setError('文本太短，贴一份完整点的 BP 内容。')
      return
    }
    setError('')
    setBusy('评估中…')
    try {
      await runEvaluation(t)
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

  const printOptimized = () => {
    // 走浏览器原生打印引擎导 PDF：中文清晰、矢量、零额外依赖
    // 打印样式（@media print）只保留 .optimized 区块
    window.print()
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

            {!pasteMode ? (
              <>
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
                <p className="paste-toggle">
                  扫描件或没有 PDF？
                  <button onClick={() => setPasteMode(true)} disabled={!!busy}>
                    直接粘贴文本
                  </button>
                </p>
              </>
            ) : (
              <div className="paste-box">
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="把商业计划书内容粘贴到这里…"
                  rows={10}
                  disabled={!!busy}
                />
                <div className="paste-actions">
                  <button
                    className="paste-back"
                    onClick={() => setPasteMode(false)}
                    disabled={!!busy}
                  >
                    ← 返回上传 PDF
                  </button>
                  <button
                    className="upload-btn inline"
                    onClick={() => handlePasteSubmit(pasteText)}
                    disabled={!!busy || !pasteText.trim()}
                  >
                    {busy || '开始评估'}
                  </button>
                </div>
              </div>
            )}
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
                <div className="optimized" id="print-area">
                  <div className="optimized-head no-print">
                    <h3>优化后的 BP</h3>
                    <button onClick={printOptimized}>下载 PDF</button>
                  </div>
                  <div className="print-title">
                    <h1>优化后的商业计划书</h1>
                    <span>由 OPC 军师生成</span>
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
