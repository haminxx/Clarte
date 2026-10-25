"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { explainApiMessage, startGoogleSignIn } from "@/lib/api";

const AuthNoticeContext = createContext<{ signIn: () => void }>({ signIn: () => undefined });

/** Banner for a missing Google secret or a failed return from the consent screen. */
export function AuthNoticeProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("auth");
    if (reason === "not_configured") setMessage(explainApiMessage("Google sign-in is not configured"));
    else if (reason === "failed") setMessage("Google sign-in did not finish. You can still use text chat.");
  }, []);

  const signIn = () => {
    void startGoogleSignIn()
      .then((note) => {
        if (note) setMessage(note);
      })
      .catch(() => setMessage("Could not reach Google sign-in. You can still use text chat."));
  };

  return (
    <AuthNoticeContext.Provider value={{ signIn }}>
      {children}
      {message ? (
        <p
          role="status"
          className="fixed bottom-4 left-1/2 z-[70] w-[min(560px,calc(100%-2rem))] -translate-x-1/2 bg-ink px-4 py-3 text-center text-[13px] leading-5 text-white"
        >
          {message}
        </p>
      ) : null}
    </AuthNoticeContext.Provider>
  );
}

export function useAuthNotice() {
  return useContext(AuthNoticeContext);
}
