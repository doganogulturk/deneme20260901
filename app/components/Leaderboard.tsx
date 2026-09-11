import Image from "next/image";
import { BOARDS, formatTime, type BoardId, type LeaderboardEntry } from "@/lib/game";
import { type Leaderboards } from "@/lib/hooks/useLeaderboard";

type LeaderboardProps = {
  leaderboards: Leaderboards;
  boardId: BoardId;
  leaderboardError: string | null;
  currentPlayerId: string | undefined;
  onBoardChange: (boardId: BoardId) => void;
};

/** İlk üç, satır zemini yerine madalya renginde sıra rozetiyle vurgulanır. */
const MEDAL_STYLES: Record<number, string> = {
  1: "bg-amber-100 text-amber-800 ring-1 ring-amber-300",
  2: "bg-slate-200 text-slate-700 ring-1 ring-slate-300",
  3: "bg-orange-100 text-orange-800 ring-1 ring-orange-300",
};

function LeaderboardRow({ entry, rank, isCurrentPlayer }: { entry: LeaderboardEntry; rank: number; isCurrentPlayer: boolean }) {
  const isTop = rank <= 3;

  return (
    <li className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm ${isCurrentPlayer ? "bg-cyan-50" : "bg-slate-50"}`}>
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${isTop ? MEDAL_STYLES[rank] : "text-slate-400"}`}
        >
          {rank}
        </span>
        {entry.avatar_url ? (
          <Image
            alt=""
            className="h-7 w-7 shrink-0 rounded-full border border-slate-200 object-cover"
            height={28}
            referrerPolicy="no-referrer"
            src={entry.avatar_url}
            unoptimized
            width={28}
          />
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-500">
            {entry.display_name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className={`truncate ${isTop ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>{entry.display_name}</span>
        {isCurrentPlayer && (
          <span className="shrink-0 rounded-full bg-cyan-600 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">Sen</span>
        )}
      </span>
      <span className="shrink-0 text-right font-bold tabular-nums text-slate-900">
        {entry.score} puan
        <span className="ml-2 text-xs font-semibold text-slate-500">{formatTime(Math.round(entry.duration_ms / 1000))}</span>
      </span>
    </li>
  );
}

export function Leaderboard({ leaderboards, boardId, leaderboardError, currentPlayerId, onBoardChange }: LeaderboardProps) {
  const entries = leaderboards[boardId];
  const isEmptyEverywhere = BOARDS.every((board) => leaderboards[board.id].length === 0);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.2em] text-cyan-700 uppercase">Sıralama</p>
        <div className="flex gap-1 rounded-full bg-slate-100 p-1" role="tablist">
          {BOARDS.map((board) => (
            <button
              aria-selected={boardId === board.id}
              className={`rounded-full px-3 py-1.5 text-sm font-bold transition sm:px-4 ${boardId === board.id ? "bg-white text-cyan-700 shadow-sm" : "text-slate-500 hover:text-cyan-700"}`}
              key={board.id}
              onClick={() => onBoardChange(board.id)}
              role="tab"
              type="button"
            >
              {board.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 max-h-[20rem] overflow-y-auto pr-1">
        {leaderboardError ? (
          <p className="py-8 text-center text-sm font-medium text-rose-600">{leaderboardError}</p>
        ) : entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            {isEmptyEverywhere ? "Sıralama yükleniyor..." : "Bu haritada henüz sonuç yok."}
          </p>
        ) : (
          <ol className="space-y-1.5">
            {entries.map((entry, index) => (
              <LeaderboardRow entry={entry} isCurrentPlayer={entry.user_id === currentPlayerId} key={entry.user_id} rank={index + 1} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
