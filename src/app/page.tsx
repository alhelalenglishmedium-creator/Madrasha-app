'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function RootPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user && user.role) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [isLoading, user, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#f8fafc] font-hind">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#064e3b] border-t-transparent" />
        <p className="text-xs font-bold text-[#064e3b]">অপেক্ষা করুন...</p>
      </div>
    </div>
  );
}
