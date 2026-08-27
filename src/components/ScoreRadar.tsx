import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts'
import { DIMENSIONS, type EvaluationReport } from '../lib/schema'

export function ScoreRadar({ report }: { report: EvaluationReport }) {
  const data = DIMENSIONS.map((d) => ({
    dimension: d.label,
    score: report.dimensions.find((x) => x.key === d.key)?.score ?? 0,
  }))

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="#d4d4d8" />
          <PolarAngleAxis dataKey="dimension" tick={{ fill: '#3f3f46', fontSize: 13 }} />
          <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
          <Radar
            name="评分"
            dataKey="score"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
