"use client";

import { useEffect, useRef, useState } from "react";
import { GameMap } from "./components/GameMap";
import { GameTopBar } from "./components/GameTopBar";
import { IntroScreen } from "./components/IntroScreen";
import { ResultScreen } from "./components/ResultScreen";
import { RotateOverlay } from "./components/RotateOverlay";
import { useLeaderboard } from "@/lib/hooks/useLeaderboard";
import { loadMapMarkup, useMapMarkup } from "@/lib/hooks/useMapMarkup";
import { usePlayer } from "@/lib/hooks/usePlayer";
import { getSupabaseClient } from "@/lib/supabase";
import { createRound } from "@/lib/turkish-plates";
import { createWorldRound } from "@/lib/world-countries";
import {
  boardIdFor,
  correctLocationId,
  GAME_DURATION_MS,
  GAME_DURATION_SECONDS,
  GAME_MODES,
  isSameLocation,
  QUESTION_TRANSITION_MS,
  type AnswerState,
  type BoardId,
  type GameMode,
  type GamePhase,
  type PlayChoice,
  type Question,
} from "@/lib/game";

const QUESTION_TRANSITION_SECONDS = QUESTION_TRANSITION_MS / 1000;
const PENDING_CHOICE_KEY = "harita-avcisi:pending-choice";

/**
 * Google ile giriş sayfadan ayrılıp geri döndüğü için, giriş öncesi yapılan tur
 * seçimi sekme belleğinde saklanır; dönüşte o tur doğrudan başlar.
 */
function readPendingChoice(): PlayChoice | null {
  try {
    const raw = sessionStorage.getItem(PENDING_CHOICE_KEY);
    return raw ? (JSON.parse(raw) as PlayChoice) : null;
  } catch {
    return null;
  }
}

function writePendingChoice(choice: PlayChoice | null) {
  try {
    if (choice) sessionStorage.setItem(PENDING_CHOICE_KEY, JSON.stringify(choice));
    else sessionStorage.removeItem(PENDING_CHOICE_KEY);
  } catch {
    // Sekme belleği kullanılamıyorsa seçim yalnızca bu sayfa yaşamı boyunca hatırlanır.
  }
}

function roundFor({ mode, difficulty }: PlayChoice): Question[] {
  return mode === "turkey" ? createRound() : createWorldRound(difficulty);
}

export default function Home() {
  const [choice, setChoice] = useState<PlayChoice>({ mode: "turkey", difficulty: "normal" });
  const mode = choice.mode;
  const [phase, setPhase] = useState<GamePhase>("ready");
  const [questions, setQuestions] = useState<Question[]>(() => roundFor({ mode: "turkey", difficulty: "normal" }));
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

  const [pendingChoice, setPendingChoice] = useState<PlayChoice | null>(null);
  // Google girişinden dönüldüğünde, giriş öncesi seçilen tur geri alınır.
  const [player, setPlayer] = usePlayer(() => {
    const restored = readPendingChoice();
    if (restored) setPendingChoice(restored);
  });
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [boardId, setBoardId] = useState<BoardId>("turkey");
  const [readyModes, setReadyModes] = useState<GameMode[]>([]);

  const { mapMarkup, mapError } = useMapMarkup(mode);
  const { leaderboards, leaderboardError, resetLeaderboards, playedBoardId } = useLeaderboard({
    player,
    isFinished: phase === "finished",
    choice,
    score,
    durationMs: completionDurationMs,
    bestStreak,
  });

  const currentQuestion = questions[questionIndex];
  const supabaseConfigured = getSupabaseClient() !== null;

  // Her iki harita da baştan indirilir; giriş ekranındaki her "Oyna" anında başlayabilsin.
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

  function startGame(nextChoice: PlayChoice) {
    setChoice(nextChoice);
    setQuestions(roundFor(nextChoice));
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
    setBoardId(boardIdFor(nextChoice));
    setPendingChoice(null);
    resetLeaderboards();
    setPhase("playing");
  }

  /** Giriş yapılmışsa tur hemen başlar; yapılmamışsa seçim saklanıp giriş adımı açılır. */
  function play(choice: PlayChoice) {
    if (player) {
      startGame(choice);
      return;
    }
    setAuthError(null);
    setPendingChoice(choice);
    writePendingChoice(choice);
  }

  function cancelPendingChoice() {
    setPendingChoice(null);
    setAuthError(null);
    writePendingChoice(null);
  }

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
    writePendingChoice(null);
    if (pendingChoice) startGame(pendingChoice);
  }

  async function signOut() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) return setAuthError("Çıkış yapılamadı. Lütfen tekrar deneyin.");
    setPlayer(null);
    setPhase("ready");
    setAuthError(null);
    cancelPendingChoice();
  }

  function chooseLocation(locationId: string) {
    if (phase !== "playing" || !currentQuestion || answerState) return;
    const isCorrect = isSameLocation(mode, locationId, correctLocationId(currentQuestion));

    if (questionIndex === questions.length - 1) {
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

  return (
    <main
      className={`flex h-[100dvh] flex-col bg-slate-50 text-slate-900 ${phase === "playing" ? "p-0" : "px-3 py-3 sm:px-5 lg:px-6 lg:py-4"}`}
      style={{ paddingLeft: "max(env(safe-area-inset-left), 0px)", paddingRight: "max(env(safe-area-inset-right), 0px)" }}
    >
      <div className={`mx-auto flex min-h-0 w-full flex-1 flex-col ${phase === "playing" ? "max-w-none" : "max-w-[90rem] overflow-y-auto"}`}>
        {phase === "ready" ? (
          <IntroScreen
            authError={authError}
            isSigningIn={isSigningIn}
            onCancelPendingChoice={cancelPendingChoice}
            onGoogleSignIn={signInWithGoogle}
            onGuestSignIn={signInAsGuest}
            onPlay={play}
            onSignOut={signOut}
            pendingChoice={pendingChoice}
            player={player}
            readyModes={readyModes}
            supabaseConfigured={supabaseConfigured}
          />
        ) : phase === "finished" ? (
          <ResultScreen
            bestStreak={bestStreak}
            durationMs={completionDurationMs}
            boardId={boardId}
            leaderboardError={leaderboardError}
            leaderboards={leaderboards}
            onBoardChange={setBoardId}
            onPlay={play}
            onSignOut={signOut}
            playedBoardId={playedBoardId}
            player={player}
            questionCount={questions.length}
            score={score}
          />
        ) : (
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
            <GameTopBar
              answers={answers}
              answerState={answerState}
              choice={choice}
              onPlay={play}
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
