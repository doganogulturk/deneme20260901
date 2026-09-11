"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { playerFromUser, type Player } from "@/lib/game";

export function usePlayer() {
  const [player, setPlayer] = useState<Player | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setPlayer(playerFromUser(user));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) =>
      setPlayer(session?.user ? playerFromUser(session.user) : null),
    );
    return () => subscription.unsubscribe();
  }, []);

  return [player, setPlayer] as const;
}
