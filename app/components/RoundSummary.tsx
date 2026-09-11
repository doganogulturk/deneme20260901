import { formatTime, GAME_MODES, MODE_COPY, type GameMode } from "@/lib/game";

type RoundSummaryProps = {
  mode: GameMode;
  score: number;
  questionCount: number;
  bestStreak: number;
  durationMs: number;
  onRestart: (mode: GameMode) => void;
};

export function RoundSummary({ mode, score, questionCount, bestStreak, durationMs, onRestart }: RoundSummaryProps) {
  return (
    <>
      <div>
        <p className="text-[10px] font-semibold tracking-[0.2em] text-cyan-700 uppercase lg:text-xs">Tur tamamlandı</p>
        <p className="mt-1 text-3xl font-bold tabular-nums lg:mt-2 lg:text-5xl">
          {score}
          <span className="text-lg text-slate-400 lg:text-2xl">/{questionCount}</span>
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-600 lg:text-sm">En uzun seri: {bestStreak}</p>
        <p className="text-xs font-semibold tabular-nums text-slate-600 lg:text-sm">Süre: {formatTime(Math.round(durationMs / 1000))}</p>
      </div>

      <div className="flex flex-col gap-1.5 lg:gap-3">
        {GAME_MODES.map((option) => (
          <button
            className={`w-full rounded-xl px-3 py-2 text-xs font-bold transition focus:ring-2 focus:ring-cyan-300 focus:outline-none lg:py-4 lg:text-base ${mode === option ? "bg-cyan-600 text-white hover:bg-cyan-500" : "border border-cyan-600 text-cyan-700 hover:bg-cyan-50"}`}
            key={option}
            onClick={() => onRestart(option)}
            type="button"
          >
            {MODE_COPY[option].tabLabel} haritası
          </button>
        ))}
      </div>
    </>
  );
}
