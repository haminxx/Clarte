import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms · Clarte" };

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-[720px] px-6 py-20 text-ink">
      <a href="/" className="text-sm text-muted hover:text-ink">
        ← Clarte
      </a>
      <h1 className="mt-8 text-4xl font-semibold tracking-[-0.03em]">Terms</h1>
      <p className="mt-6 text-[17px] leading-8 text-muted">
        Clarte is a hackathon prototype built at Hacktoberfest × SpaceXAI Hack Day, UC San Diego. The source is MIT licensed. It is a research demo, not a commercial service, and it does not provide legal, patent, or engineering advice.
      </p>
      <p className="mt-4 text-[17px] leading-8 text-muted">
        Citations come from official public APIs. Open the source link before you rely on a result. Voice runs through Vapi when a public key is configured. Grok Imagine runs only on the API, and only after you sign in and connect your own xAI key.
      </p>
    </main>
  );
}
