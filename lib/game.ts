import { type Province } from "@/lib/turkish-plates";
import { type Country, type WorldDifficulty } from "@/lib/world-countries";

export type AnswerState = "correct" | "incorrect" | null;
export type GameMode = "turkey" | "world";
export type GamePhase = "ready" | "playing" | "finished";
export type Question = Province | Country;
export type Player = { id: string; name: string; avatarUrl: string | null };
export type LeaderboardEntry = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  score: number;
  duration_ms: number;
  best_streak: number;
};

/** Oyuncunun giriş ekranında seçtiği tur. Giriş gerekiyorsa giriş bitene kadar saklanır. */
export type PlayChoice = { mode: GameMode; difficulty: WorldDifficulty };

export function choiceLabel({ mode, difficulty }: PlayChoice): string {
  if (mode === "turkey") return "Türkiye";
  return difficulty === "hard" ? "Dünya · Zor" : "Dünya · Normal";
}

export const GAME_DURATION_MS = 120000;
export const GAME_DURATION_SECONDS = GAME_DURATION_MS / 1000;
export const QUESTION_TRANSITION_MS = 3000;
export const LEADERBOARD_LIMIT = 50;

export const MAP_URLS: Record<GameMode, string> = {
  turkey: "/maps/turkey.svg",
  world: "/maps/world.svg",
};

export const MAP_LABELS: Record<GameMode, string> = {
  turkey: "Türkiye il haritası",
  world: "Dünya ülkeleri haritası",
};

export const GAME_MODES: GameMode[] = ["turkey", "world"];

/** Her oynanış türünün kendi sıralaması var; Zor turlar Normal'lerle yarışmaz. */
export type BoardId = "turkey" | "world" | "world-hard";

export const BOARDS: { id: BoardId; label: string; mode: GameMode; variant: WorldDifficulty }[] = [
  { id: "turkey", label: "Türkiye", mode: "turkey", variant: "normal" },
  { id: "world", label: "Dünya", mode: "world", variant: "normal" },
  { id: "world-hard", label: "Dünya · Zor", mode: "world", variant: "hard" },
];

export function choiceForBoard(board: { mode: GameMode; variant: WorldDifficulty }): PlayChoice {
  return { mode: board.mode, difficulty: board.variant };
}

export function boardIdFor({ mode, difficulty }: PlayChoice): BoardId {
  if (mode === "turkey") return "turkey";
  return difficulty === "hard" ? "world-hard" : "world";
}

export const LOCATION_SELECTOR: Record<GameMode, string> = {
  turkey: "g[data-plakakodu]",
  world: "[data-country-code]",
};

export function questionName(question: Question): string {
  return "city" in question ? question.city : question.name;
}

export function correctLocationId(question: Question): string {
  return "city" in question ? String(question.plate) : question.code;
}

export function locationIdOf(element: SVGElement | null | undefined, mode: GameMode): string | undefined {
  return mode === "turkey" ? element?.dataset.plakakodu : element?.dataset.countryCode;
}

export function isSameLocation(mode: GameMode, first: string | null | undefined, second: string | null | undefined): boolean {
  if (first == null || second == null) return false;
  return mode === "turkey" ? Number(first) === Number(second) : first === second;
}

export function formatTime(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function playerFromUser(user: { id: string; email?: string; user_metadata: Record<string, unknown> }): Player {
  const { full_name: fullName, name, avatar_url: avatar, picture, display_name: guestName } = user.user_metadata;
  const displayName = [fullName, name, guestName, user.email].find((value): value is string => typeof value === "string" && value.trim().length > 0) ?? "Oyuncu";
  const avatarUrl = [avatar, picture].find((value): value is string => typeof value === "string" && value.length > 0) ?? null;
  return { id: user.id, name: displayName.trim(), avatarUrl };
}
