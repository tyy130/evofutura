'use client';

import { useState } from 'react';
import Link from 'next/link';
import pillarsData from '@/config/pillars.json';

const categories = Object.keys(pillarsData);

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 md:h-24 items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="text-2xl font-heading font-black tracking-tighter text-slate-950">
                EVOFUTURA<span className="text-blue-600 text-4xl leading-none">.</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-10">
                {categories.map((cat) => (
                  <Link
                    key={cat}
                    href={`/category/${cat.toLowerCase()}`}
                    className="text-slate-500 hover:text-slate-950 text-[10px] font-bold tracking-[0.2em] uppercase transition-colors"
                  >
                    {cat}
                  </Link>
                ))}
                <Link
                  href="/subscribe"
                  className="bg-slate-950 text-white px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 transition-all"
                >
                  Join
                </Link>
              </div>
            </div>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
              aria-expanded={isOpen}
            >
              <svg
                className="w-6 h-6 text-slate-950"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay - OUTSIDE nav to avoid backdrop-filter containing block */}
      <div
        className={`md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Mobile Menu Drawer - OUTSIDE nav to avoid backdrop-filter containing block */}
      <div
        className={`md:hidden fixed top-0 right-0 h-full w-72 bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="p-6 space-y-8">
          {/* Close Button */}
          <div className="flex justify-between items-center border-b border-slate-100 pb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Menu</span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Category Links */}
          <div className="space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Categories</span>
            <div className="space-y-1">
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href={`/category/${cat.toLowerCase()}`}
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 text-slate-700 hover:bg-slate-50 hover:text-slate-950 rounded-xl text-sm font-semibold transition-colors"
                >
                  {cat}
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quick Links</span>
            <div className="space-y-1">
              <Link
                href="/archive"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-3 text-slate-700 hover:bg-slate-50 hover:text-slate-950 rounded-xl text-sm font-semibold transition-colors"
              >
                Archive
              </Link>
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-3 text-slate-700 hover:bg-slate-50 hover:text-slate-950 rounded-xl text-sm font-semibold transition-colors"
              >
                Admin
              </Link>
            </div>
          </div>

          {/* CTA */}
          <Link
            href="/subscribe"
            onClick={() => setIsOpen(false)}
            className="block w-full bg-slate-950 text-white px-6 py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-600 transition-all text-center"
          >
            Join Newsletter
          </Link>
        </div>
      </div>
    </>
  );
}