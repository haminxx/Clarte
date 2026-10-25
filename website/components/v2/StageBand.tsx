const STAGES = [
  { n: '01', label: 'Dig', title: '5 Whys', body: 'Clarte keeps asking why until it reaches the root cause, not the symptom.' },
  { n: '02', label: 'Shape', title: 'Why · How · What', body: 'Turn the root cause into a purpose, a mechanism and a concrete solution.' },
  { n: '03', label: 'Defend', title: 'Market & debate', body: 'It searches the map, names existing work and argues the other side.' },
  { n: '04', label: 'See it', title: 'Visualize', body: 'Confirm the idea and get a card, a report and optional concept images.' },
]

/** Hairline column band (Lightspark's stat band) holding the four session stages. No numbers invented. */
export default function StageBand() {
  return (
    <section id="how" className="border-y border-hair">
      <div className="page">
        <div className="flex items-end justify-between py-8">
          <h2 className="h-section">How a session works</h2>
          <p className="label hidden md:block">One question at a time · about 10 minutes</p>
        </div>
        <ol className="-mx-6 grid gap-px border-t border-hair bg-hair sm:mx-0 sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((s) => (
            <li key={s.n} className="flex min-h-[220px] flex-col justify-between bg-canvas px-6 py-6">
              <div className="flex items-center justify-between"><span className="label">{s.label}</span><span className="index">{s.n}</span></div>
              <div>
                <p className="text-[24px] leading-[1.2] tracking-[-0.03em] md:text-[28px]">{s.title}</p>
                <p className="mt-3 max-w-[260px] text-[13px] leading-[1.45] text-g-600">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
