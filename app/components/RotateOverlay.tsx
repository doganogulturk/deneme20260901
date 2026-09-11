"use client";

/** Mobilde dikey moddayken tüm ekranı kaplayan "telefonunu yan çevir" uyarısı. */
export function RotateOverlay() {
  const enterLandscape = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
      await (screen.orientation as ScreenOrientation & { lock?: (orientation: "landscape") => Promise<void> }).lock?.("landscape");
    } catch {
      // iOS Safari yön kilidini desteklemiyor; kullanıcı cihazını kendisi çevirir.
    }
  };

  return (
    <div className="fixed inset-0 z-50 hidden flex-col items-center justify-center gap-4 bg-slate-900 px-8 text-center text-white portrait:max-lg:flex">
      <svg aria-hidden="true" className="h-16 w-16 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <rect height="14" rx="2" width="20" x="2" y="5" />
        <path d="M9 2.5 12 5 9 7.5" />
        <path d="M15 21.5 12 19l3-2.5" />
      </svg>
      <p className="text-xl font-bold">Telefonunu yan çevir</p>
      <p className="max-w-xs text-sm text-slate-300">Harita geniş olduğu için Harita Avcısı yatay modda oynanır.</p>
      <button className="rounded-full bg-cyan-500 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400" onClick={enterLandscape} type="button">
        Yatay moda geç
      </button>
    </div>
  );
}
