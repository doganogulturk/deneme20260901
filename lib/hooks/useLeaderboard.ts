"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { LEADERBOARD_LIMIT, type GameMode, type LeaderboardEntry, type Player } from "@/lib/game";

type FinishedRound = {
  player: Player | null;
  isFinished: boolean;
  mode: GameMode;
  score: number;
  durationMs: number;
  bestStreak: number;
};

const EMPTY_LEADERBOARDS: Record<GameMode, LeaderboardEntry[]> = { turkey: [], world: [] };

/** Tur bitince sonucu kaydeder, sıralamayı çeker ve realtime güncellemelere abone olur. */
export function useLeaderboard({ player, isFinished, mode, score, durationMs, bestStreak }: FinishedRound) {
  const [leaderboards, setLeaderboards] = useState<Record<GameMode, LeaderboardEntry[]>>(EMPTY_LEADERBOARDS);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFinished || !player) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    let isActive = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    const loadLeaderboards = async () => {
      const loadMode = (gameMode: GameMode) =>
        supabase
          .from("leaderboard")
          .select("user_id, display_name, avatar_url, score, duration_ms, best_streak")
          .eq("game_mode", gameMode)
          .order("score", { ascending: false })
          .order("duration_ms", { ascending: true })
          .order("best_streak", { ascending: false })
          .limit(LEADERBOARD_LIMIT);

      const [turkey, world] = await Promise.all([loadMode("turkey"), loadMode("world")]);
      if (!isActive) return;
      if (turkey.error || world.error) setLeaderboardError("Sıralama yüklenemedi. Lütfen tekrar deneyin.");
      else setLeaderboards({ turkey: turkey.data ?? [], world: world.data ?? [] });
    };

    const saveResultAndLoadLeaderboards = async () => {
      const { error } = await supabase.from("game_results").insert({
        user_id: player.id,
        display_name: player.name,
        avatar_url: player.avatarUrl,
        game_mode: mode,
        score,
        duration_ms: durationMs,
        best_streak: bestStreak,
      });
      if (error) {
        if (isActive) setLeaderboardError("Skor kaydedilemedi. Lütfen tekrar deneyin.");
        return;
      }
      await loadLeaderboards();
      channel = supabase
        .channel("live-leaderboard")
        .on("postgres_changes", { event: "*", schema: "public", table: "game_results" }, () => { void loadLeaderboards(); })
        .subscribe();
    };

    void saveResultAndLoadLeaderboards();
    return () => {
      isActive = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [bestStreak, durationMs, isFinished, mode, player, score]);

  const resetLeaderboards = () => {
    setLeaderboards(EMPTY_LEADERBOARDS);
    setLeaderboardError(null);
  };

  return { leaderboards, leaderboardError, resetLeaderboards };
}
