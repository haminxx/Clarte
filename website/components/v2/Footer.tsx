import { APP_URL, REPO_URL } from '@/lib/links'

const COLS = [
  { h: 'Product', l: [['How it works', '#how'], ['What it does', '#features'], ['Sources', '#examples']] },
  { h: 'Open source', l: [['GitHub', REPO_URL], ['README', `${REPO_URL}#readme`], ['Plan', `${REPO_URL}/blob/main/readme/PLAN.md`]] },
  { h: 'Built with', l: [['Cloudflare', 'https://www.cloudflare.com'], ['Gemma', 'https://ai.google.dev/gemma'], ['Vapi', 'https://vapi.ai'], ['xAI', 'https://x.ai']] },
]

/** Dark footer with a closing CTA and a giant low-contrast wordmark (adapted from 21st.dev "Large name footer", id 872). */
export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-g-950 text-white">
      <div className="page grid gap-12 pb-16 pt-24 md:grid-cols-12">
        <div className="md:col-span-6">
          <p className="text-[28px] leading-[1.22] tracking-[-0.03em] md:text-[36px]">Bring a problem.<br /><span className="text-white/45">Leave with an idea you can defend.</span></p>
          <a href={APP_URL} className="btn mt-8 bg-white text-ink hover:bg-g-100">Start talking</a>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-6">
          {COLS.map((c) => (
            <div key={c.h}>
              <p className="label text-white/40">{c.h}</p>
              <ul className="mt-4 space-y-2.5 text-[13px]">
                {c.l.map(([t, u]) => <li key={t}><a href={u} className="arrow-item text-white/75 hover:text-white"><span className="inner">{t}</span><span className="arr">→</span></a></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="page flex flex-col gap-2 border-t border-hair-dark py-6 text-[12px] text-white/40 sm:flex-row sm:justify-between">
        <p>© 2026 Clarte · Built at Hacktoberfest × SpaceXAI Hack Day, UC San Diego</p>
        <p>Open source · Runs on Cloudflare's free tier</p>
      </div>
      <p aria-hidden className="pointer-events-none -mb-[0.2em] select-none text-center font-medium leading-[0.8] tracking-[-0.06em] text-mark" style={{ fontSize: 'clamp(6rem, 30vw, 26rem)' }}>clarte</p>
    </footer>
  )
}
