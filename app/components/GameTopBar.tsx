import { PlayerBadge } from "./PlayerBadge";
import { RoundControls } from "./RoundControls";
import { formatTime, GAME_DURATION_SECONDS, questionName, type AnswerState, type PlayChoice, type Player, type Question } from "@/lib/game";

type GameTopBarProps = {
  player: Player | null;
  choice: PlayChoice;
  question: Question | undefined;
  answerState: AnswerState;
  answers: AnswerState[];
  questionCount: number;
  remainingQuestionSeconds: number;
  remainingGameSeconds: number;
  score: number;
  onPlay: (choice: PlayChoice) => void;
  onSignOut: () => void;
};

function timeTone(remainingGameSeconds: number, tones: [danger: string, warning: string, calm: string]) {
  if (remainingGameSeconds <= 10) return tones[0];
  if (remainingGameSeconds <= 30) return tones[1];
  return tones[2];
}

/** Oyun sırasında haritaya azami alan bırakmak için tüm durum bilgisini tek satırda toplar. */
export function GameTopBar({
  player,
  choice,
  onPlay,
  question,
  answerState,
  answers,
  questionCount,
  remainingQuestionSeconds,
  remainingGameSeconds,
  score,
  onSignOut,
}: GameTopBarProps) {
  return (
    <header className="shrink-0 border-b border-slate-200 bg-white">
      {/* Üç sütun: soru adı, yanlardaki içerik ne kadar geniş olursa olsun tam ortada kalır. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 py-2 lg:gap-6 lg:px-5 lg:py-3">
        <div className="flex min-w-0 items-center">
          <PlayerBadge align="left" onSignOut={onSignOut} player={player} size="sm" />
        </div>

        <div className="flex min-w-0 items-center justify-center gap-2 lg:gap-3">
          <h1 className="truncate text-center text-xl leading-tight font-bold tracking-tight text-cyan-700 lg:text-3xl">
            {question && questionName(question)}
          </h1>
          {answerState && (
            <span className="shrink-0 rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-cyan-800 lg:text-xs">
              Sonraki: {remainingQuestionSeconds} sn
            </span>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 lg:gap-5">
          <div aria-label="Soru ilerlemesi" className="hidden shrink-0 items-center gap-1 md:flex">
            {Array.from({ length: questionCount }, (_, index) => (
              <span
                className={`h-2 w-3 rounded-full lg:w-4 ${answers[index] === "correct" ? "bg-emerald-500" : answers[index] === "incorrect" ? "bg-rose-500" : "bg-slate-200"}`}
                key={index}
              />
            ))}
          </div>

          <p className="shrink-0 text-sm font-bold text-slate-900 tabular-nums lg:text-xl">
            {score}
            <span className="text-slate-400">/{questionCount}</span>
          </p>

          <p className={`shrink-0 text-sm font-bold tabular-nums lg:text-xl ${timeTone(remainingGameSeconds, ["text-rose-600", "text-amber-600", "text-slate-600"])}`}>
            {formatTime(remainingGameSeconds)}
          </p>

          <RoundControls choice={choice} onPlay={onPlay} />
        </div>
      </div>

      <div
        aria-label="Kalan süre"
        aria-valuemax={GAME_DURATION_SECONDS}
        aria-valuemin={0}
        aria-valuenow={remainingGameSeconds}
        className="h-1 w-full bg-slate-100"
        role="progressbar"
      >
        <div
          className={`h-full transition-[width] duration-300 ease-linear ${timeTone(remainingGameSeconds, ["bg-rose-500", "bg-amber-500", "bg-cyan-500"])}`}
          style={{ width: `${(remainingGameSeconds / GAME_DURATION_SECONDS) * 100}%` }}
        />
      </div>
    </header>
  );
}
