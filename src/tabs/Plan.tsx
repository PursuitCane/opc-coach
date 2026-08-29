import { useEffect, useState } from 'react'
import { useAppStore, useCurrentProject } from '../store'
import { generatePlan, generatePlanQuestions } from '../prompts/plan'
import { MarkdownView } from '../components/MarkdownView'
import { archiveProject } from '../lib/archive'

export function Plan() {
  const project = useCurrentProject()
  const planStage = useAppStore((s) => s.planStage)
  const setPlanStage = useAppStore((s) => s.setPlanStage)
  const setPlanQuestions = useAppStore((s) => s.setPlanQuestions)
  const setPlanAnswer = useAppStore((s) => s.setPlanAnswer)
  const setPlan = useAppStore((s) => s.setPlan)

  const [loadingQ, setLoadingQ] = useState(false)
  const [error, setError] = useState('')

  // 首次进入 & 无题目 → 生成
  useEffect(() => {
    if (!project?.analysis) return
    if (project.planQuestions !== null) return
    if (loadingQ) return
    setLoadingQ(true)
    setError('')
    const pid = project.id
    generatePlanQuestions(project.name, project.analysis, project.files)
      .then((qs) => setPlanQuestions(pid, qs))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoadingQ(false))
  }, [project?.analysis, project?.planQuestions, project?.name, project?.files, setPlanQuestions, loadingQ])

  if (!project) return null

  const handleGenerate = async () => {
    if (!project.analysis || !project.planQuestions) return
    setPlanStage('gen')
    setError('')
    try {
      const plan = await generatePlan(
        project.name,
        project.analysis,
        project.files,
        project.planQuestions,
        project.planAnswers,
      )
      setPlan(plan)
      void archiveProject({
        projectId: project.id,
        projectName: project.name,
        files: project.files,
        analysis: project.analysis,
        messages: project.messages,
        planQuestions: project.planQuestions,
        planAnswers: project.planAnswers,
        plan,
      }).catch((error) => {
        console.warn('商业计划归档失败：', error)
      })
      setPlanStage('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPlanStage('form')
    }
  }

  if (planStage === 'gen') {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 420 }}>
        <div style={{ width: 400, textAlign: 'center' }}>
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
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 17, marginBottom: 8 }}>
            正在把你的回答织进计划
          </div>
          <div style={{ fontSize: 12.5, color: '#75798c', marginBottom: 18 }}>
            合并 {project.files.length} 份材料 · 4 条补充回答 ·{' '}
            {project.plan ? '上一版计划' : '首次生成'}
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
                animation: 'opcBar 8s ease-out forwards',
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (planStage === 'done' && project.plan) {
    return <PlanDone />
  }

  // form
  return (
    <div style={{ maxWidth: 880, marginInline: 'auto', animation: 'opcFade .3s both' }}>
      <h4 style={{ margin: '0 0 6px', fontSize: 19, fontFamily: 'var(--font-heading)' }}>
        补齐六项前置信息，我来优化完整的商业计划
      </h4>
      <p style={{ fontSize: 13.5, color: '#9397ab', margin: '0 0 8px', lineHeight: 1.7 }}>
        这些是材料里读不到、又绕不过去的信息。写得越具体，计划越能拿去用。
      </p>

      {loadingQ && (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            fontSize: 13,
            color: '#75798c',
          }}
        >
          正在找出你项目最缺的 4 个信息…
        </div>
      )}
      {error && (
        <div style={{ padding: 14, fontSize: 12.5, color: '#f4a5a5' }}>⚠️ {error}</div>
      )}

      {project.planQuestions && (
        <>
          <PlanProgress
            answered={project.planAnswers.filter((x) => x?.trim()).length}
            total={project.planQuestions.length}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {project.planQuestions.map((q, i) => {
              const filled = project.planAnswers[i]?.trim()
              return (
                <div
                  key={i}
                  style={{
                    padding: '18px 20px',
                    borderRadius: 12,
                    background: '#232532',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      marginBottom: 10,
                      alignItems: 'flex-start',
                    }}
                  >
                    <span
                      className={filled ? 'tag tag-accent' : 'tag tag-neutral'}
                      style={{ flex: 'none' }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 14.5, fontWeight: 500 }}>{q.question}</span>
                  </div>
                  <textarea
                    className="input"
                    style={{ minHeight: 64 }}
                    value={project.planAnswers[i] || ''}
                    onChange={(e) => setPlanAnswer(i, e.target.value)}
                    placeholder="没有精确数据也没关系，先写下来。"
                  />
                  <div style={{ fontSize: 11.5, color: '#75798c', marginTop: 7 }}>
                    {q.hint}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
            <button
              className="btn btn-primary"
              style={{ height: 38 }}
              onClick={handleGenerate}
            >
              生成优化后的商业计划
            </button>
            <button className="btn btn-ghost" onClick={handleGenerate}>
              先跳过剩下的
            </button>
            <span style={{ fontSize: 11.5, color: '#595d6c' }}>
              跳过的部分会在计划里标为「待补充」
            </span>
          </div>
        </>
      )}
    </div>
  )
}

function PlanProgress({ answered, total }: { answered: number; total: number }) {
  const [isPinned, setIsPinned] = useState(false)

  useEffect(() => {
    const updatePinnedState = () => setIsPinned(window.scrollY > 0)

    updatePinnedState()
    window.addEventListener('scroll', updatePinnedState, { passive: true })
    return () => window.removeEventListener('scroll', updatePinnedState)
  }, [])

  const progress = (answered / total) * 100
  const content = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        maxWidth: 880,
        marginInline: 'auto',
      }}
    >
      <div
        role="progressbar"
        aria-label="回答进度"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={answered}
        style={{
          flex: 1,
          maxWidth: 360,
          minWidth: 0,
          height: 7,
          borderRadius: 4,
          background: 'rgba(145,132,217,.16)',
          border: '1px solid rgba(145,132,217,.22)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            borderRadius: 4,
            background: 'var(--color-accent)',
            transition: 'width 0.3s',
          }}
        />
      </div>
      <span style={{ fontSize: 11.5, color: '#75798c' }}>
        已回答 {answered} / {total}
      </span>
    </div>
  )

  return (
    <>
      <div style={{ height: 18, marginBottom: 22 }}>{!isPinned && content}</div>
      {isPinned && (
        <div
          style={{
            position: 'fixed',
            top: 88,
            left: 0,
            right: 0,
            zIndex: 15,
            padding: '8px 34px',
            background: 'rgba(19,21,35,.94)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid var(--color-divider)',
          }}
        >
          {content}
        </div>
      )}
    </>
  )
}

