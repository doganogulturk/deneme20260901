"use client";

import { useEffect, useRef, useState } from "react";
import { BOARDS, boardIdFor, choiceForBoard, type PlayChoice } from "@/lib/game";

type RoundControlsProps = {
  choice: PlayChoice;
  onPlay: (choice: PlayChoice) => void;
};

/** İki kontrol tek bir çerçeveyi paylaşır; aralarındaki çizgi ayırıcıdır. */
const SEGMENT_CLASS =
  "flex h-7 items-center text-slate-600 transition hover:bg-slate-100 hover:text-cyan-700 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-inset focus-visible:outline-none lg:h-8";

const ITEM_CLASS =
  "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none disabled:text-slate-400 disabled:hover:bg-transparent";

/**
 * Oyun sırasında turu bırakma kontrolleri: solda yeniden başlat, sağda harita seçimi.
 * Açılır listenin üzerinde oynanan turun adı yazdığı için üst bar aynı zamanda
 * "hangi moddayım" bilgisini de verir.
 */
export function RoundControls({ choice, onPlay }: RoundControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentBoardId = boardIdFor(choice);
  const currentLabel = BOARDS.find((board) => board.id === currentBoardId)?.label ?? "";

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className="flex shrink-0 items-center rounded-full border border-slate-200">
      <button
        aria-label="Turu yeniden başlat"
        className={`${SEGMENT_CLASS} w-7 justify-center rounded-l-full lg:w-8`}
        onClick={() => onPlay(choice)}
        title="Turu yeniden başlat"
        type="button"
      >
        <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M3 12a9 9 0 1 0 3-6.7M3 4v4.5h4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="relative" ref={menuRef}>
        <button
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className={`${SEGMENT_CLASS} gap-1.5 rounded-r-full border-l border-slate-200 px-2.5 text-xs font-bold lg:px-3 lg:text-sm`}
          onClick={() => setIsOpen((open) => !open)}
          type="button"
        >
          {currentLabel}
          <svg aria-hidden="true" className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10" role="menu">
            <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold tracking-[0.15em] text-slate-400 uppercase">Başka tur</p>
            {BOARDS.map((board) => (
              <button
                className={ITEM_CLASS}
                disabled={board.id === currentBoardId}
                key={board.id}
                onClick={() => {
                  setIsOpen(false);
                  onPlay(choiceForBoard(board));
                }}
                role="menuitem"
                type="button"
              >
                {board.label}
                {board.id === currentBoardId && <span className="text-[10px] font-bold text-cyan-700 uppercase">Şu an</span>}
              </button>
            ))}
            <p className="px-3 pt-2 pb-1 text-[10px] text-slate-400">Yeni tur başlayınca bu turun skoru kaydedilmez.</p>
          </div>
        )}
      </div>
    </div>
  );
}
