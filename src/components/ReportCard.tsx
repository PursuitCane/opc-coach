import { DIMENSIONS, type EvaluationReport } from '../lib/schema'
import { ScoreRadar } from './ScoreRadar'

function scoreColor(score: number): string {
  if (score >= 8) return '#16a34a'
  if (score >= 5) return '#d97706'
  return '#dc2626'
}

export function ReportCard({ report }: { report: EvaluationReport }) {
  return (
    <div className="report">
      <div className="report-head">
        <div className="overall">
          <span className="overall-num" style={{ color: scoreColor(report.overallScore) }}>
            {report.overallScore.toFixed(1)}
          </span>
          <span className="overall-max">/ 10</span>
        </div>
        <p className="summary">{report.summary}</p>
      </div>

      <ScoreRadar report={report} />

      <div className="dims">
        {DIMENSIONS.map((d) => {
          const item = report.dimensions.find((x) => x.key === d.key)
          if (!item) return null
          return (
            <div className="dim" key={d.key}>
              <div className="dim-head">
                <span className="dim-label">{d.label}</span>
                <span className="dim-score" style={{ color: scoreColor(item.score) }}>
                  {item.score} / 10
                </span>
              </div>
              <p className="dim-strength">✅ {item.strengths}</p>
              <p className="dim-improve">🔧 {item.improvements}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