function PlanDone() {
  const project = useCurrentProject()
  const setPlanStage = useAppStore((s) => s.setPlanStage)
  const setTab = useAppStore((s) => s.setTab)
  const [activeIdx, setActiveIdx] = useState(0)

  if (!project?.plan) return null
  const { plan } = project

  return (
    <div style={{ maxWidth: 1100, marginInline: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 18 }}>
        <div>
          <h4 style={{ margin: '0 0 3px', fontSize: 19, fontFamily: 'var(--font-heading)' }}>
            商业计划 v2
          </h4>
          <div style={{ fontSize: 12, color: '#75798c' }}>
            {plan.toc.filter((t) => t.flag === '新增').length} 章新增 ·{' '}
            {plan.toc.filter((t) => t.flag === '已改写').length} 章改写 · 刚刚生成
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 9 }}>
          <button className="btn btn-secondary" onClick={() => setPlanStage('form')}>
            回到补充信息
          </button>
          <button className="btn btn-primary" onClick={() => setTab('chat')}>
            和教练过一遍
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '196px 1fr',
          gap: 22,
          alignItems: 'start',
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: 104,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {plan.toc.map((s, i) => {
            const active = i === activeIdx
            return (
              <button
                key={s.no}
                onClick={() => setActiveIdx(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 9px',
                  borderRadius: 7,
                  fontSize: 12.5,
                  color: active ? 'var(--color-accent)' : '#b2b6ca',
                  background: active ? 'rgba(145,132,217,.12)' : 'transparent',
                  border: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 10.5, color: '#595d6c', width: 14 }}>{s.no}</span>
                {s.label}
                {s.flag && (
                  <span
                    className={
                      s.flag === '待补充' ? 'tag tag-neutral' : 'tag tag-accent'
                    }
                    style={{ marginLeft: 'auto', padding: '1px 6px', fontSize: 9.5 }}
                  >
                    {s.flag}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div
          style={{
            padding: '26px 30px',
            borderRadius: 12,
            background: '#232532',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {plan.sections[activeIdx] && (
            <>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  color: 'var(--color-accent)',
                  marginBottom: 8,
                }}
              >
                第 {plan.sections[activeIdx].no} 章 · {plan.sections[activeIdx].label}
              </div>
              <MarkdownView>{plan.sections[activeIdx].markdown}</MarkdownView>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
