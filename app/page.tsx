"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import {
  choicesFor,
  createRound,
  type Province,
} from "@/lib/turkish-plates";

type AnswerState = "correct" | "incorrect" | null;
type GamePhase = "loading" | "sign-in" | "ready" | "playing" | "finished";

type Game = {
  choices: number[];
  questions: Province[];
};

type LeaderboardEntry = {
  best_streak: number;
  display_name: string;
  score: number;
  user_id: string;
};

function createGame(): Game {
  const questions = createRound();

  return {
    choices: choicesFor(questions[0]),
    questions,
  };
}

function formatPlate(plate: number) {
  return plate.toString().padStart(2, "0");
}

function displayNameFor(user: { email?: string; user_metadata: Record<string, unknown> }) {
  const name = user.user_metadata.full_name ?? user.user_metadata.name;
  return typeof name === "string" && name.trim() ? name.trim() : user.email ?? "Oyuncu";
}

export default function Home() {
  const [game, setGame] = useState<Game>(createGame);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState>(null);
  const [phase, setPhase] = useState<GamePhase>(() => getSupabaseClient() ? "loading" : "sign-in");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("Oyuncu");
  const [authMessage, setAuthMessage] = useState<string | null>(() => getSupabaseClient() ? null : "Oyuna başlayabilmek için Supabase ayarlarını tamamlayın.");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const currentQuestion = game.questions[questionIndex];

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    function updateUser(user: { email?: string; user_metadata: Record<string, unknown> } | null) {
      setUserEmail(user?.email ?? null);
      setDisplayName(user ? displayNameFor(user) : "Oyuncu");
      setPhase(user ? "ready" : "sign-in");
    }

    void supabase.auth.getUser().then(({ data }) => updateUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      updateUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userEmail) return;

    const client = getSupabaseClient();
    if (!client) return;
    const leaderboardClient = client;

    async function loadLeaderboard() {
      const { data, error } = await leaderboardClient
        .from("leaderboard")
        .select("user_id, display_name, score, best_streak")
        .order("score", { ascending: false })
        .order("best_streak", { ascending: false });

      if (error) {
        setAuthMessage("Sıralama yüklenemedi: " + error.message);
        return;
      }

      setLeaderboard(data ?? []);
    }

    void loadLeaderboard();
    const channel = leaderboardClient
      .channel("game-results-leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "game_results" }, () => {
        void loadLeaderboard();
      })
      .subscribe();

    return () => {
      void leaderboardClient.removeChannel(channel);
    };
  }, [userEmail]);

  function startGame() {
    setGame(createGame());
    setQuestionIndex(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setAnswerState(null);
    setPhase("playing");
  }

  async function signInWithGoogle() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setAuthMessage("Google ile giriş için önce Supabase ayarlarını tamamlayın.");
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });

    if (error) setAuthMessage(error.message);
  }

  async function signOut() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  function choosePlate(plate: number) {
    if (!currentQuestion || answerState) return;

    const isCorrect = plate === currentQuestion.plate;
    const nextStreak = isCorrect ? streak + 1 : 0;

    setAnswerState(isCorrect ? "correct" : "incorrect");
    setScore((currentScore) => currentScore + (isCorrect ? 1 : 0));
    setStreak(nextStreak);
    setBestStreak((currentBest) => Math.max(currentBest, nextStreak));
  }

  async function saveResult(finalScore: number, finalBestStreak: number) {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    const { error } = await supabase.from("game_results").insert({
      best_streak: Math.min(10, Math.max(0, finalBestStreak)),
      display_name: displayNameFor(data.user),
      score: Math.min(10, Math.max(0, finalScore)),
      user_id: data.user.id,
    });

    if (error) setAuthMessage("Skor kaydedilemedi: " + error.message);
  }

  useEffect(() => {
    if (phase !== "playing" || !answerState || !currentQuestion) return;

    const timer = window.setTimeout(() => {
      if (questionIndex === game.questions.length - 1) {
        setPhase("finished");
        void saveResult(score, bestStreak);
        return;
      }

      const nextIndex = questionIndex + 1;
      setQuestionIndex(nextIndex);
      setGame((currentGame) => ({
        ...currentGame,
        choices: choicesFor(currentGame.questions[nextIndex]),
      }));
      setAnswerState(null);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [answerState, bestStreak, currentQuestion, game.questions, phase, questionIndex, score, streak]);

  if (!currentQuestion) {
    return <main className="min-h-screen bg-slate-950" />;
  }

  const isPlaying = phase === "playing";

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-cyan-300 uppercase">Plaka Peşinde</p>
            <p className="mt-1 text-sm text-slate-400">Arkadaşlarınla yarışmaya hazır ol.</p>
          </div>
          {userEmail && (
            <button
              className="max-w-40 truncate rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300 hover:border-cyan-300"
              onClick={signOut}
              title="Oturumu kapat"
            >
              {userEmail}
            </button>
          )}
        </header>

        {phase === "loading" ? (
          <section className="my-auto text-center text-slate-400">Oturum kontrol ediliyor...</section>
        ) : phase === "sign-in" ? (
          <section className="my-auto rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl shadow-cyan-950/30">
            <h1 className="text-3xl font-bold">Yarışmaya katıl</h1>
            <p className="mt-3 text-slate-300">Oyuna başlayıp skorunu sıralamada görmek için Google ile giriş yap.</p>
            <button
              className="mt-8 w-full rounded-2xl bg-cyan-400 px-5 py-4 font-bold text-slate-950 transition hover:bg-cyan-300 focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
              onClick={signInWithGoogle}
            >
              Google ile giriş yap
            </button>
          </section>
        ) : phase === "ready" ? (
          <section className="my-auto rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl shadow-cyan-950/30">
            <p className="text-sm font-semibold tracking-widest text-cyan-300 uppercase">Hoş geldin, {displayName}</p>
            <h1 className="mt-4 text-3xl font-bold">Plakaları ne kadar iyi biliyorsun?</h1>
            <p className="mt-3 text-slate-300">10 soruyu cevapla ve genel sıralamadaki yerini gör.</p>
            <button
              className="mt-8 w-full rounded-2xl bg-cyan-400 px-5 py-4 font-bold text-slate-950 transition hover:bg-cyan-300 focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
              onClick={startGame}
            >
              Oyuna başla
            </button>
          </section>
        ) : phase === "finished" ? (
          <section className="my-auto rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl shadow-cyan-950/30">
            <p className="text-sm font-semibold tracking-widest text-cyan-300 uppercase">Tur tamamlandı</p>
            <h1 className="mt-4 text-4xl font-bold">{score} / 10</h1>
            <p className="mt-3 text-slate-300">En uzun serin: {bestStreak}</p>
            <div className="mt-8 text-left">
              <h2 className="text-lg font-bold">Genel sıralama</h2>
              <ol className="mt-3 space-y-2">
                {leaderboard.map((entry, index) => (
                  <li className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3" key={entry.user_id}>
                    <span className="min-w-0 truncate"><span className="mr-3 text-cyan-300">{index + 1}.</span>{entry.display_name}</span>
                    <span className="ml-4 whitespace-nowrap font-bold">{entry.score} puan</span>
                  </li>
                ))}
              </ol>
            </div>
            <button
              className="mt-8 w-full rounded-2xl bg-cyan-400 px-5 py-4 font-bold text-slate-950 transition hover:bg-cyan-300 focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
              onClick={startGame}
            >
              Yeni tur başlat
            </button>
          </section>
        ) : (
          <section className="my-auto">
            <div className="mb-8 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-slate-900 p-3"><p className="text-xs text-slate-400">Soru</p><p className="mt-1 font-bold">{questionIndex + 1} / 10</p></div>
              <div className="rounded-2xl bg-slate-900 p-3"><p className="text-xs text-slate-400">Puan</p><p className="mt-1 font-bold">{score}</p></div>
              <div className="rounded-2xl bg-slate-900 p-3"><p className="text-xs text-slate-400">Seri</p><p className="mt-1 font-bold">{streak}</p></div>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7 text-center shadow-2xl shadow-cyan-950/30 sm:p-10">
              <p className="text-sm font-medium text-slate-400">Bu şehrin plakası kaç?</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{currentQuestion.city}</h1>
              <div className="mt-10 grid grid-cols-2 gap-3">
                {game.choices.map((plate) => {
                  const isCorrectChoice = plate === currentQuestion.plate;
                  const isSelected = answerState && plate !== currentQuestion.plate;
                  const stateClass = answerState === "correct" && isCorrectChoice ? "border-emerald-400 bg-emerald-400 text-slate-950" : answerState === "incorrect" && isCorrectChoice ? "border-emerald-400 bg-emerald-400 text-slate-950" : isSelected ? "border-rose-400 bg-rose-400 text-slate-950" : "border-slate-700 bg-slate-800 hover:border-cyan-300 hover:bg-slate-700";
                  return <button className={`rounded-2xl border px-4 py-5 text-2xl font-bold transition focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none disabled:cursor-default ${stateClass}`} disabled={answerState !== null} key={plate} onClick={() => choosePlate(plate)}>{formatPlate(plate)}</button>;
                })}
              </div>
              {answerState && <p className={answerState === "correct" ? "mt-7 font-semibold text-emerald-300" : "mt-7 font-semibold text-rose-300"}>{answerState === "correct" ? "Doğru cevap! Sıradaki soru 3 saniye içinde geliyor." : `Doğru cevap: ${formatPlate(currentQuestion.plate)}. Sıradaki soru 3 saniye içinde geliyor.`}</p>}
            </div>
          </section>
        )}

        <footer className="pt-8 text-center text-xs text-slate-500">{authMessage ?? (isPlaying ? "Her cevap sonrası sıradaki soru otomatik gelir." : "Skorların genel sıralamaya kaydedilir.")}</footer>
      </div>
    </main>
  );
}
