'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import TeacherDashboardPage from '@/app/teacher/page';
import StudentDashboardPage from '@/app/student/page';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // যদি ইউজার লগইন করা না থাকে বা কোনো ভূমিকা না থাকে, লগইন পেজে রিডাইরেক্ট
  useEffect(() => {
    if (!isLoading && (!user || !user.role)) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  // ১. লোডিং স্টেট (ক্লিন লোডিং স্পিনার)
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f8fafc] font-hind">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#064e3b] border-t-transparent" />
          <p className="text-xs font-bold text-[#064e3b]">ড্যাশবোর্ড লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  // ২. লগইন অননুমোদিত ইউজার রিডাইরেক্ট স্পিনার
  if (!user || !user.role) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f8fafc] font-hind">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#064e3b] border-t-transparent" />
          <p className="text-xs font-bold text-[#064e3b]">লগইন পেজে পাঠোনো হচ্ছে...</p>
        </div>
      </div>
    );
  }

  // ৩. ভূমিকা (Role) অনুযায়ী নির্দিষ্ট ড্যাশবোর্ড রেন্ডার
  if (user.role === 'admin') {
    return <AdminDashboard />;
  }

  if (user.role === 'teacher') {
    return <TeacherDashboardPage />;
  }

  if (user.role === 'student') {
    return <StudentDashboardPage />;
  }

  return null;
}
