import Image from "next/image";
import { formatTime, GAME_MODES, MODE_COPY, type GameMode, type LeaderboardEntry } from "@/lib/game";

type LeaderboardProps = {
  leaderboards: Record<GameMode, LeaderboardEntry[]>;
  leaderboardMode: GameMode;
  leaderboardError: string | null;
  currentPlayerId: string | undefined;
  onLeaderboardModeChange: (mode: GameMode) => void;
};

const TOP_RANK_STYLES: Record<number, string> = {
  1: "bg-gradient-to-r from-emerald-600 to-emerald-400 text-white",
  2: "bg-gradient-to-r from-emerald-400 to-emerald-200 text-emerald-950",
  3: "bg-gradient-to-r from-emerald-200 to-emerald-50 text-emerald-900",
};

function LeaderboardRow({ entry, rank, isCurrentPlayer }: { entry: LeaderboardEntry; rank: number; isCurrentPlayer: boolean }) {
  const isTop = rank <= 3;

  return (
    <li
      className={`flex items-center justify-between rounded-lg lg:rounded-xl ${
        isTop
          ? `${TOP_RANK_STYLES[rank]} px-3 py-2.5 text-sm shadow-sm lg:px-5 lg:py-4 lg:text-lg`
          : `px-2.5 py-1.5 text-xs lg:px-4 lg:py-3 lg:text-base ${isCurrentPlayer ? "bg-cyan-50 text-cyan-950" : "bg-white"}`
      } ${isCurrentPlayer && isTop ? "ring-2 ring-cyan-500 ring-offset-1" : ""}`}
    >
      <span className="flex min-w-0 items-center gap-2 lg:gap-3">
        <strong className={`shrink-0 tabular-nums ${isTop ? "w-5 text-base lg:w-7 lg:text-2xl" : "w-4 text-cyan-700 lg:w-5"}`}>{rank}</strong>
        {isTop &&
          (entry.avatar_url ? (
            <Image
              alt=""
              className="h-6 w-6 shrink-0 rounded-full border border-white/70 object-cover lg:h-9 lg:w-9"
              height={36}
              referrerPolicy="no-referrer"
              src={entry.avatar_url}
              unoptimized
              width={36}
            />
          ) : (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/70 text-[10px] font-bold text-emerald-800 lg:h-9 lg:w-9 lg:text-sm">
              {entry.display_name.slice(0, 1).toUpperCase()}
            </span>
          ))}
        <span className={`truncate ${isTop ? "font-bold" : "font-medium"}`}>{entry.display_name}</span>
      </span>
      <span className="shrink-0 text-right font-bold tabular-nums">
        <span>{entry.score} puan</span>
        <span className={`ml-1.5 font-semibold lg:ml-2 ${isTop ? "text-xs opacity-80 lg:text-sm" : "text-[10px] text-slate-500 lg:text-xs"}`}>
          {formatTime(Math.round(entry.duration_ms / 1000))}
        </span>
      </span>
    </li>
  );
}

export function Leaderboard({ leaderboards, leaderboardMode, leaderboardError, currentPlayerId, onLeaderboardModeChange }: LeaderboardProps) {
  const entries = leaderboards[leaderboardMode];
  const isEmptyEverywhere = leaderboards.turkey.length === 0 && leaderboards.world.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <div className="flex shrink-0 gap-1 border-b border-slate-200 px-2 pt-2 lg:gap-2 lg:px-6 lg:pt-4" role="tablist">
        {GAME_MODES.map((option) => (
          <button
            aria-selected={leaderboardMode === option}
            className={`rounded-t-lg px-3 py-1.5 text-xs font-bold transition lg:px-5 lg:py-2.5 lg:text-base ${leaderboardMode === option ? "bg-white text-cyan-700 shadow-[inset_0_-2px_0_0_var(--color-cyan-600)]" : "text-slate-500 hover:text-cyan-700"}`}
            key={option}
            onClick={() => onLeaderboardModeChange(option)}
            role="tab"
            type="button"
          >
            {MODE_COPY[option].tabLabel}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 lg:px-6 lg:py-5">
        {leaderboardError ? (
          <p className="text-center text-xs font-medium text-rose-600 lg:text-sm">{leaderboardError}</p>
        ) : entries.length === 0 ? (
          <p className="text-center text-xs text-slate-500 lg:text-sm">
            {isEmptyEverywhere ? "Sıralama yükleniyor..." : "Bu haritada henüz sonuç yok."}
          </p>
        ) : (
          <ol className="space-y-1.5 lg:space-y-2">
            {entries.map((entry, index) => (
              <LeaderboardRow entry={entry} isCurrentPlayer={entry.user_id === currentPlayerId} key={entry.user_id} rank={index + 1} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
