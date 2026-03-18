'use client';

import { Bell, Search } from 'lucide-react';

interface AdminTopBarProps {
  title: string;
  subtitle?: string;
}

export default function AdminTopBar({ title, subtitle }: AdminTopBarProps) {
  return (
    <header className="sticky top-0 z-20 glass px-8 py-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary-900 tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-sm text-primary-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
            <input
              type="text"
              placeholder="검색..."
              className="w-64 pl-10 pr-4 py-2.5 text-sm bg-primary-50/60 rounded-xl text-primary-700 placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-secondary-500/30 transition-all"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2.5 text-primary-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-danger-500 rounded-full ring-2 ring-white" />
          </button>

          {/* Admin Avatar */}
          <div className="flex items-center gap-3 pl-3">
            <div className="w-9 h-9 gradient-teal rounded-full flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <div className="hidden md:block">
              <p className="text-[13px] font-semibold text-primary-800">관리자</p>
              <p className="text-[11px] text-primary-400">Super Admin</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
