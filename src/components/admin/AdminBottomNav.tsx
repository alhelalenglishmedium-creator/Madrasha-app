'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  House,
  GraduationCap,
  CalendarCheck,
  CircleDollarSign,
  Users,
} from 'lucide-react';

export function AdminBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'হোম', icon: House, path: '/dashboard' },
    { label: 'শিক্ষার্থী', icon: GraduationCap, path: '/students' },
    { label: 'হাজিরা', icon: CalendarCheck, path: '/attendance' },
    { label: 'ফি', icon: CircleDollarSign, path: '/fees' },
    { label: 'শিক্ষক', icon: Users, path: '/staff' },
  ];

  return (
    <>
      {/* ফিক্সড বটম নেভবার */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="w-full max-w-[430px] bg-white/95 backdrop-blur-md border-t border-[#EDF4F0] px-3 pt-2 pb-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pointer-events-auto sm:rounded-b-[40px]">
          <div className="flex items-center justify-between">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;

              return (
                <Link
                  key={item.label}
                  href={item.path}
                  className="flex flex-1 flex-col items-center justify-center gap-1 group"
                >
                  {/* অ্যাক্টিভ অবস্থায় সবুজ ওভাল/ক্যাপসুল শেপ */}
                  <div
                    className={`flex items-center justify-center transition-all duration-200 ${
                      isActive
                        ? 'h-8 w-14 rounded-full bg-[#008955] text-white shadow-xs'
                        : 'h-8 w-8 text-[#9CA3AF] group-hover:text-[#4B5563]'
                    }`}
                  >
                    <Icon
                      size={19}
                      className={isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}
                    />
                  </div>

                  {/* টেক্সট লেবেল */}
                  <span
                    className={`text-[11px] font-medium leading-none tracking-tight transition-colors ${
                      isActive ? 'font-bold text-[#008955]' : 'text-[#6B7280]'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* নেভবারের নিচে স্পেসার */}
      <div className="h-16 w-full shrink-0" />
    </>
  );
}