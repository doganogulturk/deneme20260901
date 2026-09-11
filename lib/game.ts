import { type Province } from "@/lib/turkish-plates";
import { type Country } from "@/lib/world-countries";

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

export const GAME_DURATION_MS = 120000;
export const GAME_DURATION_SECONDS = GAME_DURATION_MS / 1000;
export const QUESTION_TRANSITION_MS = 3000;
export const LEADERBOARD_LIMIT = 50;

export const MAP_URLS: Record<GameMode, string> = {
  turkey: "/maps/turkey.svg",
  world: "/maps/world.svg",
};

export const MODE_COPY: Record<GameMode, { mapLabel: string; tabLabel: string }> = {
  turkey: { mapLabel: "Türkiye il haritası", tabLabel: "Türkiye" },
  world: { mapLabel: "Dünya ülkeleri haritası", tabLabel: "Dünya" },
};

export const GAME_MODES: GameMode[] = ["turkey", "world"];

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
