"use client";

import { type FormEvent, useState } from "react";

type AuthPanelProps = {
  /** Oyuncunun giriş yapmadan önce seçtiği tur, ör. "Dünya · Zor". */
  choiceLabel: string;
  isSigningIn: boolean;
  authError: string | null;
  supabaseConfigured: boolean;
  onGoogleSignIn: () => void;
  onGuestSignIn: (name: string) => void;
  onCancel: () => void;
};

/**
 * Giriş, ayrı bir ekran değil; oyuncu "Oyna"ya bastıktan sonra aynı kartın içinde
 * açılan bir adım. Seçim korunur, giriş biter bitmez o tur başlar.
 */
export function AuthPanel({ choiceLabel, isSigningIn, authError, supabaseConfigured, onGoogleSignIn, onGuestSignIn, onCancel }: AuthPanelProps) {
  const [guestName, setGuestName] = useState("");
  const [isGuestFormVisible, setIsGuestFormVisible] = useState(false);

  const submitGuestName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onGuestSignIn(guestName);
  };

  return (
    <div className="rounded-2xl border-2 border-cyan-200 bg-cyan-50/60 p-5 sm:p-6">
      <button
        className="text-xs font-semibold text-slate-500 underline-offset-2 transition hover:text-cyan-700 hover:underline"
        onClick={onCancel}
        type="button"
      >
        ← Harita seçimine dön
      </button>

      <p className="mt-3 text-lg font-bold text-slate-900">
        <span className="text-cyan-700">{choiceLabel}</span> turu seni bekliyor
      </p>
      <p className="mt-1 text-sm text-slate-600">
        Skorunun sıralamada görünmesi için giriş yap. Giriş yapar yapmaz bu tur başlıyor.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          className="flex h-12 items-center justify-center gap-3 rounded-xl border border-[#747775] bg-white px-4 text-sm font-medium text-[#1f1f1f] transition hover:bg-[#f8fafd] focus-visible:ring-2 focus-visible:ring-[#0b57d0] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-wait disabled:opacity-70"
          disabled={isSigningIn}
          onClick={onGoogleSignIn}
          type="button"
        >
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 48 48">
            <path d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" fill="#4285F4" />
            <path d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" fill="#34A853" />
            <path d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" fill="#FBBC05" />
            <path d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" fill="#EA4335" />
          </svg>
          Google ile devam et
        </button>
        <button
          className="h-12 rounded-xl border border-cyan-600 bg-white px-4 text-sm font-bold text-cyan-700 transition hover:bg-cyan-50 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-wait disabled:opacity-70"
          disabled={isSigningIn}
          onClick={() => setIsGuestFormVisible(true)}
          type="button"
        >
          Misafir olarak oyna
        </button>
      </div>

      {isGuestFormVisible && (
        <form className="mt-3 flex gap-2" onSubmit={submitGuestName}>
          <label className="sr-only" htmlFor="guest-name">Sıralamada görünecek adın</label>
          <input
            autoFocus
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            disabled={isSigningIn}
            id="guest-name"
            maxLength={40}
            onChange={(event) => setGuestName(event.target.value)}
            placeholder="Sıralamada görünecek adın"
            value={guestName}
          />
          <button
            className="rounded-xl bg-cyan-600 px-5 py-3 font-bold text-white transition hover:bg-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-wait disabled:opacity-70"
            disabled={isSigningIn}
            type="submit"
          >
            Başla
          </button>
        </form>
      )}

      {authError && <p className="mt-4 text-sm font-medium text-rose-600">{authError}</p>}
      {!supabaseConfigured && <p className="mt-4 text-sm font-medium text-rose-600">Oynamak için Supabase bağlantısı yapılandırılmalıdır.</p>}
    </div>
  );
}
