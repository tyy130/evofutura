import Link from 'next/link';
import { unsubscribeWithToken } from '@/lib/newsletter';

export const dynamic = 'force-dynamic';

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string; confirm?: string }>;
}) {
  const { email = '', token = '', confirm = '' } = await searchParams;

  const hasParams = email.length > 0 && token.length > 0;
  const shouldExecute = hasParams && confirm === '1';
  const result = shouldExecute
    ? await unsubscribeWithToken(email, token)
    : hasParams
      ? null
      : { success: false, message: 'Missing unsubscribe token.' };
  const confirmHref = `/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}&confirm=1`;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
      <section className="rounded-[2rem] border border-[var(--line)] bg-white/92 p-8 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">EvoFutura Newsletter</p>
        <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
          {result ? (result.success ? 'Unsubscribed' : 'Unable To Unsubscribe') : 'Confirm Unsubscribe'}
        </h1>
        <p className="mt-4 text-base text-[var(--muted)]">
          {result ? result.message : 'Click confirm below to unsubscribe this address from weekly tech intelligence.'}
        </p>
        <div className="mt-8">
          {result ? (
            <Link href="/" className="inline-flex rounded-full bg-[#0a314f] px-5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white">
              Back to EvoFutura
            </Link>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Link href={confirmHref} className="inline-flex rounded-full bg-[#0a314f] px-5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white">
                Confirm Unsubscribe
              </Link>
              <Link href="/" className="inline-flex rounded-full border border-[var(--line)] bg-white px-5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--c-ink)]">
                Keep Subscription
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
