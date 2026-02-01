import type { ReactNode } from 'react'

export type SegmentedOption<T extends string> = Readonly<{
  value: T
  label: ReactNode
}>

export default function Segmented<T extends string>(props: {
  value: T
  options: readonly SegmentedOption<T>[]
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-lg bg-white/5 p-1 ring-1 ring-white/10">
      {props.options.map((o) => {
        const active = o.value === props.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => props.onChange(o.value)}
            className={
              'px-2.5 py-1 text-xs font-medium transition rounded-md ' +
              (active
                ? 'bg-white/15 text-slate-100'
                : 'text-slate-300 hover:bg-white/10 hover:text-slate-100')
            }
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
