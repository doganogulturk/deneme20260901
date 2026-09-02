"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { createRound, type Province } from "@/lib/turkish-plates";
import { createWorldRound, type Country } from "@/lib/world-countries";

type AnswerState = "correct" | "incorrect" | null;
type GameMode = "turkey" | "world";
type GamePhase = "ready" | "playing" | "finished";
type Question = Province | Country;
type Player = { id: string; name: string; avatarUrl: string | null };
type LeaderboardEntry = { user_id: string; display_name: string; avatar_url: string | null; score: number; duration_ms: number; best_streak: number };

const MAP_URLS: Record<GameMode, string> = {
  turkey: "https://raw.githubusercontent.com/dnomak/svg-turkiye-haritasi/master/index.html",
  world: "https://raw.githubusercontent.com/flekschas/simple-world-map/master/world-map.min.svg",
};

const MODE_COPY: Record<GameMode, { eyebrow: string; title: string; description: string; nextLabel: string; mapLabel: string }> = {
  turkey: { eyebrow: "Türkiye harita oyunu", title: "Şehirleri haritada bulabilir misin?", description: "Rastgele gelen 10 şehrin bulunduğu ili harita üzerinde seç.", nextLabel: "Dünya haritasında oyna", mapLabel: "Türkiye il haritası" },
  world: { eyebrow: "Dünya harita oyunu", title: "Ülkeleri dünya haritasında bulabilir misin?", description: "Rastgele gelen 10 ülkenin konumunu dünya haritası üzerinde seç.", nextLabel: "Türkiye haritasında oyna", mapLabel: "Dünya ülkeleri haritası" },
};

function playerFromUser(user: { id: string; email?: string; user_metadata: Record<string, unknown> }): Player {
  const fullName = user.user_metadata.full_name;
  const name = user.user_metadata.name;
  const avatar = user.user_metadata.avatar_url;
  const picture = user.user_metadata.picture;
  const guestName = user.user_metadata.display_name;
  const displayName = [fullName, name, guestName, user.email].find((value): value is string => typeof value === "string" && value.trim().length > 0) ?? "Oyuncu";
  const avatarUrl = [avatar, picture].find((value): value is string => typeof value === "string" && value.length > 0) ?? null;
  return { id: user.id, name: displayName.trim(), avatarUrl };
}

