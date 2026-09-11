"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { playerFromUser, type Player } from "@/lib/game";

/**
 * Supabase oturumunu izler. `onSessionRestored`, sayfa yüklendiğinde açık bir oturum
 * bulunursa çağrılır; Google girişinden dönüşte bekleyen tur seçimini geri almak için.
 */
export function usePlayer(onSessionRestored?: () => void) {
  const [player, setPlayer] = useState<Player | null>(null);
  const handleSessionRestored = useRef(onSessionRestored);

  useEffect(() => {
    handleSessionRestored.current = onSessionRestored;
  });

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setPlayer(playerFromUser(user));
      handleSessionRestored.current?.();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) =>
      setPlayer(session?.user ? playerFromUser(session.user) : null),
    );
    return () => subscription.unsubscribe();
  }, []);

  return [player, setPlayer] as const;
}
