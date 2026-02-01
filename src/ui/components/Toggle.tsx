export default function Toggle(props: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-slate-300 select-none">
      <span className="whitespace-nowrap">{props.label}</span>
      <button
        type="button"
        onClick={() => props.onChange(!props.checked)}
        className={
          'relative h-5 w-9 rounded-full transition ring-1 ring-white/10 ' +
          (props.checked ? 'bg-emerald-500/70' : 'bg-white/10')
        }
        aria-pressed={props.checked}
      >
        <span
          className={
            'absolute top-0.5 h-4 w-4 rounded-full bg-white transition ' +
            (props.checked ? 'left-[18px]' : 'left-0.5')
          }
        />
      </button>
    </label>
  )
}
