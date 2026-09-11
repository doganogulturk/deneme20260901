"use client";

import { useEffect, useRef, useState } from "react";
import { GameMap } from "./components/GameMap";
import { GameShell } from "./components/GameShell";
import { Leaderboard } from "./components/Leaderboard";
import { GameTopBar } from "./components/GameTopBar";
import { IntroScreen } from "./components/IntroScreen";
import { RotateOverlay } from "./components/RotateOverlay";
import { RoundSummary } from "./components/RoundSummary";
import { SignInCard } from "./components/SignInCard";
import { useLeaderboard } from "@/lib/hooks/useLeaderboard";
import { loadMapMarkup, useMapMarkup } from "@/lib/hooks/useMapMarkup";
import { usePlayer } from "@/lib/hooks/usePlayer";
import { getSupabaseClient } from "@/lib/supabase";
import { createRound } from "@/lib/turkish-plates";
import { createWorldRound, type WorldDifficulty } from "@/lib/world-countries";
import {
  correctLocationId,
  GAME_DURATION_MS,
  GAME_MODES,
  GAME_DURATION_SECONDS,
  isSameLocation,
  QUESTION_TRANSITION_MS,
  type AnswerState,
  type GameMode,
  type GamePhase,
  type Question,
} from "@/lib/game";

const QUESTION_TRANSITION_SECONDS = QUESTION_TRANSITION_MS / 1000;

function roundFor(mode: GameMode, difficulty: WorldDifficulty): Question[] {
  return mode === "turkey" ? createRound() : createWorldRound(difficulty);
}

