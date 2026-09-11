"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { BOARDS, boardIdFor, LEADERBOARD_LIMIT, type BoardId, type LeaderboardEntry, type PlayChoice, type Player } from "@/lib/game";

type FinishedRound = {
  player: Player | null;
  isFinished: boolean;
  choice: PlayChoice;
  score: number;
  durationMs: number;
  bestStreak: number;
};

export type Leaderboards = Record<BoardId, LeaderboardEntry[]>;

const EMPTY_LEADERBOARDS: Leaderboards = { turkey: [], world: [], "world-hard": [] };

/** Tur bitince sonucu kaydeder, üç sıralamayı da çeker ve realtime güncellemelere abone olur. */
export function useLeaderboard({ player, isFinished, choice, score, durationMs, bestStreak }: FinishedRound) {
  const [leaderboards, setLeaderboards] = useState<Leaderboards>(EMPTY_LEADERBOARDS);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const { mode, difficulty } = choice;

  useEffect(() => {
    if (!isFinished || !player) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    let isActive = true;
    let channel: ReturnType<typeof supabase.channel> | undefined;

    const loadLeaderboards = async () => {
      const results = await Promise.all(
        BOARDS.map((board) =>
          supabase
            .from("leaderboard")
            .select("user_id, display_name, avatar_url, score, duration_ms, best_streak")
            .eq("game_mode", board.mode)
            .eq("variant", board.variant)
            .order("score", { ascending: false })
            .order("duration_ms", { ascending: true })
            .order("best_streak", { ascending: false })
            .limit(LEADERBOARD_LIMIT),
        ),
      );
      if (!isActive) return;

      if (results.some((result) => result.error)) {
        setLeaderboardError("Sıralama yüklenemedi. Lütfen tekrar deneyin.");
        return;
      }
      setLeaderboards(
        BOARDS.reduce((all, board, index) => ({ ...all, [board.id]: results[index].data ?? [] }), {} as Leaderboards),
      );
    };

    const saveResultAndLoadLeaderboards = async () => {
      const { error } = await supabase.from("game_results").insert({
        user_id: player.id,
        display_name: player.name,
        avatar_url: player.avatarUrl,
        game_mode: mode,
        variant: difficulty,
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
  }, [bestStreak, difficulty, durationMs, isFinished, mode, player, score]);

  const resetLeaderboards = () => {
    setLeaderboards(EMPTY_LEADERBOARDS);
    setLeaderboardError(null);
  };

  return { leaderboards, leaderboardError, resetLeaderboards, playedBoardId: boardIdFor(choice) };
}
