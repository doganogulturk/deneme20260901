import { Leaderboard } from "./Leaderboard";
import { PlayButton } from "./PlayButton";
import { PlayerBadge } from "./PlayerBadge";
import { formatTime, type BoardId, type PlayChoice, type Player } from "@/lib/game";
import { type Leaderboards } from "@/lib/hooks/useLeaderboard";

type ResultScreenProps = {
  player: Player | null;
  playedBoardId: BoardId;
  score: number;
  questionCount: number;
  bestStreak: number;
  durationMs: number;
  leaderboards: Leaderboards;
  boardId: BoardId;
  leaderboardError: string | null;
  onBoardChange: (boardId: BoardId) => void;
  onPlay: (choice: PlayChoice) => void;
  onSignOut: () => void;
};

export function ResultScreen({
  player,
  playedBoardId,
  score,
  questionCount,
  bestStreak,
  durationMs,
  leaderboards,
  boardId,
  leaderboardError,
  onBoardChange,
  onPlay,
  onSignOut,
}: ResultScreenProps) {
  // Sıralamadaki satır en yüksek puanlı tura ait; süresi bu turunkinden uzun olabilir.
  const personalBest = leaderboards[playedBoardId].find((entry) => entry.user_id === player?.id);
  const stats = [
    {
      label: "Puan",
      value: `${score}/${questionCount}`,
      best: personalBest ? `En iyi ${personalBest.score}/${questionCount}` : null,
    },
    { label: "En uzun seri", value: String(bestStreak), best: null },
    {
      label: "Süre",
      value: formatTime(Math.round(durationMs / 1000)),
      best: personalBest ? `En yüksek puanlı tur ${formatTime(Math.round(personalBest.duration_ms / 1000))}` : null,
    },
  ];

  return (
    <section className="my-auto w-full">
      <div className="mx-auto w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-cyan-950/10 sm:p-10">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Tur tamamlandı</h1>
          <PlayerBadge onSignOut={onSignOut} player={player} />
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" key={stat.label}>
              <dt className="text-xs text-slate-500">{stat.label}</dt>
              <dd className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">{stat.value}</dd>
              {stat.best && <dd className="text-xs font-semibold tabular-nums text-cyan-700">{stat.best}</dd>}
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-[0.2em] text-cyan-700 uppercase">Yeni tur</p>
          <div className="flex flex-wrap items-center gap-2">
            <PlayButton label="Türkiye" onClick={() => onPlay({ mode: "turkey", difficulty: "normal" })} />
            <PlayButton label="Dünya" onClick={() => onPlay({ mode: "world", difficulty: "normal" })} />
            <PlayButton label="Dünya · Zor" onClick={() => onPlay({ mode: "world", difficulty: "hard" })} tone="red" />
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <Leaderboard
            currentPlayerId={player?.id}
            boardId={boardId}
            leaderboardError={leaderboardError}
            leaderboards={leaderboards}
            onBoardChange={onBoardChange}
          />
        </div>
      </div>
    </section>
  );
}
