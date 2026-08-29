// 五维雷达图：照抄 HTML 稿的坐标系，把 5 个点动态算出来。
import type { DimScore } from '../store/types'

interface Props {
  dims: DimScore[] // 期望长度 5，按 market/customer/model/moat/acquisition 顺序
  lastDims?: DimScore[] // 上次分数，画虚线对比
}

const CX = 200
const CY = 190
const R = 130 // 100 分对应半径
// 五维标签相对雷达的锚点（沿用稿子里的坐标）
const LABELS = [
  { x: 208, y: 50, anchor: 'middle' as const },
  { x: 312, y: 132, anchor: 'start' as const },
  { x: 290, y: 298, anchor: 'start' as const },
  { x: 128, y: 298, anchor: 'end' as const },
  { x: 88, y: 132, anchor: 'end' as const },
]

// 五个方向的单位向量（顶部开始，顺时针）
function unit(i: number): [number, number] {
  const angle = (-Math.PI / 2) + (i * 2 * Math.PI) / 5
  return [Math.cos(angle), Math.sin(angle)]
}

function point(value: number, i: number): [number, number] {
  const [ux, uy] = unit(i)
  const r = (R * Math.max(0, Math.min(100, value))) / 100
  return [CX + ux * r, CY + uy * r]
}

function ringPoints(pct: number): string {
  return Array.from({ length: 5 }, (_, i) => {
    const [x, y] = point(pct, i)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

function polyPoints(dims: DimScore[]): string {
  return dims
    .slice(0, 5)
    .map((d, i) => {
      const [x, y] = point(d.value, i)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export function RadarChart({ dims, lastDims }: Props) {
  const currentPoly = polyPoints(dims)
  const lastPoly = lastDims && lastDims.length === 5 ? polyPoints(lastDims) : null

  return (
    <svg viewBox="0 0 400 344" style={{ width: '94%', display: 'block', margin: '4px auto 0' }}>
      <g transform="translate(8 10) translate(200 190) scale(.874) translate(-200 -190)">
        {/* 底层网格：4 圈 + 5 条辐线 */}
        <g fill="none" stroke="#3f424d" strokeWidth={1}>
          <polygon points={ringPoints(100)} />
          <polygon points={ringPoints(75)} />
          <polygon points={ringPoints(50)} />
          <polygon points={ringPoints(25)} />
          {Array.from({ length: 5 }, (_, i) => {
            const [x, y] = point(100, i)
            return <line key={i} x1={CX} y1={CY} x2={x} y2={y} />
          })}
        </g>

        {/* 上次（虚线） */}
        {lastPoly && (
          <polygon
            points={lastPoly}
            fill="none"
            stroke="#595d6c"
            strokeWidth={1.2}
            strokeDasharray="4 4"
          />
        )}

        {/* 本次 */}
        <polygon
          points={currentPoly}
          fill="rgba(145,132,217,.22)"
          stroke="#9184d9"
          strokeWidth={1.8}
        />
        <g fill="#9184d9">
          {dims.slice(0, 5).map((d, i) => {
            const [x, y] = point(d.value, i)
            return <circle key={d.key} cx={x} cy={y} r={3} />
          })}
        </g>

      </g>

      {/* 标签单独定位，避免调整文字时带动雷达图 */}
      <g fontFamily="Inter, sans-serif" fontSize="11.5" fill="#cfd3e5">
        {dims.slice(0, 5).map((d, i) => {
          const lbl = LABELS[i]
          return (
            <text key={d.key} x={lbl.x} y={lbl.y} textAnchor={lbl.anchor}>
              <tspan x={lbl.x} dy="0">
                {d.label}
              </tspan>
              <tspan x={lbl.x} dy="16" fill="#9184d9">
                {d.value}
              </tspan>
            </text>
          )
        })}
      </g>
    </svg>
  )
}