export default function Home() {
  const [mode, setMode] = useState<GameMode>("turkey");
  const [questions, setQuestions] = useState<Question[]>(() => createRound());
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [completionDurationMs, setCompletionDurationMs] = useState(0);
  const [remainingGameSeconds, setRemainingGameSeconds] = useState(120);
  const [remainingQuestionSeconds, setRemainingQuestionSeconds] = useState(120);
  const gameStartedAt = useRef<number | null>(null);
  const activeQuestionStartedAt = useRef<number | null>(null);
  const elapsedAnswerTimeMs = useRef(0);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [answerState, setAnswerState] = useState<AnswerState>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [phase, setPhase] = useState<GamePhase>("ready");
  const [mapMarkup, setMapMarkup] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [guestName, setGuestName] = useState("");
  const [isGuestNameVisible, setIsGuestNameVisible] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [leaderboards, setLeaderboards] = useState<Record<GameMode, LeaderboardEntry[]>>({ turkey: [], world: [] });
  const [leaderboardMode, setLeaderboardMode] = useState<GameMode>("turkey");
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const currentQuestion = questions[questionIndex];
  const questionName = currentQuestion && ("city" in currentQuestion ? currentQuestion.city : currentQuestion.name);
  const copy = MODE_COPY[mode];
  const supabaseConfigured = getSupabaseClient() !== null;

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setPlayer(playerFromUser(user));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setPlayer(session?.user ? playerFromUser(session.user) : null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let isActive = true;
    async function loadMap() {
      try {
        const response = await fetch(MAP_URLS[mode]);
        if (!response.ok) throw new Error("Harita indirilemedi.");
        const document = new DOMParser().parseFromString(await response.text(), "text/html");
        const svg = document.querySelector("svg");
        if (!svg) throw new Error("Harita verisi okunamadı.");
        if (mode === "turkey") {
          svg.querySelectorAll("g[data-plakakodu]").forEach((location) => {
            location.setAttribute("role", "button");
            location.setAttribute("tabindex", "0");
          });
        } else {
          svg.querySelectorAll("path[id], g[id]").forEach((location) => {
            const code = location.id;
            if (!code.startsWith("_")) {
              location.setAttribute("data-country-code", code);
              location.setAttribute("role", "button");
              location.setAttribute("tabindex", "0");
            }
          });
        }
        svg.setAttribute("aria-label", copy.mapLabel);
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        if (isActive) setMapMarkup(svg.outerHTML);
      } catch {
        if (isActive) setMapError("Harita yüklenemedi. İnternet bağlantınızı kontrol edin.");
      }
    }
    void loadMap();
    return () => { isActive = false; };
  }, [copy.mapLabel, mode]);

  useEffect(() => {
    const map = document.getElementById("game-map");
    if (!map || !currentQuestion) return;
    const selector = mode === "turkey" ? "g[data-plakakodu]" : "[data-country-code]";
    const correctLocation = mode === "turkey" ? String((currentQuestion as Province).plate) : (currentQuestion as Country).code;
    map.querySelectorAll(selector).forEach((location) => {
      const locationId = mode === "turkey" ? (location as SVGGElement).dataset.plakakodu : (location as SVGElement).dataset.countryCode;
      const isCorrectLocation = mode === "turkey" ? Number(locationId) === Number(correctLocation) : locationId === correctLocation;
      const isSelectedLocation = mode === "turkey" ? Number(locationId) === Number(selectedLocation) : locationId === selectedLocation;
      location.classList.toggle("map-correct", answerState !== null && isCorrectLocation);
      location.classList.toggle("map-incorrect", answerState === "incorrect" && isSelectedLocation);
    });
  }, [answerState, currentQuestion, mapMarkup, mode, selectedLocation]);

  useEffect(() => {
    if (phase !== "playing" || !currentQuestion) return;
    const updateTimers = () => {
      const now = performance.now();
      const gameElapsedMs = gameStartedAt.current === null ? 0 : now - gameStartedAt.current;
      const gameSeconds = Math.max(0, Math.ceil((120000 - gameElapsedMs) / 1000));
      setRemainingGameSeconds(gameSeconds);
      if (gameSeconds === 0) {
        activeQuestionStartedAt.current = null;
        setCompletionDurationMs(120000);
        setPhase("finished");
      }
    };
    updateTimers();
    const timer = window.setInterval(updateTimers, 250);
    return () => window.clearInterval(timer);
  }, [currentQuestion, phase]);

  useEffect(() => {
    if (phase !== "playing" || !answerState || !currentQuestion) return;
    const transitionStartedAt = performance.now();
    const updateCountdown = () => setRemainingQuestionSeconds(Math.max(0, Math.ceil((3000 - (performance.now() - transitionStartedAt)) / 1000)));
    const countdown = window.setInterval(updateCountdown, 100);
    const timer = window.setTimeout(() => {
      if (questionIndex === questions.length - 1) {
        setPhase("finished");
        return;
      }
      activeQuestionStartedAt.current = performance.now();
      setQuestionIndex((currentIndex) => currentIndex + 1);
      setAnswerState(null);
      setSelectedLocation(null);
    }, 3000);
    return () => { window.clearInterval(countdown); window.clearTimeout(timer); };
  }, [answerState, currentQuestion, phase, questionIndex, questions.length]);

  useEffect(() => {
    if (phase !== "finished" || !player) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const currentPlayer = player;
    const supabaseClient = supabase;
    let isActive = true;
    let channel: ReturnType<typeof supabaseClient.channel> | undefined;
    const loadLeaderboard = async () => {
      const { data, error } = await supabaseClient.from("game_results").select("user_id, display_name, avatar_url, score, duration_ms, best_streak, created_at, game_mode").order("score", { ascending: false }).order("duration_ms", { ascending: true }).order("best_streak", { ascending: false }).order("created_at", { ascending: true });
      if (!isActive) return;
      if (error) setLeaderboardError("Sıralama yüklenemedi. Lütfen tekrar deneyin.");
      else {
        const bestResults: Record<GameMode, Map<string, LeaderboardEntry>> = { turkey: new Map(), world: new Map() };
        for (const result of data ?? []) {
          const results = bestResults[result.game_mode as GameMode];
          if (results && !results.has(result.user_id)) results.set(result.user_id, result);
        }
        setLeaderboards({ turkey: [...bestResults.turkey.values()], world: [...bestResults.world.values()] });
      }
    };
    async function saveResultAndLoadLeaderboard() {
      const { error } = await supabaseClient.from("game_results").insert({ user_id: currentPlayer.id, display_name: currentPlayer.name, avatar_url: currentPlayer.avatarUrl, game_mode: mode, score, duration_ms: completionDurationMs, best_streak: bestStreak });
      if (error) {
        if (isActive) setLeaderboardError("Skor kaydedilemedi. Lütfen tekrar deneyin.");
        return;
      }
      await loadLeaderboard();
      channel = supabaseClient.channel("live-leaderboard").on("postgres_changes", { event: "*", schema: "public", table: "game_results" }, () => { void loadLeaderboard(); }).subscribe();
    }
    void saveResultAndLoadLeaderboard();
    return () => { isActive = false; if (channel) void supabaseClient.removeChannel(channel); };
  }, [bestStreak, completionDurationMs, mode, phase, player, score]);

  async function signInWithGoogle() {
    const supabase = getSupabaseClient();
    if (!supabase) return setAuthError("Supabase bağlantısı yapılandırılmalıdır.");
    setIsSigningIn(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (error) { setAuthError("Google ile giriş başlatılamadı. Lütfen tekrar deneyin."); setIsSigningIn(false); }
  }

  async function signInAsGuest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = guestName.trim();
    if (!name) return setAuthError("Sıralamada görünmek için bir ad yazın.");
    const supabase = getSupabaseClient();
    if (!supabase) return setAuthError("Supabase bağlantısı yapılandırılmalıdır.");
    setIsSigningIn(true);
    setAuthError(null);
    const { data, error } = await supabase.auth.signInAnonymously({ options: { data: { display_name: name } } });
    if (error || !data.user) { setAuthError(`Misafir oturumu başlatılamadı: ${error?.message ?? "Supabase kullanıcı oluşturmadı."}`); setIsSigningIn(false); return; }
    setPlayer({ id: data.user.id, name, avatarUrl: null });
    setGuestName("");
    setIsSigningIn(false);
  }

  async function signOut() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) return setAuthError("Çıkış yapılamadı. Lütfen tekrar deneyin.");
    setPlayer(null);
    setPhase("ready");
    setAuthError(null);
  }

  function startGame(nextMode = mode) {
    setMode(nextMode);
    setQuestions(nextMode === "turkey" ? createRound() : createWorldRound());
    setQuestionIndex(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setCompletionDurationMs(0);
    setRemainingGameSeconds(120);
    setRemainingQuestionSeconds(3);
    elapsedAnswerTimeMs.current = 0;
    gameStartedAt.current = performance.now();
    activeQuestionStartedAt.current = gameStartedAt.current;
    setAnswers([]);
    setAnswerState(null);
    setSelectedLocation(null);
    setLeaderboards({ turkey: [], world: [] });
    setLeaderboardMode(nextMode);
    setLeaderboardError(null);
    setPhase("playing");
  }

  async function enterLandscape() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
      await (screen.orientation as ScreenOrientation & { lock?: (orientation: "landscape") => Promise<void> }).lock?.("landscape");
    } catch {
      // iOS Safari yön kilidini desteklemiyor; kullanıcı cihazını kendisi çevirir.
    }
  }

  function chooseLocation(locationId: string) {
    if (phase !== "playing" || !currentQuestion || answerState) return;
    const correctLocation = mode === "turkey" ? String((currentQuestion as Province).plate) : (currentQuestion as Country).code;
    const isCorrect = mode === "turkey" ? Number(locationId) === Number(correctLocation) : locationId === correctLocation;
    const nextStreak = isCorrect ? streak + 1 : 0;
    const questionElapsedMs = activeQuestionStartedAt.current === null ? 0 : performance.now() - activeQuestionStartedAt.current;
    const totalElapsedMs = elapsedAnswerTimeMs.current + questionElapsedMs;
    elapsedAnswerTimeMs.current = totalElapsedMs;
    activeQuestionStartedAt.current = null;
    if (questionIndex === questions.length - 1) {
      const gameElapsedMs = gameStartedAt.current === null ? totalElapsedMs : performance.now() - gameStartedAt.current;
      setCompletionDurationMs(Math.round(Math.min(120000, gameElapsedMs)));
    }
    const result = isCorrect ? "correct" : "incorrect";
    setRemainingQuestionSeconds(3);
    setSelectedLocation(locationId);
    setAnswerState(result);
    setAnswers((currentAnswers) => [...currentAnswers, result]);
    setScore((currentScore) => currentScore + (isCorrect ? 1 : 0));
    setStreak(nextStreak);
    setBestStreak((currentBest) => Math.max(currentBest, nextStreak));
  }

  function handleMapClick(event: React.MouseEvent<HTMLDivElement>) {
    const selector = mode === "turkey" ? "g[data-plakakodu]" : "[data-country-code]";
    const location = (event.target as Element).closest<SVGElement>(selector);
    const locationId = mode === "turkey" ? location?.dataset.plakakodu : location?.dataset.countryCode;
    if (locationId) chooseLocation(locationId);
  }

  function handleMapKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    const selector = mode === "turkey" ? "g[data-plakakodu]" : "[data-country-code]";
    const location = (event.target as Element).closest<SVGElement>(selector);
    const locationId = mode === "turkey" ? location?.dataset.plakakodu : location?.dataset.countryCode;
    if (locationId) { event.preventDefault(); chooseLocation(locationId); }
  }

  const leaderboard = leaderboards[leaderboardMode];

  const brand = <div className="shrink-0 border-b border-slate-200 pb-2 lg:pb-4">
    <p className="text-[9px] font-semibold tracking-[0.2em] text-cyan-700 uppercase lg:text-xs">Advanced Analytics</p>
    <p className="text-[10px] font-semibold text-slate-500 lg:mt-1 lg:text-sm">Harita Tahmin Oyunu</p>
  </div>;

  const playerCard = player && <div className="flex items-center gap-2 border-t border-slate-200 pt-2 lg:gap-3 lg:pt-4">
    {player.avatarUrl ? <Image alt="" className="h-7 w-7 shrink-0 rounded-full border border-cyan-200 object-cover lg:h-10 lg:w-10" height={40} referrerPolicy="no-referrer" src={player.avatarUrl} unoptimized width={40} /> : <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-700 lg:h-10 lg:w-10 lg:text-base">{player.name.slice(0, 1).toUpperCase()}</span>}
    <div className="min-w-0 flex-1">
      <p className="truncate text-[11px] font-bold text-slate-700 lg:text-sm" title={player.name}>{player.name}</p>
      <button className="text-[10px] font-semibold text-slate-400 underline-offset-2 transition hover:text-slate-600 hover:underline lg:text-xs" onClick={signOut} type="button">Çıkış yap</button>
    </div>
  </div>;

  const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <main className={`flex h-[100dvh] flex-col bg-slate-50 text-slate-900 ${phase === "ready" && !player ? "px-3 py-3 sm:px-5" : "p-1 lg:px-5 lg:py-3"}`} style={{ paddingLeft: "max(env(safe-area-inset-left), 0px)", paddingRight: "max(env(safe-area-inset-right), 0px)" }}>
      <div className="mx-auto flex min-h-0 w-full max-w-[90rem] flex-1 flex-col overflow-y-auto">
        {phase === "ready" && !player ? <section className="my-auto mx-auto w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-xl shadow-cyan-950/10 sm:p-8"><p className="text-sm font-semibold tracking-widest text-cyan-700 uppercase">Advanced Analytics</p><p className="mt-1 text-xl font-bold tracking-[0.15em] text-slate-800 uppercase sm:text-2xl">Harita Avcısı</p><h1 className="mt-4 text-2xl font-bold sm:text-3xl">Başlamak için giriş yap</h1><p className="mt-3 text-slate-600">Skorunun sıralamada görünmesi için Google ile giriş yap ya da misafir olarak devam et.</p><div className="mt-8"><div className="grid grid-cols-2 gap-3"><button className="flex h-12 items-center justify-center gap-3 rounded-xl border border-[#747775] bg-white px-4 text-sm font-medium text-[#1f1f1f] transition hover:bg-[#f8fafd] focus:ring-2 focus:ring-[#0b57d0] focus:ring-offset-2 focus:outline-none disabled:cursor-wait disabled:opacity-70" disabled={isSigningIn} onClick={signInWithGoogle}>Google</button><button className="h-12 rounded-xl border border-cyan-600 px-4 text-sm font-bold text-cyan-700 transition hover:bg-cyan-50 focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:outline-none disabled:cursor-wait disabled:opacity-70" disabled={isSigningIn} onClick={() => setIsGuestNameVisible(true)}>Misafir</button></div>{isGuestNameVisible && <form className="mt-4 flex gap-2" onSubmit={signInAsGuest}><label className="sr-only" htmlFor="guest-name">Sıralamada görünecek adın</label><input autoFocus className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" disabled={isSigningIn} id="guest-name" maxLength={40} onChange={(event) => setGuestName(event.target.value)} placeholder="Sıralamada görünecek adın" value={guestName} /><button className="rounded-xl bg-cyan-600 px-5 py-3 font-bold text-white transition hover:bg-cyan-500 focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:outline-none disabled:cursor-wait disabled:opacity-70" disabled={isSigningIn} type="submit">Tamam</button></form>}</div>{authError && <p className="mt-4 text-sm font-medium text-rose-600">{authError}</p>}{!supabaseConfigured && <p className="mt-4 text-sm font-medium text-rose-600">Oynamak için Supabase bağlantısı yapılandırılmalıdır.</p>}</section> : phase === "finished" ? <section className="flex min-h-0 flex-1 py-0 lg:py-2">
          <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-cyan-950/10 lg:rounded-3xl lg:shadow-xl">
            <aside className="flex w-36 shrink-0 flex-col justify-between gap-2 border-r border-slate-200 px-3 py-3 sm:w-44 lg:w-64 lg:gap-6 lg:px-6 lg:py-6 xl:w-72">
              {brand}
              <div>
                <p className="text-[10px] font-semibold tracking-[0.2em] text-cyan-700 uppercase lg:text-xs">Tur tamamlandı</p>
                <p className="mt-1 text-3xl font-bold tabular-nums lg:mt-2 lg:text-5xl">{score}<span className="text-lg text-slate-400 lg:text-2xl">/{questions.length}</span></p>
                <p className="mt-1 text-xs font-semibold text-slate-600 lg:text-sm">En uzun seri: {bestStreak}</p>
                <p className="text-xs font-semibold tabular-nums text-slate-600 lg:text-sm">Süre: {formatTime(Math.round(completionDurationMs / 1000))}</p>
              </div>
              <div className="flex flex-col gap-1.5 lg:gap-3">
                <button className={`w-full rounded-xl px-3 py-2 text-xs font-bold transition focus:ring-2 focus:ring-cyan-300 focus:outline-none lg:py-4 lg:text-base ${mode === "turkey" ? "bg-cyan-600 text-white hover:bg-cyan-500" : "border border-cyan-600 text-cyan-700 hover:bg-cyan-50"}`} onClick={() => startGame("turkey")} type="button">Türkiye haritası</button>
                <button className={`w-full rounded-xl px-3 py-2 text-xs font-bold transition focus:ring-2 focus:ring-cyan-300 focus:outline-none lg:py-4 lg:text-base ${mode === "world" ? "bg-cyan-600 text-white hover:bg-cyan-500" : "border border-cyan-600 text-cyan-700 hover:bg-cyan-50"}`} onClick={() => startGame("world")} type="button">Dünya haritası</button>
              </div>
              {playerCard}
            </aside>
            <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
              <div className="flex shrink-0 gap-1 border-b border-slate-200 px-2 pt-2 lg:gap-2 lg:px-6 lg:pt-4" role="tablist">
                <button aria-selected={leaderboardMode === "turkey"} className={`rounded-t-lg px-3 py-1.5 text-xs font-bold transition lg:px-5 lg:py-2.5 lg:text-base ${leaderboardMode === "turkey" ? "bg-white text-cyan-700 shadow-[inset_0_-2px_0_0_var(--color-cyan-600)]" : "text-slate-500 hover:text-cyan-700"}`} onClick={() => setLeaderboardMode("turkey")} role="tab" type="button">Türkiye</button>
                <button aria-selected={leaderboardMode === "world"} className={`rounded-t-lg px-3 py-1.5 text-xs font-bold transition lg:px-5 lg:py-2.5 lg:text-base ${leaderboardMode === "world" ? "bg-white text-cyan-700 shadow-[inset_0_-2px_0_0_var(--color-cyan-600)]" : "text-slate-500 hover:text-cyan-700"}`} onClick={() => setLeaderboardMode("world")} role="tab" type="button">Dünya</button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 lg:px-6 lg:py-5">
                {leaderboardError ? <p className="text-center text-xs font-medium text-rose-600 lg:text-sm">{leaderboardError}</p> : leaderboard.length === 0 ? <p className="text-center text-xs text-slate-500 lg:text-sm">{leaderboards.turkey.length === 0 && leaderboards.world.length === 0 ? "Sıralama yükleniyor..." : "Bu haritada henüz sonuç yok."}</p> : <>
                  <ol className="space-y-1.5 lg:space-y-2">{leaderboard.map((entry, index) => { const rank = index + 1; const isTop = rank <= 3; const topStyle = rank === 1 ? "bg-gradient-to-r from-emerald-600 to-emerald-400 text-white" : rank === 2 ? "bg-gradient-to-r from-emerald-400 to-emerald-200 text-emerald-950" : "bg-gradient-to-r from-emerald-200 to-emerald-50 text-emerald-900"; return <li className={`flex items-center justify-between rounded-lg lg:rounded-xl ${isTop ? `${topStyle} px-3 py-2.5 text-sm shadow-sm lg:px-5 lg:py-4 lg:text-lg` : `px-2.5 py-1.5 text-xs lg:px-4 lg:py-3 lg:text-base ${entry.user_id === player?.id ? "bg-cyan-50 text-cyan-950" : "bg-white"}`} ${entry.user_id === player?.id && isTop ? "ring-2 ring-cyan-500 ring-offset-1" : ""}`} key={entry.user_id}><span className="flex min-w-0 items-center gap-2 lg:gap-3"><strong className={`shrink-0 tabular-nums ${isTop ? "w-5 text-base lg:w-7 lg:text-2xl" : "w-4 text-cyan-700 lg:w-5"}`}>{rank}</strong>{isTop && (entry.avatar_url ? <Image alt="" className="h-6 w-6 shrink-0 rounded-full border border-white/70 object-cover lg:h-9 lg:w-9" height={36} referrerPolicy="no-referrer" src={entry.avatar_url} unoptimized width={36} /> : <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/70 text-[10px] font-bold text-emerald-800 lg:h-9 lg:w-9 lg:text-sm">{entry.display_name.slice(0, 1).toUpperCase()}</span>)}<span className={`truncate ${isTop ? "font-bold" : "font-medium"}`}>{entry.display_name}</span></span><span className="shrink-0 text-right font-bold tabular-nums"><span>{entry.score} puan</span><span className={`ml-1.5 font-semibold lg:ml-2 ${isTop ? "opacity-80" : "text-slate-500"} ${isTop ? "text-xs lg:text-sm" : "text-[10px] lg:text-xs"}`}>{formatTime(Math.round(entry.duration_ms / 1000))}</span></span></li>; })}</ol>
                </>}
              </div>
            </div>
          </div>
        </section> : <section className="flex min-h-0 flex-1 py-0 lg:py-2">
          <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-cyan-950/10 lg:rounded-3xl lg:shadow-xl">
            <aside className="flex w-36 shrink-0 flex-col justify-between gap-2 border-r border-slate-200 px-3 py-3 sm:w-44 lg:w-64 lg:gap-6 lg:px-6 lg:py-6 xl:w-72">
              {brand}
              {phase === "playing" ? <>
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.2em] text-cyan-700 uppercase lg:text-xs">{mode === "turkey" ? "Şehir" : "Ülke"}</p>
                  <h1 className="mt-1 text-xl leading-tight font-bold tracking-tight text-cyan-700 sm:text-2xl lg:mt-2 lg:text-4xl">{questionName}</h1>
                  {answerState && <span className="mt-2 inline-block rounded-full bg-cyan-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-cyan-800 lg:mt-3 lg:px-3 lg:py-1 lg:text-sm">Sonraki: {remainingQuestionSeconds} sn</span>}
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900 lg:text-2xl">{score} puan</p>
                  <div className="mt-2 grid grid-cols-5 gap-1 lg:mt-4 lg:grid-cols-10 lg:gap-1.5" aria-label="Soru ilerlemesi">{questions.map((_, index) => <span key={index} className={`h-2 rounded-full lg:h-3 ${answers[index] === "correct" ? "bg-emerald-500" : answers[index] === "incorrect" ? "bg-rose-500" : "bg-slate-200"}`} />)}</div>
                  <p className={`mt-4 text-xs font-semibold tabular-nums lg:mt-8 lg:text-base ${remainingGameSeconds <= 10 ? "text-rose-600" : remainingGameSeconds <= 30 ? "text-amber-600" : "text-slate-600"}`}>{formatTime(remainingGameSeconds)}</p>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 lg:h-2.5" role="progressbar" aria-label="Kalan süre" aria-valuemin={0} aria-valuemax={120} aria-valuenow={remainingGameSeconds}><div className={`h-full rounded-full transition-[width] duration-300 ease-linear ${remainingGameSeconds <= 10 ? "bg-rose-500" : remainingGameSeconds <= 30 ? "bg-amber-500" : "bg-cyan-500"}`} style={{ width: `${(remainingGameSeconds / 120) * 100}%` }} /></div>
                </div>
                {playerCard}
              </> : <>
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.2em] text-cyan-700 uppercase lg:text-xs">Harita seç</p>
                  <div className="mt-2 flex flex-col gap-2 lg:mt-4 lg:gap-3">
                    {(["turkey", "world"] as GameMode[]).map((option) => <button className={`rounded-xl border px-3 py-2 text-sm font-bold transition focus:ring-2 focus:ring-cyan-300 focus:outline-none lg:px-4 lg:py-3 lg:text-base ${mode === option ? "border-cyan-600 bg-cyan-600 text-white shadow" : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-cyan-700"}`} key={option} onClick={() => setMode(option)} type="button">{option === "turkey" ? "Türkiye" : "Dünya"}</button>)}
                  </div>
                  <p className="mt-2 hidden text-xs text-slate-500 lg:block">{copy.description}</p>
                </div>
                <div>
                  <button className="w-full rounded-xl bg-cyan-600 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-cyan-500 focus:ring-2 focus:ring-cyan-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 lg:py-4 lg:text-lg" disabled={!mapMarkup} onClick={() => startGame(mode)} type="button">Başla</button>
                </div>
                {playerCard}
              </>}
            </aside>
            <div className="relative flex min-h-0 flex-1 items-center justify-center bg-slate-50 p-1 lg:p-4">{mapMarkup ? <div className={`map ${mode === "turkey" ? "turkey-map" : "world-map"} ${phase === "playing" ? "" : "pointer-events-none opacity-70"}`} id="game-map" onClick={handleMapClick} onKeyDown={handleMapKeyDown} dangerouslySetInnerHTML={{ __html: mapMarkup }} /> : <div className="flex items-center justify-center text-center text-sm text-slate-400">{mapError ?? "Harita yükleniyor..."}</div>}</div>
          </div>
        </section>}
      </div>
      <div className="fixed inset-0 z-50 hidden flex-col items-center justify-center gap-4 bg-slate-900 px-8 text-center text-white portrait:max-lg:flex">
        <svg aria-hidden="true" className="h-16 w-16 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><rect height="14" rx="2" width="20" x="2" y="5" /><path d="M9 2.5 12 5 9 7.5" /><path d="M15 21.5 12 19l3-2.5" /></svg>
        <p className="text-xl font-bold">Telefonunu yan çevir</p>
        <p className="max-w-xs text-sm text-slate-300">Harita geniş olduğu için Harita Avcısı yatay modda oynanır.</p>
        <button className="rounded-full bg-cyan-500 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400" onClick={enterLandscape} type="button">Yatay moda geç</button>
      </div>
    </main>
  );
}