export default function Home() {
  const [mode, setMode] = useState<GameMode>("turkey");
  const [phase, setPhase] = useState<GamePhase>("ready");
  const [worldDifficulty, setWorldDifficulty] = useState<WorldDifficulty>("normal");
  const [questions, setQuestions] = useState<Question[]>(() => roundFor("turkey", "normal"));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [answerState, setAnswerState] = useState<AnswerState>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [completionDurationMs, setCompletionDurationMs] = useState(0);
  const [remainingGameSeconds, setRemainingGameSeconds] = useState(GAME_DURATION_SECONDS);
  const [remainingQuestionSeconds, setRemainingQuestionSeconds] = useState(QUESTION_TRANSITION_SECONDS);
  const gameStartedAt = useRef<number | null>(null);

  const [player, setPlayer] = usePlayer();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [leaderboardMode, setLeaderboardMode] = useState<GameMode>("turkey");
  const [readyModes, setReadyModes] = useState<GameMode[]>([]);

  const { mapMarkup, mapError } = useMapMarkup(mode);
  const { leaderboards, leaderboardError, resetLeaderboards } = useLeaderboard({
    player,
    isFinished: phase === "finished",
    mode,
    score,
    durationMs: completionDurationMs,
    bestStreak,
  });

  const currentQuestion = questions[questionIndex];
  const supabaseConfigured = getSupabaseClient() !== null;

  // Her iki harita da baştan indirilir; giriş ekranındaki iki "Oyna" da anında başlayabilsin.
  useEffect(() => {
    let isActive = true;
    GAME_MODES.forEach((option) => {
      void loadMapMarkup(option).then(
        () => {
          if (isActive) setReadyModes((current) => (current.includes(option) ? current : [...current, option]));
        },
        () => {},
      );
    });
    return () => { isActive = false; };
  }, []);

  // Turun toplam süresini geri sayar ve süre dolunca turu bitirir.
  useEffect(() => {
    if (phase !== "playing") return;
    const updateRemaining = () => {
      const elapsedMs = gameStartedAt.current === null ? 0 : performance.now() - gameStartedAt.current;
      const remainingSeconds = Math.max(0, Math.ceil((GAME_DURATION_MS - elapsedMs) / 1000));
      setRemainingGameSeconds(remainingSeconds);
      if (remainingSeconds === 0) {
        setCompletionDurationMs(GAME_DURATION_MS);
        setPhase("finished");
      }
    };
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 250);
    return () => window.clearInterval(timer);
  }, [phase]);

  // Cevaptan sonra doğru cevabı gösterir, ardından sonraki soruya geçer.
  useEffect(() => {
    if (phase !== "playing" || !answerState) return;
    const startedAt = performance.now();
    const countdown = window.setInterval(
      () => setRemainingQuestionSeconds(Math.max(0, Math.ceil((QUESTION_TRANSITION_MS - (performance.now() - startedAt)) / 1000))),
      100,
    );
    const timer = window.setTimeout(() => {
      if (questionIndex === questions.length - 1) {
        setPhase("finished");
        return;
      }
      setQuestionIndex((currentIndex) => currentIndex + 1);
      setAnswerState(null);
      setSelectedLocation(null);
    }, QUESTION_TRANSITION_MS);

    return () => {
      window.clearInterval(countdown);
      window.clearTimeout(timer);
    };
  }, [answerState, phase, questionIndex, questions.length]);

  async function signInWithGoogle() {
    const supabase = getSupabaseClient();
    if (!supabase) return setAuthError("Supabase bağlantısı yapılandırılmalıdır.");
    setIsSigningIn(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (error) {
      setAuthError("Google ile giriş başlatılamadı. Lütfen tekrar deneyin.");
      setIsSigningIn(false);
    }
  }

  async function signInAsGuest(rawName: string) {
    const name = rawName.trim();
    if (!name) return setAuthError("Sıralamada görünmek için bir ad yazın.");
    const supabase = getSupabaseClient();
    if (!supabase) return setAuthError("Supabase bağlantısı yapılandırılmalıdır.");
    setIsSigningIn(true);
    setAuthError(null);
    const { data, error } = await supabase.auth.signInAnonymously({ options: { data: { display_name: name } } });
    if (error || !data.user) {
      setAuthError(`Misafir oturumu başlatılamadı: ${error?.message ?? "Supabase kullanıcı oluşturmadı."}`);
      setIsSigningIn(false);
      return;
    }
    setPlayer({ id: data.user.id, name, avatarUrl: null });
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

  function startGame(nextMode: GameMode, nextDifficulty: WorldDifficulty = worldDifficulty) {
    setMode(nextMode);
    setWorldDifficulty(nextDifficulty);
    setQuestions(roundFor(nextMode, nextDifficulty));
    setQuestionIndex(0);
    setAnswers([]);
    setAnswerState(null);
    setSelectedLocation(null);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setCompletionDurationMs(0);
    setRemainingGameSeconds(GAME_DURATION_SECONDS);
    setRemainingQuestionSeconds(QUESTION_TRANSITION_SECONDS);
    gameStartedAt.current = performance.now();
    setLeaderboardMode(nextMode);
    resetLeaderboards();
    setPhase("playing");
  }

  function chooseLocation(locationId: string) {
    if (phase !== "playing" || !currentQuestion || answerState) return;
    const isCorrect = isSameLocation(mode, locationId, correctLocationId(currentQuestion));
    const isLastQuestion = questionIndex === questions.length - 1;

    if (isLastQuestion) {
      const elapsedMs = gameStartedAt.current === null ? 0 : performance.now() - gameStartedAt.current;
      setCompletionDurationMs(Math.round(Math.min(GAME_DURATION_MS, elapsedMs)));
    }

    const nextStreak = isCorrect ? streak + 1 : 0;
    setRemainingQuestionSeconds(QUESTION_TRANSITION_SECONDS);
    setSelectedLocation(locationId);
    setAnswerState(isCorrect ? "correct" : "incorrect");
    setAnswers((currentAnswers) => [...currentAnswers, isCorrect ? "correct" : "incorrect"]);
    setScore((currentScore) => currentScore + (isCorrect ? 1 : 0));
    setStreak(nextStreak);
    setBestStreak((currentBest) => Math.max(currentBest, nextStreak));
  }

  const isSignedOut = !player;

  return (
    <main
      className={`flex h-[100dvh] flex-col bg-slate-50 text-slate-900 ${phase === "playing" ? "p-0" : "px-3 py-3 sm:px-5 lg:px-6 lg:py-4"}`}
      style={{ paddingLeft: "max(env(safe-area-inset-left), 0px)", paddingRight: "max(env(safe-area-inset-right), 0px)" }}
    >
      <div className={`mx-auto flex min-h-0 w-full flex-1 flex-col ${phase === "playing" ? "max-w-none" : "max-w-[90rem] overflow-y-auto"}`}>
        {isSignedOut ? (
          <SignInCard
            authError={authError}
            isSigningIn={isSigningIn}
            onGoogleSignIn={signInWithGoogle}
            onGuestSignIn={signInAsGuest}
            supabaseConfigured={supabaseConfigured}
          />
        ) : phase === "ready" ? (
          <IntroScreen onPlay={startGame} onSignOut={signOut} player={player} readyModes={readyModes} />
        ) : phase === "finished" ? (
          <GameShell
            onSignOut={signOut}
            player={player}
            sidebar={
              <RoundSummary
                bestStreak={bestStreak}
                durationMs={completionDurationMs}
                mode={mode}
                onRestart={startGame}
                questionCount={questions.length}
                score={score}
              />
            }
          >
            <Leaderboard
              currentPlayerId={player?.id}
              leaderboardError={leaderboardError}
              leaderboardMode={leaderboardMode}
              leaderboards={leaderboards}
              onLeaderboardModeChange={setLeaderboardMode}
            />
          </GameShell>
        ) : (
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
            <GameTopBar
              answers={answers}
              answerState={answerState}
              onSignOut={signOut}
              player={player}
              question={currentQuestion}
              questionCount={questions.length}
              remainingGameSeconds={remainingGameSeconds}
              remainingQuestionSeconds={remainingQuestionSeconds}
              score={score}
            />
            <GameMap
              answerState={answerState}
              isInteractive
              mapError={mapError}
              mapMarkup={mapMarkup}
              mode={mode}
              onSelect={chooseLocation}
              question={currentQuestion}
              selectedLocation={selectedLocation}
            />
          </section>
        )}
      </div>

      <RotateOverlay />
    </main>
  );
}
