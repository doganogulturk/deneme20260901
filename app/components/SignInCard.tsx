"use client";

import { type FormEvent, useState } from "react";

type SignInCardProps = {
  isSigningIn: boolean;
  authError: string | null;
  supabaseConfigured: boolean;
  onGoogleSignIn: () => void;
  onGuestSignIn: (name: string) => void;
};

export function SignInCard({ isSigningIn, authError, supabaseConfigured, onGoogleSignIn, onGuestSignIn }: SignInCardProps) {
  const [guestName, setGuestName] = useState("");
  const [isGuestNameVisible, setIsGuestNameVisible] = useState(false);

  const submitGuestName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onGuestSignIn(guestName);
  };

  return (
    <section className="my-auto mx-auto w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-xl shadow-cyan-950/10 sm:p-8">
      <p className="text-sm font-semibold tracking-widest text-cyan-700 uppercase">Advanced Analytics</p>
      <p className="mt-1 text-xl font-bold tracking-[0.15em] text-slate-800 uppercase sm:text-2xl">Harita Avcısı</p>
      <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Başlamak için giriş yap</h1>
      <p className="mt-3 text-slate-600">Skorunun sıralamada görünmesi için Google ile giriş yap ya da misafir olarak devam et.</p>

      <div className="mt-8">
        <div className="grid grid-cols-2 gap-3">
          <button
            className="flex h-12 items-center justify-center gap-3 rounded-xl border border-[#747775] bg-white px-4 text-sm font-medium text-[#1f1f1f] transition hover:bg-[#f8fafd] focus:ring-2 focus:ring-[#0b57d0] focus:ring-offset-2 focus:outline-none disabled:cursor-wait disabled:opacity-70"
            disabled={isSigningIn}
            onClick={onGoogleSignIn}
          >
            Google
          </button>
          <button
            className="h-12 rounded-xl border border-cyan-600 px-4 text-sm font-bold text-cyan-700 transition hover:bg-cyan-50 focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:outline-none disabled:cursor-wait disabled:opacity-70"
            disabled={isSigningIn}
            onClick={() => setIsGuestNameVisible(true)}
          >
            Misafir
          </button>
        </div>

        {isGuestNameVisible && (
          <form className="mt-4 flex gap-2" onSubmit={submitGuestName}>
            <label className="sr-only" htmlFor="guest-name">Sıralamada görünecek adın</label>
            <input
              autoFocus
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              disabled={isSigningIn}
              id="guest-name"
              maxLength={40}
              onChange={(event) => setGuestName(event.target.value)}
              placeholder="Sıralamada görünecek adın"
              value={guestName}
            />
            <button
              className="rounded-xl bg-cyan-600 px-5 py-3 font-bold text-white transition hover:bg-cyan-500 focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:outline-none disabled:cursor-wait disabled:opacity-70"
              disabled={isSigningIn}
              type="submit"
            >
              Tamam
            </button>
          </form>
        )}
      </div>

      {authError && <p className="mt-4 text-sm font-medium text-rose-600">{authError}</p>}
      {!supabaseConfigured && <p className="mt-4 text-sm font-medium text-rose-600">Oynamak için Supabase bağlantısı yapılandırılmalıdır.</p>}
    </section>
  );
}
