'use client';

import React, { useState } from 'react';
import { Bell, LogOut } from 'lucide-react';

interface DashboardHeaderProps {
  onNotificationClick?: () => void;
  hasNotification?: boolean;
  onLogoutClick?: () => void;
}

export function DashboardHeader({
  onNotificationClick,
  hasNotification = false,
  onLogoutClick,
}: DashboardHeaderProps) {
  const [logoError, setLogoError] = useState<boolean>(false);

  return (
    <header className="shrink-0 bg-white/95 backdrop-blur-md px-4 pt-3.5 pb-3 border-b border-slate-200/70 z-30 shadow-2xs font-hind">
      <div className="flex items-center justify-between">

        {/* ১. লোগো ও প্রতিষ্ঠানের নাম */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#008955] via-teal-600 to-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 overflow-hidden border border-emerald-100">
            {!logoError ? (
              <img
                src="/logo.png"
                alt="মাদ্রাসা লোগো"
                className="w-full h-full object-cover rounded-full"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span>দা</span>
            )}
          </div>

          <h1 className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate tracking-tight">
            মাদ্রাসায়ে ইসলামিয়া দারুল উলুম, কোম্পানিগঞ্জ।
          </h1>
        </div>

        {/* ২. একশন বাটনসমূহ (নোটিফিকেশন ও লগআউট) */}
        <div className="flex items-center gap-2 shrink-0">
          {onNotificationClick && (
            <button
              type="button"
              onClick={onNotificationClick}
              className="relative h-9 w-9 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 transition flex items-center justify-center active:scale-90 shadow-2xs cursor-pointer"
              title="বিজ্ঞপ্তি"
            >
              <Bell className="w-4 h-4 text-slate-700 stroke-[2.2]" />
              {hasNotification && (
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-white" />
                </span>
              )}
            </button>
          )}

          {onLogoutClick && (
            <button
              type="button"
              onClick={onLogoutClick}
              className="h-9 w-9 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-600 transition flex items-center justify-center active:scale-90 shadow-2xs cursor-pointer"
              title="লগআউট"
            >
              <LogOut className="w-4 h-4 stroke-[2.2]" />
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
