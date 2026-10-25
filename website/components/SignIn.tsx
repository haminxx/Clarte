"use client";

import { useState } from "react";
import { GOOGLE_AUTH_URL, deleteXaiKey, logout, saveXaiKey } from "@/lib/api";
import type { Me } from "@/lib/types";

interface Props {
  me: Me | null;
  loaded: boolean;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
}

function keyError(error: unknown): string {
  const text = error instanceof Error ? error.message : "Could not update the xAI key.";
  return text.replace(/xai-[A-Za-z0-9_-]+/gi, "xai-…");
}

/** Google sign-in and the xAI key setting. The key is posted once and only last4 comes back. */
export default function SignIn({ me, loaded, onRefresh, onError }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const user = me?.user ?? null;
  const last4 = me?.xaiKey.connected ? me.xaiKey.last4 : null;

  const save = async (apiKey: string) => {
    setBusy(true);
    try {
      await saveXaiKey(apiKey);
      await onRefresh();
    } catch (error) {
      onError(keyError(error));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteXaiKey();
      await onRefresh();
    } catch (error) {
      onError(keyError(error));
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    try {
      await logout();
      await onRefresh();
      setOpen(false);
    } catch (error) {
      onError(keyError(error));
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) {
    return <p className="account-status">Checking sign-in…</p>;
  }

  if (!user) {
    return (
      <a className="signin" href={GOOGLE_AUTH_URL}>
        Sign in
      </a>
    );
  }

  return (
    <div className="account">
      <button type="button" className="signin" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {user.name || user.email || "Account"}
      </button>
      {open ? (
        <div className="account-panel">
          <p className="account-who">{user.email || user.name}</p>
          <p className="muted">
            {last4 ? `xAI key connected, ends with ${last4}` : "No xAI key connected."}
          </p>
          <KeyForm busy={busy} onSave={save} />
          {me?.xaiKey.connected ? (
            <button type="button" className="ghost" disabled={busy} onClick={() => void remove()}>
              Remove xAI key
            </button>
          ) : null}
          <button type="button" className="ghost" disabled={busy} onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function KeyForm({ busy, onSave }: { busy: boolean; onSave: (apiKey: string) => Promise<void> }) {
  const [draft, setDraft] = useState("");

  return (
    <form
      className="key-form"
      onSubmit={(event) => {
        event.preventDefault();
        const apiKey = draft.trim();
        setDraft("");
        if (!apiKey) return;
        void onSave(apiKey);
      }}
    >
      <label>
        xAI API key
        <input
          type="password"
          name="xai-key"
          autoComplete="off"
          value={draft}
          disabled={busy}
          placeholder="Paste key"
          onChange={(event) => setDraft(event.target.value)}
        />
      </label>
      <button type="submit" disabled={busy || !draft.trim()}>
        Save key
      </button>
    </form>
  );
}
