"use client";

import { useEffect, useState } from "react";
import { LOCATION_SELECTOR, MAP_LABELS, MAP_URLS, type GameMode } from "@/lib/game";

const markupCache = new Map<GameMode, string>();
const pendingLoads = new Map<GameMode, Promise<string>>();

/** Yerel SVG haritayı indirir ve tıklanabilir alanları işaretler. */
async function fetchMapMarkup(mode: GameMode): Promise<string> {
  const response = await fetch(MAP_URLS[mode]);
  if (!response.ok) throw new Error("Harita indirilemedi.");
  const parsed = new DOMParser().parseFromString(await response.text(), "text/html");
  const svg = parsed.querySelector("svg");
  if (!svg) throw new Error("Harita verisi okunamadı.");

  if (mode === "world") {
    // Dünya haritasında ISO kodu olmayan alanlar "_" ile başlar; onlar tıklanamaz kalır.
    svg.querySelectorAll("path[id], g[id]").forEach((location) => {
      if (!location.id.startsWith("_")) location.setAttribute("data-country-code", location.id);
    });
  }
  svg.querySelectorAll(LOCATION_SELECTOR[mode]).forEach((location) => {
    location.setAttribute("role", "button");
    location.setAttribute("tabindex", "0");
  });

  svg.setAttribute("aria-label", MAP_LABELS[mode]);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  return svg.outerHTML;
}

/**
 * Haritayı bir kez indirip önbelleğe alır. Aynı harita için eş zamanlı çağrılar
 * tek bir isteği paylaşır, böylece mod değişimi anında olur.
 */
export function loadMapMarkup(mode: GameMode): Promise<string> {
  const cached = markupCache.get(mode);
  if (cached) return Promise.resolve(cached);

  const pending = pendingLoads.get(mode);
  if (pending) return pending;

  const load = fetchMapMarkup(mode)
    .then((markup) => {
      markupCache.set(mode, markup);
      return markup;
    })
    .finally(() => pendingLoads.delete(mode));

  pendingLoads.set(mode, load);
  return load;
}

export function useMapMarkup(mode: GameMode) {
  // Önbellek render sırasında okunur; yükleme bittiğinde aşağıdaki sayaç yeniden çizimi tetikler.
  const [, setLoadCount] = useState(0);
  const [failedMode, setFailedMode] = useState<GameMode | null>(null);

  useEffect(() => {
    if (markupCache.has(mode)) return;
    let isActive = true;
    loadMapMarkup(mode).then(
      () => { if (isActive) setLoadCount((count) => count + 1); },
      () => { if (isActive) setFailedMode(mode); },
    );
    return () => { isActive = false; };
  }, [mode]);

  return {
    mapMarkup: markupCache.get(mode) ?? null,
    mapError: failedMode === mode ? "Harita yüklenemedi. Lütfen sayfayı yenileyin." : null,
  };
}
