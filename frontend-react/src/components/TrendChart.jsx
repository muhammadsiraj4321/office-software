import React from 'react'

export default function TrendChart({ labels = [], income = [], expenses = [] }){
  const width = 640
  const height = 220
  const padding = { left: 36, right: 12, top: 12, bottom: 28 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const maxVal = Math.max(1, ...income, ...expenses)
  const scaleX = (i) => (i / Math.max(1, labels.length - 1)) * innerW
  const scaleY = (v) => innerH - (v / maxVal) * innerH

  const toPath = (arr) => arr.map((v, i) => `${i === 0 ? 'M' : 'L'} ${padding.left + scaleX(i)} ${padding.top + scaleY(v)}`).join(' ')

  const gridY = 4
  const ticks = Array.from({ length: gridY + 1 }, (_, i) => Math.round((i * maxVal) / gridY))

  return (
    <div className="card">
      <div className="mb-2 text-sm text-slate-600">Monthly Income vs Expense</div>
      <svg width={width} height={height} className="w-full">
        {/* grid */}
        {ticks.map((t, i) => {
          const y = padding.top + scaleY(t)
          return <line key={i} x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e5e7eb" />
        })}
        {/* axes */}
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#94a3b8" />
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#94a3b8" />
        {/* labels X */}
        {labels.map((lab, i) => (
          <text key={i} x={padding.left + scaleX(i)} y={height - 8} textAnchor="middle" fontSize="10" fill="#64748b">{lab}</text>
        ))}
        {/* labels Y */}
        {ticks.map((t, i) => (
          <text key={i} x={padding.left - 6} y={padding.top + scaleY(t)} textAnchor="end" fontSize="10" fill="#64748b">{t}</text>
        ))}
        {/* lines */}
        <path d={toPath(expenses)} fill="none" stroke="#ef4444" strokeWidth="2" />
        <path d={toPath(income)} fill="none" stroke="#22c55e" strokeWidth="2" />
      </svg>
      <div className="mt-2 flex items-center gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-1 bg-green-500 inline-block"/> Income</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-1 bg-red-500 inline-block"/> Expense</span>
      </div>
    </div>
  )
}
