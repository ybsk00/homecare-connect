'use client';

import { useState } from 'react';
import clsx from 'clsx';

const navLinks = [
  { label: '서비스', href: '#why-homecare' },
  { label: '에이전트', href: '#agents' },
  { label: '이용방법', href: '#how-it-works' },
  { label: '문의', href: '#contact' },
];

export function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 right-0 left-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/15">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-8 py-4">
        {/* Logo - text only (Stitch style) */}
        <a href="/" className="text-2xl font-bold tracking-tighter text-primary font-headline">
          HomeCare Connect
        </a>

        {/* Desktop nav links */}
        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm font-semibold text-on-surface/70 transition-opacity hover:opacity-100 font-headline"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop CTA buttons */}
        <div className="hidden items-center gap-4 md:flex">
          <a
            href="#contact"
            className="text-primary font-semibold text-sm hover:opacity-70 transition-opacity font-headline"
          >
            매칭 요청
          </a>
          <a
            href="/login"
            className="btn-gradient px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:shadow-lg"
          >
            시작하기
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="메뉴 열기"
        >
          <span className="material-symbols-outlined text-on-surface">
            {mobileOpen ? 'close' : 'menu'}
          </span>
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={clsx(
          'bg-surface/80 backdrop-blur-xl overflow-hidden border-b border-outline-variant/15 transition-all duration-300 md:hidden',
          mobileOpen ? 'max-h-80' : 'max-h-0 border-b-0',
        )}
      >
        <div className="space-y-4 px-8 py-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block text-sm font-semibold text-on-surface/70 font-headline"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="flex gap-3 pt-2">
            <a
              href="#contact"
              className="text-primary font-semibold text-sm"
            >
              매칭 요청
            </a>
            <a
              href="/login"
              className="btn-gradient px-5 py-2 rounded-lg text-sm font-semibold text-white"
            >
              시작하기
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
