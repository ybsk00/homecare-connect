'use client';

import { useState } from 'react';
import { HeartPulse, Menu, X } from 'lucide-react';
import clsx from 'clsx';

const navLinks = [
  { label: '서비스', href: '#hero' },
  { label: '기능', href: '#features' },
  { label: '기관 안내', href: '#institutions' },
  { label: '문의', href: '#contact' },
];

export function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 right-0 left-0 z-50 glass border-b border-outline-variant/20">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <HeartPulse className="h-7 w-7 text-secondary" />
          <span className="text-lg font-bold text-primary">
            HomeCare Connect
          </span>
        </a>

        {/* Desktop nav links */}
        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop CTA buttons */}
        <div className="hidden items-center gap-3 md:flex">
          <a
            href="#contact"
            className="rounded-2xl border border-secondary px-5 py-2.5 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/5"
          >
            매칭 요청
          </a>
          <a
            href="/login"
            className="btn-gradient rounded-2xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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
          {mobileOpen ? (
            <X className="h-6 w-6 text-on-surface" />
          ) : (
            <Menu className="h-6 w-6 text-on-surface" />
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={clsx(
          'glass overflow-hidden border-b border-outline-variant/20 transition-all duration-300 md:hidden',
          mobileOpen ? 'max-h-80' : 'max-h-0 border-b-0',
        )}
      >
        <div className="space-y-4 px-6 py-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block text-sm font-medium text-on-surface-variant"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="flex gap-3 pt-2">
            <a
              href="#contact"
              className="rounded-2xl border border-secondary px-4 py-2 text-sm font-semibold text-secondary"
            >
              매칭 요청
            </a>
            <a
              href="/login"
              className="btn-gradient rounded-2xl px-4 py-2 text-sm font-semibold text-white"
            >
              시작하기
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
