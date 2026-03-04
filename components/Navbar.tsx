'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CATEGORY_META, POST_TYPES, typeToSlug } from '@/lib/taxonomy';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const categories = useMemo(() => Object.keys(CATEGORY_META), []);
  const topTypes = POST_TYPES.slice(0, 3);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-[var(--line)]/70 bg-white/82 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1240px] items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-black tracking-tight text-[var(--c-ink)] sm:text-2xl">
            EVOFUTURA<span className="text-[var(--c-accent)]">{'//'}</span>
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            {categories.slice(0, 6).map(category => (
              <Link
                key={category}
                href={`/category/${category.toLowerCase()}`}
                className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] transition-colors hover:text-[var(--c-ink)]"
              >
                {category}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            {topTypes.map(type => (
              <Link
                key={type}
                href={`/type/${typeToSlug(type)}`}
                className="chip rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
              >
                {type}
              </Link>
            ))}
            <Link
              href="/subscribe"
              className="rounded-full bg-[var(--c-ink)] px-5 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[var(--c-accent)]"
            >
              Subscribe
            </Link>
          </div>

          <button
            onClick={() => setIsOpen(state => !state)}
            className="rounded-xl border border-[var(--line)] bg-white p-2 text-[var(--c-ink)] lg:hidden"
            aria-expanded={isOpen}
            aria-label="Toggle menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-[55] bg-black/30 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setIsOpen(false)}
      />

      <aside
        className={`fixed right-0 top-0 z-[60] h-full w-80 border-l border-[var(--line)] bg-white p-6 transition-transform duration-300 lg:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="mb-6 flex items-center justify-between border-b border-[var(--line)] pb-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Navigation</p>
          <button onClick={() => setIsOpen(false)} className="rounded-lg p-2 text-[var(--muted)] hover:bg-slate-100">
            ✕
          </button>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Categories</p>
            {categories.map(category => (
              <Link
                key={category}
                href={`/category/${category.toLowerCase()}`}
                onClick={() => setIsOpen(false)}
                className="block rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-semibold text-[var(--c-ink)]"
              >
                {category}
              </Link>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Formats</p>
            {POST_TYPES.map(type => (
              <Link
                key={type}
                href={`/type/${typeToSlug(type)}`}
                onClick={() => setIsOpen(false)}
                className="block rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-semibold text-[var(--c-ink)]"
              >
                {type}
              </Link>
            ))}
          </div>

          <Link
            href="/subscribe"
            onClick={() => setIsOpen(false)}
            className="block rounded-xl bg-[var(--c-ink)] px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-white"
          >
            Subscribe
          </Link>
        </div>
      </aside>
    </>
  );
}
