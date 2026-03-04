import Link from 'next/link';
import { CATEGORY_META, POST_TYPES, typeToSlug } from '@/lib/taxonomy';

const legalLinks = [
  { name: 'Privacy', href: '/privacy' },
  { name: 'Terms', href: '/terms' },
  { name: 'Cookies', href: '/cookies' },
];

export default function Footer() {
  return (
    <footer className="relative z-10 mt-16 border-t border-[var(--line)] bg-[#071c30] pb-12 pt-16 text-slate-300">
      <div className="mx-auto grid w-full max-w-[1240px] gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="space-y-5 lg:col-span-5">
          <Link href="/" className="text-2xl font-black tracking-tight text-white">
            EVOFUTURA<span className="text-[var(--c-accent)]">{'//'}</span>
          </Link>
          <p className="max-w-md text-sm leading-relaxed text-slate-300">
            Sharp reporting on AI, systems, and future technology for engineers, operators, and builders.
          </p>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-cyan-300">
            <span className="signal-dot h-2 w-2 rounded-full bg-cyan-300" />
            <span>Fresh stories every week</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Topics</p>
            <ul className="space-y-2 text-sm">
              {Object.keys(CATEGORY_META)
                .slice(0, 6)
                .map(category => (
                  <li key={category}>
                    <Link href={`/category/${category.toLowerCase()}`} className="transition-colors hover:text-white">
                      {category}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Formats</p>
            <ul className="space-y-2 text-sm">
              {POST_TYPES.map(type => (
                <li key={type}>
                  <Link href={`/type/${typeToSlug(type)}`} className="transition-colors hover:text-white">
                    {type}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Legal</p>
            <ul className="space-y-2 text-sm">
              {legalLinks.map(item => (
                <li key={item.name}>
                  <Link href={item.href} className="transition-colors hover:text-white">
                    {item.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/archive" className="transition-colors hover:text-white">
                  Archive
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 flex w-full max-w-[1240px] flex-col gap-3 border-t border-white/10 px-4 pt-6 text-[11px] uppercase tracking-[0.16em] text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p>© {new Date().getFullYear()} EvoFutura</p>
        <p>Independent coverage of emerging technology</p>
      </div>
    </footer>
  );
}
