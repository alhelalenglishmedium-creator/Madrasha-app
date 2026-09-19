'use client';

import React from 'react';
import { Home, CalendarCheck, CircleDollarSign, User } from 'lucide-react';

export type TeacherTab = 'home' | 'attendance' | 'hadiya' | 'profile';

interface NavItem {
  id: TeacherTab;
  label: string;
  icon: React.ElementType;
}

interface TeacherBottomNavProps {
  activeTab: TeacherTab;
  onTabChange: (tab: TeacherTab) => void;
}

export function TeacherBottomNav({ activeTab, onTabChange }: TeacherBottomNavProps) {
  // শিক্ষকদের জন্য ৪টি মূল নেভিগেশন ট্যাব
  const navItems: NavItem[] = [
    { id: 'home', label: 'হোম', icon: Home },
    { id: 'attendance', label: 'হাজিরা', icon: CalendarCheck },
    { id: 'hadiya', label: 'হাদিয়া', icon: CircleDollarSign },
    { id: 'profile', label: 'প্রোফাইল', icon: User },
  ];

  return (
    <>
      {/* ফিক্সড মোবাইল বটম নেভবার */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none font-hind">
        <div className="w-full max-w-[430px] bg-white/95 backdrop-blur-md border-t border-[#EDF4F0] px-3 pt-2 pb-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pointer-events-auto sm:rounded-b-[40px]">
          <div className="flex items-center justify-between">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className="flex flex-1 flex-col items-center justify-center gap-1 group transition-all"
                >
                  {/* অ্যাক্টিভ অবস্থায় সিগনেচার সবুজ ক্যাপসুল শেপ */}
                  <div
                    className={`flex items-center justify-center transition-all duration-200 ${
                      isActive
                        ? 'h-8 w-14 rounded-full bg-[#008955] text-white shadow-xs scale-100'
                        : 'h-8 w-8 text-[#9CA3AF] group-hover:text-[#4B5563]'
                    }`}
                  >
                    <IconComponent
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
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* নেভবারের নিচে কনটেন্ট স্পেসার */}
      <div className="h-16 w-full shrink-0 pointer-events-none" />
    </>
  );
}