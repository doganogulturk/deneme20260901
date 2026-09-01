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
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
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
    if (phase !== "playing" || !currentQuestion || answerState) return;
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
  }, [answerState, currentQuestion, phase]);

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
      const { data, error } = await supabaseClient.from("game_results").select("user_id, display_name, avatar_url, score, duration_ms, best_streak, created_at").eq("game_mode", mode).order("score", { ascending: false }).order("duration_ms", { ascending: true }).order("best_streak", { ascending: false }).order("created_at", { ascending: true });
      if (!isActive) return;
      if (error) setLeaderboardError("Sıralama yüklenemedi. Lütfen tekrar deneyin.");
      else {
        const bestResults = new Map<string, LeaderboardEntry>();
        for (const result of data ?? []) {
          if (!bestResults.has(result.user_id)) {
            bestResults.set(result.user_id, result);
          }
        }
        setLeaderboard([...bestResults.values()]);
      }
    };
    async function saveResultAndLoadLeaderboard() {
      const { error } = await supabaseClient.from("game_results").insert({ user_id: currentPlayer.id, display_name: currentPlayer.name, avatar_url: currentPlayer.avatarUrl, game_mode: mode, score, duration_ms: completionDurationMs, best_streak: bestStreak });
      if (error) {
        if (isActive) setLeaderboardError("Skor kaydedilemedi. Lütfen tekrar deneyin.");
        return;
      }
      await loadLeaderboard();
      channel = supabaseClient.channel(`live-leaderboard-${mode}`).on("postgres_changes", { event: "*", schema: "public", table: "game_results", filter: `game_mode=eq.${mode}` }, () => { void loadLeaderboard(); }).subscribe();
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
    setLeaderboard([]);
    setLeaderboardError(null);
    setPhase("playing");
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

  const podium = leaderboard.slice(0, 3);
  const remainingLeaderboard = leaderboard.slice(3);
  const nextMode: GameMode = mode === "turkey" ? "world" : "turkey";
  const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-3 text-slate-900 sm:px-5">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[90rem] flex-col">
        <header className="flex items-center justify-between py-2">
          <div><p className="text-sm font-semibold tracking-[0.2em] text-cyan-700 uppercase">Advanced Analytics</p><p className="mt-1 text-sm font-semibold text-slate-700">Harita Tahmin Oyunu</p></div>
          {player && <div className="flex items-center gap-2">{player.avatarUrl && <Image alt="" className="h-8 w-8 shrink-0 rounded-full border border-cyan-200 object-cover" height={32} referrerPolicy="no-referrer" src={player.avatarUrl} unoptimized width={32} />}<span className="min-w-0 flex-1 truncate rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700" title={player.name}>{player.name}</span><button className="shrink-0 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-100 focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:outline-none" onClick={signOut}>Çıkış yap</button></div>}
        </header>
        {phase === "ready" ? <section className="my-auto mx-auto w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-cyan-950/10"><p className="text-sm font-semibold tracking-widest text-cyan-700 uppercase">{copy.eyebrow}</p><h1 className="mt-4 text-3xl font-bold">{copy.title}</h1><p className="mt-3 text-slate-600">{copy.description}</p>{player ? <div className="mt-8"><button className="w-full rounded-2xl bg-cyan-600 px-5 py-4 font-bold text-white transition hover:bg-cyan-500 focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:outline-none" onClick={() => startGame("turkey")}>Oyuna başla</button></div> : <div className="mt-8"><div className="grid grid-cols-2 gap-3"><button className="flex h-12 items-center justify-center gap-3 rounded-xl border border-[#747775] bg-white px-4 text-sm font-medium text-[#1f1f1f] transition hover:bg-[#f8fafd] focus:ring-2 focus:ring-[#0b57d0] focus:ring-offset-2 focus:outline-none disabled:cursor-wait disabled:opacity-70" disabled={isSigningIn} onClick={signInWithGoogle}>Google</button><button className="h-12 rounded-xl border border-cyan-600 px-4 text-sm font-bold text-cyan-700 transition hover:bg-cyan-50 focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:outline-none disabled:cursor-wait disabled:opacity-70" disabled={isSigningIn} onClick={() => setIsGuestNameVisible(true)}>Misafir</button></div>{isGuestNameVisible && <form className="mt-4 flex gap-2" onSubmit={signInAsGuest}><label className="sr-only" htmlFor="guest-name">Sıralamada görünecek adın</label><input autoFocus className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" disabled={isSigningIn} id="guest-name" maxLength={40} onChange={(event) => setGuestName(event.target.value)} placeholder="Sıralamada görünecek adın" value={guestName} /><button className="rounded-xl bg-cyan-600 px-5 py-3 font-bold text-white transition hover:bg-cyan-500 focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:outline-none disabled:cursor-wait disabled:opacity-70" disabled={isSigningIn} type="submit">Tamam</button></form>}</div>}{authError && <p className="mt-4 text-sm font-medium text-rose-600">{authError}</p>}{!supabaseConfigured && <p className="mt-4 text-sm font-medium text-rose-600">Oynamak için Supabase bağlantısı yapılandırılmalıdır.</p>}</section> : phase === "finished" ? <section className="my-auto mx-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-cyan-950/10"><p className="text-sm font-semibold tracking-widest text-cyan-700 uppercase">Tur tamamlandı</p><h1 className="mt-4 text-5xl font-bold">{score} / {questions.length}</h1><p className="mt-3 text-slate-600">En uzun serin: {bestStreak}</p><div className="mt-8 border-t border-slate-200 pt-6 text-left"><h2 className="text-center text-lg font-bold">{copy.eyebrow} sıralaması</h2>{leaderboardError ? <p className="mt-4 text-center text-sm font-medium text-rose-600">{leaderboardError}</p> : leaderboard.length === 0 ? <p className="mt-4 text-center text-sm text-slate-500">Sıralama yükleniyor...</p> : <><div className="mt-6 grid grid-cols-3 items-end gap-2 text-center sm:gap-4">{[podium[1], podium[0], podium[2]].map((entry, index) => { if (!entry) return <div key={index} />; const rank = index === 0 ? 2 : index === 1 ? 1 : 3; return <div className="rounded-t-2xl border border-slate-200 bg-slate-50 px-2 pt-3 pb-3" key={entry.user_id}><p className="text-2xl font-bold text-slate-500">{rank}</p>{entry.avatar_url ? <Image alt="" className="mx-auto mt-2 h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm" height={40} referrerPolicy="no-referrer" src={entry.avatar_url} unoptimized width={40} /> : <div className="mx-auto mt-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-500 shadow-sm">{entry.display_name.slice(0, 1).toUpperCase()}</div>}<p className="mt-2 truncate text-sm font-bold">{entry.display_name}</p><p className="text-xs font-semibold text-slate-600">{entry.score} puan</p></div>; })}</div>{remainingLeaderboard.length > 0 && <ol className="mt-4 space-y-2">{remainingLeaderboard.map((entry, index) => <li className={`flex items-center justify-between rounded-xl px-4 py-3 ${entry.user_id === player?.id ? "bg-cyan-50 text-cyan-950" : "bg-slate-50"}`} key={entry.user_id}><span className="flex min-w-0 items-center gap-3"><strong className="w-5 text-cyan-700">{index + 4}</strong><span className="truncate font-medium">{entry.display_name}</span></span><span className="shrink-0 font-bold">{entry.score} puan</span></li>)}</ol>}</>}</div><div className="mt-8 grid gap-3 sm:grid-cols-2"><button className="rounded-2xl bg-cyan-600 px-5 py-4 font-bold text-white transition hover:bg-cyan-500 focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:outline-none" onClick={() => startGame(mode)}>Yeni tur başlat</button><button className="rounded-2xl border border-cyan-600 px-5 py-4 font-bold text-cyan-700 transition hover:bg-cyan-50 focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:outline-none" onClick={() => startGame(nextMode)}>{copy.nextLabel}</button></div></section> : <section className="flex flex-1 py-2"><div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-cyan-950/10"><div className="flex flex-col gap-6 border-b border-slate-200 px-6 py-6 sm:px-10 lg:flex-row lg:items-center lg:justify-between"><div className="text-left"><div className="flex flex-wrap items-center gap-3"><h1 className="text-4xl font-bold tracking-tight text-cyan-700 sm:text-5xl">{questionName}</h1>{answerState && <span className="rounded-full bg-cyan-100 px-3 py-1 text-sm font-bold tabular-nums text-cyan-800">Sonraki şehir: {remainingQuestionSeconds} sn</span>}</div></div><div className="w-full text-right lg:max-w-96"><p className="text-lg font-bold text-slate-900">{score} puan</p><p className="mt-1 text-sm font-semibold tabular-nums text-slate-600">Toplam süre: {formatTime(remainingGameSeconds)}</p><div className="mt-3 grid grid-cols-10 gap-1.5" aria-label="Soru ilerlemesi">{questions.map((_, index) => <span key={index} className={`h-3 rounded-full ${answers[index] === "correct" ? "bg-emerald-500" : answers[index] === "incorrect" ? "bg-rose-500" : "bg-slate-200"}`} />)}</div></div></div><div className="relative flex flex-1 items-center bg-slate-50 p-2 sm:p-4">{mapMarkup ? <div className={`map w-full ${mode === "turkey" ? "turkey-map" : "world-map"}`} id="game-map" onClick={handleMapClick} onKeyDown={handleMapKeyDown} dangerouslySetInnerHTML={{ __html: mapMarkup }} /> : <div className="flex aspect-[2/1] items-center justify-center text-center text-sm text-slate-400">{mapError ?? "Harita yükleniyor..."}</div>}</div></div></section>}
      </div>
    </main>
  );
}
