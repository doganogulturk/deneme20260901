"use client";

import { useEffect, useRef } from "react";
import { useMapZoom } from "@/lib/hooks/useMapZoom";
import {
  correctLocationId,
  isSameLocation,
  locationIdOf,
  LOCATION_SELECTOR,
  type AnswerState,
  type GameMode,
  type Question,
} from "@/lib/game";

type GameMapProps = {
  mode: GameMode;
  mapMarkup: string | null;
  mapError: string | null;
  isInteractive: boolean;
  question: Question | undefined;
  answerState: AnswerState;
  selectedLocation: string | null;
  onSelect: (locationId: string) => void;
};

const ZOOM_BUTTON_CLASS =
  "flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white/90 text-lg font-bold text-slate-600 shadow-sm backdrop-blur transition hover:border-cyan-300 hover:text-cyan-700 focus:ring-2 focus:ring-cyan-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40";

export function GameMap({ mode, mapMarkup, mapError, isInteractive, question, answerState, selectedLocation, onSelect }: GameMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { zoom, canZoomIn, canZoomOut, zoomIn, zoomOut, reset, ensureVisible, wasDragged, panHandlers } = useMapZoom(containerRef, mapMarkup);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !question) return;
    const correctLocation = correctLocationId(question);
    container.querySelectorAll<SVGGraphicsElement>(LOCATION_SELECTOR[mode]).forEach((location) => {
      const locationId = locationIdOf(location, mode);
      const isCorrect = isSameLocation(mode, locationId, correctLocation);
      location.classList.toggle("map-correct", answerState !== null && isCorrect);
      location.classList.toggle("map-incorrect", answerState === "incorrect" && isSameLocation(mode, locationId, selectedLocation));
      if (answerState !== null && isCorrect) ensureVisible(location);
    });
  }, [answerState, ensureVisible, mapMarkup, mode, question, selectedLocation]);

  const selectFromEvent = (target: EventTarget) => {
    const location = (target as Element).closest<SVGElement>(LOCATION_SELECTOR[mode]);
    return locationIdOf(location, mode);
  };

  if (!mapMarkup) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-50 text-center text-sm text-slate-400">
        {mapError ?? "Harita yükleniyor..."}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-slate-50">
      <div
        className={`map ${isInteractive ? "map-interactive" : "pointer-events-none opacity-70"}`}
        dangerouslySetInnerHTML={{ __html: mapMarkup }}
        id="game-map"
        onClick={(event) => {
          if (wasDragged()) return;
          const locationId = selectFromEvent(event.target);
          if (locationId) onSelect(locationId);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          const locationId = selectFromEvent(event.target);
          if (locationId) {
            event.preventDefault();
            onSelect(locationId);
          }
        }}
        ref={containerRef}
        {...panHandlers}
      />

      <div className="absolute right-3 bottom-3 flex flex-col items-end gap-1.5">
        {zoom > 1.01 && (
          <button
            className="rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm backdrop-blur transition hover:border-cyan-300 hover:text-cyan-700 focus:ring-2 focus:ring-cyan-300 focus:outline-none"
            onClick={reset}
            type="button"
          >
            Sıfırla · {zoom.toFixed(1)}x
          </button>
        )}
        <button aria-label="Yakınlaştır" className={ZOOM_BUTTON_CLASS} disabled={!canZoomIn} onClick={zoomIn} type="button">+</button>
        <button aria-label="Uzaklaştır" className={ZOOM_BUTTON_CLASS} disabled={!canZoomOut} onClick={zoomOut} type="button">−</button>
      </div>
    </div>
  );
}
