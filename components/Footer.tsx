import Link from 'next/link';

const categories = [
  { name: 'AI', href: '/category/ai' },
  { name: 'Cloud', href: '/category/cloud' },
  { name: 'DevOps', href: '/category/devops' },
  { name: 'Web Development', href: '/category/webdev' },
];

const platform = [
  { name: 'Weekly Newsletter', href: '/subscribe' },
  { name: 'Article Archive', href: '/archive' },
  { name: 'Command Center', href: '/admin' },
];

const legal = [
  { name: 'Privacy Policy', href: '/privacy' },
  { name: 'Terms of Service', href: '/terms' },
  { name: 'Cookie Policy', href: '/cookies' },
];

export default function Footer() {
  return (
    <footer className="bg-[#020617] text-slate-400 border-t border-white/5 pt-24 pb-12 z-10 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 mb-24">
          
          {/* Brand Column */}
          <div className="lg:col-span-5 space-y-8">
            <Link href="/" className="text-2xl font-heading font-black tracking-tighter text-white">
              EVOFUTURA<span className="text-blue-500 text-4xl leading-none">.</span>
            </Link>
            <p className="text-lg text-slate-400 leading-relaxed max-w-md">
              High-signal intelligence for software architects and engineering leaders. 
              We deconstruct the next wave of digital infrastructure and autonomous systems.
            </p>
            <div className="flex space-x-5 text-white">
              <a href="#" className="hover:text-blue-500 transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <a href="#" className="hover:text-blue-500 transition-colors">
                <span className="sr-only">GitHub</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/></svg>
              </a>
              <a href="#" className="hover:text-blue-500 transition-colors">
                <span className="sr-only">LinkedIn</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.761 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
            </div>
          </div>

          {/* Links Columns */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-12">
            <div className="space-y-6">
              <h4 className="text-white font-bold text-sm uppercase tracking-widest">Topics</h4>
              <ul className="space-y-4 text-sm">
                {categories.map((item) => (
                  <li key={item.name}>
                    <Link href={item.href} className="hover:text-white transition-colors">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-6">
              <h4 className="text-white font-bold text-sm uppercase tracking-widest">Platform</h4>
              <ul className="space-y-4 text-sm">
                {platform.map((item) => (
                  <li key={item.name}>
                    <Link href={item.href} className="hover:text-white transition-colors">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-6">
              <h4 className="text-white font-bold text-sm uppercase tracking-widest">Legal</h4>
              <ul className="space-y-4 text-sm">
                {legal.map((item) => (
                  <li key={item.name}>
                    <Link href={item.href} className="hover:text-white transition-colors">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-xs font-mono uppercase tracking-widest">
          <p>© {new Date().getFullYear()} EVOFUTURA. ARCHITECTED FOR THE FUTURE.</p>
          <div className="flex space-x-8">
            <span className="text-slate-600">Status: System Operational</span>
            <span className="text-slate-600">Ver: 2.0.6</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
