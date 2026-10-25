/** Two-tone statement paragraph (Lightspark's "lead + gray" pattern). */
export default function Manifesto() {
  return (
    <section className="page py-24 md:py-32">
      <div className="grid gap-6 md:grid-cols-12">
        <p className="index md:col-span-3">01 · The problem</p>
        <p className="h-section max-w-[820px] md:col-span-9">
          Search only works when you already know the keywords.{' '}
          <span className="text-g-400">The fix for an overheating drone battery might be hiding in a satellite thermal-control patent, written in words you'd never type. Clarte connects problems to technology by meaning, across fields, and talks you through it.</span>
        </p>
      </div>
    </section>
  )
}
