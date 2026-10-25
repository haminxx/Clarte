import { TextReveal } from '@/components/ui/text-reveal'

export default function Problem() {
  return (
    <section className="py-20 md:py-32">
      <div className="mx-auto max-w-container px-4 md:px-6">
        <p className="eyebrow">The problem</p>
        <p className="display mt-6 max-w-[900px] text-[28px] font-medium leading-[38px] md:text-[40px] md:leading-[52px]">
          <TextReveal className="text-dim" text="Search only works when you already know the keywords. The fix for an overheating drone battery might be hiding in a satellite thermal-control patent, written in words you'd never type." />{' '}
          <TextReveal className="text-ink" text="Clarte connects problems to technology by meaning, across fields, and talks you through it." />
        </p>
      </div>
    </section>
  )
}
