import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy · Clarte" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-[720px] px-6 py-20 text-ink">
      <a href="/" className="text-sm text-muted hover:text-ink">
        ← Clarte
      </a>
      <h1 className="mt-8 text-4xl font-semibold tracking-[-0.03em]">Privacy</h1>
      <p className="mt-6 text-[17px] leading-8 text-muted">
        Sign in with Google if you want to connect an xAI key. The site sends that key once, over HTTPS, to the Clarte API. The browser only sees whether a key is connected and its last four characters. The API encrypts the key and uses it server-side for Grok Imagine. You can delete it from the session screen.
      </p>
      <p className="mt-4 text-[17px] leading-8 text-muted">
        Brainstorming, the graph, and sources work without an account. The landing page does not call xAI. Voice, when enabled, uses the Vapi public key in the browser. The private key never ships to the site. Clarte does not run analytics on this page.
      </p>
    </main>
  );
}
