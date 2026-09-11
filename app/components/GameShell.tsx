import { type ReactNode } from "react";
import { BrandMark } from "./BrandMark";
import { PlayerCard } from "./PlayerCard";
import { type Player } from "@/lib/game";

type GameShellProps = {
  player: Player | null;
  onSignOut: () => void;
  sidebar: ReactNode;
  children: ReactNode;
};

/** Kenar çubuğu + içerik alanından oluşan, oyun ve sonuç ekranlarının paylaştığı kart düzeni. */
export function GameShell({ player, onSignOut, sidebar, children }: GameShellProps) {
  return (
    <section className="flex min-h-0 flex-1 py-0 lg:py-2">
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-cyan-950/10 lg:rounded-3xl lg:shadow-xl">
        <aside className="flex w-36 shrink-0 flex-col justify-between gap-2 border-r border-slate-200 px-3 py-3 sm:w-44 lg:w-64 lg:gap-6 lg:px-6 lg:py-6 xl:w-72">
          <BrandMark />
          {sidebar}
          <PlayerCard player={player} onSignOut={onSignOut} />
        </aside>
        {children}
      </div>
    </section>
  );
}
