"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

type ViewBox = { x: number; y: number; width: number; height: number };

const MAX_ZOOM = 8;
const BUTTON_ZOOM_STEP = 1.6;
/** Sürükleme bu eşiği aşarsa işaretçi bırakıldığında seçim değil, kaydırma sayılır. */
const DRAG_THRESHOLD_PX = 5;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Ekran koordinatını, viewBox ve ortalama payı dahil, SVG kullanıcı koordinatına çevirir. */
function toUserSpace(svg: SVGSVGElement, clientX: number, clientY: number) {
  const screenToUser = svg.getScreenCTM()?.inverse();
  if (!screenToUser) return null;
  return new DOMPoint(clientX, clientY).matrixTransform(screenToUser);
}

function parseViewBox(svg: SVGSVGElement): ViewBox | null {
  const raw = svg.getAttribute("viewBox");
  if (!raw) return null;
  const [x, y, width, height] = raw.trim().split(/[\s,]+/).map(Number);
  if ([x, y, width, height].some((value) => !Number.isFinite(value)) || width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

/**
 * Gömülü SVG haritanın viewBox'ını değiştirerek yalnızca haritayı yakınlaştırır.
 * Sayfanın kendisi etkilenmez; kaydırma sınırları haritanın dışına taşmaz.
 */
export function useMapZoom(containerRef: RefObject<HTMLDivElement | null>, mapMarkup: string | null) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const baseViewBox = useRef<ViewBox | null>(null);
  const viewBox = useRef<ViewBox | null>(null);
  const dragDistance = useRef(0);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);

  const applyViewBox = useCallback((next: ViewBox) => {
    const base = baseViewBox.current;
    const svg = svgRef.current;
    if (!base || !svg) return;

    const width = clamp(next.width, base.width / MAX_ZOOM, base.width);
    const height = width * (base.height / base.width);
    const x = clamp(next.x, base.x, base.x + base.width - width);
    const y = clamp(next.y, base.y, base.y + base.height - height);

    viewBox.current = { x, y, width, height };
    svg.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
    setZoom(base.width / width);
  }, []);

  const reset = useCallback(() => {
    if (baseViewBox.current) applyViewBox(baseViewBox.current);
  }, [applyViewBox]);

  /**
   * Verilen alanı görünür kılar: mevcut yakınlaştırmaya sığıyorsa oraya ortalar,
   * sığmıyorsa tam görünüme döner. Yakınlaşmışken doğru cevabın kaçırılmaması için.
   */
  const ensureVisible = useCallback(
    (element: SVGGraphicsElement) => {
      const view = viewBox.current;
      const base = baseViewBox.current;
      if (!view || !base) return;

      const box = element.getBBox();
      const isVisible =
        box.x >= view.x && box.y >= view.y && box.x + box.width <= view.x + view.width && box.y + box.height <= view.y + view.height;
      if (isVisible) return;

      if (box.width <= view.width && box.height <= view.height) {
        applyViewBox({ ...view, x: box.x + box.width / 2 - view.width / 2, y: box.y + box.height / 2 - view.height / 2 });
      } else {
        applyViewBox(base);
      }
    },
    [applyViewBox],
  );

  /** Görünümün merkezini sabit tutarak yakınlaştırır. */
  const zoomBy = useCallback(
    (factor: number) => {
      const view = viewBox.current;
      if (!view) return;
      const width = view.width / factor;
      applyViewBox({
        x: view.x + (view.width - width) / 2,
        y: view.y + (view.height - width * (view.height / view.width)) / 2,
        width,
        height: width * (view.height / view.width),
      });
    },
    [applyViewBox],
  );

  // Harita değiştiğinde temel viewBox'ı yeniden okur ve yakınlaştırmayı sıfırlar.
  useEffect(() => {
    const svg = containerRef.current?.querySelector("svg") ?? null;
    svgRef.current = svg;
    baseViewBox.current = svg ? parseViewBox(svg) : null;
    if (baseViewBox.current) applyViewBox(baseViewBox.current);
    else setZoom(1);
  }, [applyViewBox, containerRef, mapMarkup]);

  // Tekerlek olayı pasif olmayan bir dinleyici gerektirir; aksi halde sayfa kaymasını engelleyemeyiz.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      const svg = svgRef.current;
      const base = baseViewBox.current;
      const view = viewBox.current;
      if (!svg || !base || !view) return;
      event.preventDefault();

      const pointer = toUserSpace(svg, event.clientX, event.clientY);
      if (!pointer) return;
      const width = clamp(view.width * Math.exp(event.deltaY * 0.002), base.width / MAX_ZOOM, base.width);
      const ratio = width / view.width;

      applyViewBox({
        x: pointer.x - (pointer.x - view.x) * ratio,
        y: pointer.y - (pointer.y - view.y) * ratio,
        width,
        height: view.height * ratio,
      });
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [applyViewBox, containerRef]);

  const startPan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragDistance.current = 0;
    lastPointer.current = { x: event.clientX, y: event.clientY };
  };

  const movePan = (event: React.PointerEvent<HTMLDivElement>) => {
    const last = lastPointer.current;
    const svg = svgRef.current;
    const view = viewBox.current;
    if (!last || !svg || !view) return;

    const deltaX = event.clientX - last.x;
    const deltaY = event.clientY - last.y;
    dragDistance.current += Math.abs(deltaX) + Math.abs(deltaY);
    lastPointer.current = { x: event.clientX, y: event.clientY };
    if (dragDistance.current <= DRAG_THRESHOLD_PX) return;

    const userToScreen = svg.getScreenCTM();
    if (!userToScreen) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    applyViewBox({ ...view, x: view.x - deltaX / userToScreen.a, y: view.y - deltaY / userToScreen.d });
  };

  const endPan = (event: React.PointerEvent<HTMLDivElement>) => {
    lastPointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return {
    zoom,
    canZoomIn: zoom < MAX_ZOOM - 0.01,
    canZoomOut: zoom > 1.01,
    zoomIn: () => zoomBy(BUTTON_ZOOM_STEP),
    zoomOut: () => zoomBy(1 / BUTTON_ZOOM_STEP),
    reset,
    ensureVisible,
    /** Sürükleme sonrası gelen tıklamanın seçim sayılmaması için. */
    wasDragged: () => dragDistance.current > DRAG_THRESHOLD_PX,
    panHandlers: { onPointerDown: startPan, onPointerMove: movePan, onPointerUp: endPan, onPointerCancel: endPan },
  };
}
