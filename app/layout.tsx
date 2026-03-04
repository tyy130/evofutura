import type { Metadata } from 'next';
import { Newsreader, Space_Grotesk } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import RouteExperience from '@/components/RouteExperience';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
});

const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
});

function getMetadataBase() {
  const candidate = process.env.NEXT_PUBLIC_SITE_URL || 'https://evofutura.com';
  try {
    return new URL(candidate);
  } catch {
    return new URL('https://evofutura.com');
  }
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: 'EvoFutura | Tech, AI, and Future Systems',
  description:
    'EvoFutura is a technology publication covering AI, future systems, engineering strategy, and digital infrastructure.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${newsreader.variable} min-h-screen bg-[var(--bg)] text-[var(--text)] antialiased`}
      >
        <Script
          id="custom-elements-define-guard"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                if (typeof window === 'undefined') return;
                if (!window.customElements || window.__evoCustomElementsGuard) return;
                var originalDefine = window.customElements.define.bind(window.customElements);
                window.customElements.define = function(name, constructor, options) {
                  if (window.customElements.get(name)) return;
                  try {
                    return originalDefine(name, constructor, options);
                  } catch (error) {
                    if (error && String(error.message || error).includes('already been defined')) return;
                    throw error;
                  }
                };
                window.__evoCustomElementsGuard = true;
              })();
            `,
          }}
        />
        <div className="site-noise" aria-hidden="true" />
        {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
        <Navbar />
        <main className="relative z-10 mx-auto w-full max-w-[1240px] px-4 pb-24 pt-10 sm:px-6 lg:px-8">
          <RouteExperience>{children}</RouteExperience>
        </main>
        <Footer />
      </body>
    </html>
  );
}
