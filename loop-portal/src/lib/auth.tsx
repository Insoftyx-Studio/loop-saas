import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { getMyProfile, changePassword as apiChangePassword, type Profile } from "./api";
import { useStore } from "./store";

type AuthCtx = {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const { setSession: mirrorSession } = useStore();

  // Mirror auth state into the existing mock store's `session` so the current
  // UI (which reads store.session for name/role/clientId) keeps working.
  const applyProfile = useCallback(
    (p: Profile | null) => {
      setProfile(p);
      if (!p) return mirrorSession(null);
      if (p.role === "client" && p.client_id)
        mirrorSession({ kind: "client", clientId: p.client_id, name: p.full_name });
      else mirrorSession({ kind: "agency", name: p.full_name });
    },
    [mirrorSession],
  );

  const loadProfile = useCallback(
    async (s: Session | null) => {
      if (!s?.user) return applyProfile(null);
      applyProfile(await getMyProfile(s.user.id));
    },
    [applyProfile],
  );

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      await loadProfile(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Clear local state and let the caller navigate away regardless of
      // whether the remote sign-out call succeeded — a flaky network
      // shouldn't leave the sign-out button looking like it did nothing.
    } finally {
      applyProfile(null);
      setSession(null);
    }
  }, [applyProfile]);

  const value = useMemo(
    () => ({ loading, session, profile, signIn, signOut, changePassword: apiChangePassword }),
    [loading, session, profile, signIn, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
