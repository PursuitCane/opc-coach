import { useEffect, useRef, useState } from 'react'
import { useAppStore, useCurrentProject } from '../store'
import { evaluateProject } from '../prompts/analysis'
import { archiveProject } from '../lib/archive'
import { trackAnalysisRequest } from '../lib/analysisRequest'

const STEPS = [
  '正在提取材料的结构…',
  '正在读客户访谈里的原话…',
  '正在核对财务与数据…',
  '正在生成五维评分…',
  '正在挑出该继续追问你的问题…',
]
const ANALYSIS_TIMEOUT_MS = 5 * 60_000

export function Creating() {
  const project = useCurrentProject()
  const setAnalysis = useAppStore((s) => s.setAnalysis)
  const setPlanQuestions = useAppStore((s) => s.setPlanQuestions)
  const setScreen = useAppStore((s) => s.setScreen)
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const startedRef = useRef(false)

  useEffect(() => {
    if (!project) return
    if (startedRef.current) return
    startedRef.current = true

    // 步骤文案定时切换
    const stepTimer = setInterval(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1))
    }, 900)
    const controller = new AbortController()
    const timeoutTimer = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS)

    // 后台真调 AI（一次请求同时拿到分析 + 计划补齐题）
    const isFirst = !project.analysis
    trackAnalysisRequest(
      project.id,
      () => evaluateProject(project.name, project.files, isFirst, controller.signal),
    )
      .then(({ analysis, planQuestions }) => {
        setAnalysis(project.id, analysis)
        if (planQuestions.length > 0) setPlanQuestions(project.id, planQuestions)
        void archiveProject({
          projectId: project.id,
          projectName: project.name,
          files: project.files,
          analysis,
          analysisRun: true,
          messages: project.messages,
          planQuestions,
          planAnswers: project.planAnswers,
          plan: project.plan,
        }).catch((error) => {
          console.warn('分析结果归档失败：', error)
        })
        // 让进度条走完再落地
        setTimeout(() => {
          clearInterval(stepTimer)
          setScreen('app')
        }, 600)
      })
      .catch((e) => {
        clearInterval(stepTimer)
        setError(
          controller.signal.aborted
            ? '分析请求超过 5 分钟没有返回，可能是网络或 AI 接口异常，请重试。'
            : e instanceof Error
              ? e.message
              : String(e),
        )
      })
      .finally(() => {
        clearTimeout(timeoutTimer)
      })

    return () => {
      clearInterval(stepTimer)
      clearTimeout(timeoutTimer)
    }
  }, [project, setAnalysis, setPlanQuestions, setScreen])

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div style={{ width: 460, textAlign: 'center' }}>
        {error ? (
          <ErrorPane
            error={error}
            onRetry={() => {
              startedRef.current = false
              setError('')
              setStep(0)
            }}
            onBack={() => setScreen('empty')}
          />
        ) : (
          <>
            <div
              style={{
                width: 34,
                height: 34,
                margin: '0 auto 20px',
                border: '2px solid rgba(145,132,217,.25)',
                borderTopColor: 'var(--color-accent)',
                borderRadius: '50%',
                animation: 'opcSpin .9s linear infinite',
              }}
            />
            <div
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 17,
                marginBottom: 8,
              }}
            >
              正在读你的材料
            </div>
            <div style={{ fontSize: 11.5, color: '#9397ab', marginBottom: 5 }}>
              请不要关闭页面，稍等几分钟
            </div>
            <div style={{ fontSize: 12.5, color: '#75798c', marginBottom: 18 }}>
              {STEPS[step]}
            </div>
            <div
              style={{
                height: 3,
                borderRadius: 3,
                background: '#2b2741',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: 'var(--color-accent)',
                  width: `${((step + 1) / STEPS.length) * 100}%`,
                  transition: 'width 0.6s',
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ErrorPane({
  error,
  onRetry,
  onBack,
}: {
  error: string
  onRetry: () => void
  onBack: () => void
}) {
  return (
    <div>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 10 }}>
        分析出了点问题
      </div>
      <div
        style={{
          fontSize: 12.5,
          color: '#b2b6ca',
          marginBottom: 22,
          lineHeight: 1.7,
        }}
      >
        {error}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button className="btn btn-secondary" onClick={onBack}>
          回到上传
        </button>
        <button className="btn btn-primary" onClick={onRetry}>
          再试一次
        </button>
      </div>
    </div>
  )
}
