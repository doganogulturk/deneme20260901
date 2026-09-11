export type PlayButtonTone = "green" | "red";

const BASE =
  "sweep inline-flex items-center gap-1.5 rounded-full py-2 pr-3 pl-4 text-sm font-bold text-slate-800 shadow-sm transition-all duration-200 hover:gap-3 hover:shadow-md active:scale-95 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-wait disabled:opacity-50 disabled:hover:gap-1.5 disabled:hover:shadow-sm";

const TONE: Record<PlayButtonTone, string> = {
  green: "sweep-green hover:text-emerald-700 hover:shadow-emerald-500/20 focus-visible:ring-emerald-300",
  red: "sweep-red hover:text-rose-700 hover:shadow-rose-500/20 focus-visible:ring-rose-300",
};

type PlayButtonProps = {
  label: string;
  tone?: PlayButtonTone;
  disabled?: boolean;
  onClick: () => void;
};

export function PlayButton({ label, tone = "green", disabled = false, onClick }: PlayButtonProps) {
  return (
    <button className={`${BASE} ${TONE[tone]}`} disabled={disabled} onClick={onClick} type="button">
      {label}
      <svg aria-hidden="true" className="h-4 w-4 transition-transform duration-200" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
