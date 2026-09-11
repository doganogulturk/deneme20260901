import Image from "next/image";
import { type Player } from "@/lib/game";

type PlayerCardProps = {
  player: Player | null;
  onSignOut: () => void;
};

export function PlayerCard({ player, onSignOut }: PlayerCardProps) {
  if (!player) return null;

  return (
    <div className="flex items-center gap-2 border-t border-slate-200 pt-2 lg:gap-3 lg:pt-4">
      {player.avatarUrl ? (
        <Image
          alt=""
          className="h-7 w-7 shrink-0 rounded-full border border-cyan-200 object-cover lg:h-10 lg:w-10"
          height={40}
          referrerPolicy="no-referrer"
          src={player.avatarUrl}
          unoptimized
          width={40}
        />
      ) : (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-700 lg:h-10 lg:w-10 lg:text-base">
          {player.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-bold text-slate-700 lg:text-sm" title={player.name}>{player.name}</p>
        <button
          className="text-[10px] font-semibold text-slate-400 underline-offset-2 transition hover:text-slate-600 hover:underline lg:text-xs"
          onClick={onSignOut}
          type="button"
        >
          Çıkış yap
        </button>
      </div>
    </div>
  );
}
