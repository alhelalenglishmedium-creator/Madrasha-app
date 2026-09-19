'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CircleDollarSign,
  Receipt,
  Search,
  Plus,
  BookOpen,
  Calendar,
  CheckCircle2,
  User,
  X,
  History,
  AlertCircle,
  Clock,
  Phone,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { localDb } from '@/db/localDb';
import { supabase } from '@/lib/supabaseClient';
import type { Student, FeePayment } from '@/types/database.types';

import { FeeCollectionModal } from '@/components/admin/FeeCollectionModal';
import { AdminBottomNav } from '@/components/admin/AdminBottomNav';

interface PaymentWithStudent extends FeePayment {
  student?: Student;
}

type ViewFilter = 'paid' | 'due';
type TimeScope = 'current_month' | 'all_time';

interface StudentDueInfo {
  student: Student;
  totalDueMonths: number;
  unpaidMonths: string[]; // e.g. ["2026-07", "2026-08"]
  totalDueAmount: number;
  totalPaidAmount: number;
  payments: PaymentWithStudent[];
}

export default function FeesPage() {
  const [payments, setPayments] = useState<PaymentWithStudent[]>([]);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [classList, setClassList] = useState<string[]>(['সব', 'প্লে', 'নার্সারি', 'হিফজ']);
  const [selectedClass, setSelectedClass] = useState<string>('সব');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('paid');
  const [timeScope, setTimeScope] = useState<TimeScope>('current_month'); // চলতি মাস বনাম সর্বমোট
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [preselectedStudent, setPreselectedStudent] = useState<Student | null>(null);
  const [successToast, setSuccessToast] = useState('');

  // হিস্ট্রি দেখার স্টেট
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<StudentDueInfo | null>(null);

  // চলতি মাস
  const currentMonth = new Date().toISOString().slice(0, 7);

  // ১. ফি পেমেন্ট ও ছাত্র তালিকা লোড
  const loadFeeData = async () => {
    try {
      setIsLoading(true);

      const students = await localDb.students.where('status').equals('active').toArray();
      setStudentsList(students);
      const studentMap = new Map<string, Student>();
      students.forEach((s) => studentMap.set(s.id, s));

      // ডায়নামিক বিভাগ লোড
      const defaultClasses = ['প্লে', 'নার্সারি', 'হিফজ'];
      const savedClasses = localStorage.getItem('madrasa_custom_classes');
      if (savedClasses) {
        try {
          const parsed = JSON.parse(savedClasses);
          if (Array.isArray(parsed)) {
            parsed.forEach((c) => {
              if (!defaultClasses.includes(c)) defaultClasses.push(c);
            });
          }
        } catch (e) {
          console.error(e);
        }
      }

      students.forEach((s) => {
        if (s.className && !defaultClasses.includes(s.className)) {
          defaultClasses.push(s.className);
        }
      });
      setClassList(['সব', ...defaultClasses]);

      // পেমেন্ট রেকর্ড
      const allPayments = await localDb.feePayments.toArray();
      allPayments.reverse();

      const combined: PaymentWithStudent[] = allPayments.map((p) => ({
        ...p,
        student: studentMap.get(p.studentId),
      }));

      setPayments(combined);
    } catch (err) {
      console.error('ফি ডাটা লোড ত্রুটি:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeeData();
  }, []);

  // নতুন ফি সংরক্ষণ
  const handleSavePayment = async (paymentData: any) => {
    try {
      const paymentId = `fee_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;
      const now = new Date().toISOString();

      const newPayment: FeePayment = {
        ...paymentData,
        id: paymentId,
        receiptNo: receiptNumber,
        synced: true,
        createdAt: now,
      };

      await localDb.feePayments.add(newPayment);

      try {
        const { error: supaErr } = await supabase.from('student_fees').insert([{
          student_id: paymentData.studentId,
          amount: Number(paymentData.amount) || 0,
          month: paymentData.month,
          payment_method: paymentData.paymentMethod || 'cash',
          receipt_no: receiptNumber,
          paid_at: now,
          created_at: now,
        }]);

        if (supaErr) {
          console.warn('student_fees insert warning:', supaErr.message);
        }
      } catch (e: any) {
        console.warn('student_fees network error:', e?.message || e);
      }

      setSuccessToast('ফি আদায় সফলভাবে সম্পন্ন হয়েছে!');
      setTimeout(() => setSuccessToast(''), 3000);
      setPreselectedStudent(null);
      await loadFeeData();
    } catch (e) {
      alert('ফি সংরক্ষণ করতে সমস্যা হয়েছে।');
    }
  };

  // ২. প্রতিটি শিক্ষার্থীর শুরু থেকে আজ পর্যন্ত সকল মাসের বকেয়া হিসাব
  const studentsDueSummary = useMemo(() => {
    const summaryMap = new Map<string, StudentDueInfo>();
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonthNum = currentDate.getMonth(); // 0-based

    studentsList.forEach((std) => {
      // শিক্ষার্থীর ভর্তির মাস থেকে চলতি মাস পর্যন্ত তালিকা তৈরি
      const createdDate = std.createdAt ? new Date(std.createdAt) : new Date(currentYear, 0, 1);
      const startYear = createdDate.getFullYear();
      const startMonth = createdDate.getMonth();

      const studentPayments = payments.filter((p) => p.studentId === std.id);
      const paidMonthsSet = new Set<string>();

      studentPayments.forEach((p) => {
        if (p.month) {
          paidMonthsSet.add(p.month);
        } else if (p.paymentDate) {
          paidMonthsSet.add(p.paymentDate.slice(0, 7));
        }
      });

      const unpaidMonths: string[] = [];

      // মাস গণনা (ভর্তির মাস হতে চলতি মাস পর্যন্ত)
      let y = startYear;
      let m = startMonth;

      while (y < currentYear || (y === currentYear && m <= currentMonthNum)) {
        const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`;
        if (!paidMonthsSet.has(monthStr)) {
          unpaidMonths.push(monthStr);
        }
        m++;
        if (m > 11) {
          m = 0;
          y++;
        }
      }

      const monthlyFee = Number(std.monthlyFee) || 0;
      const totalDueAmount = unpaidMonths.length * monthlyFee;
      const totalPaidAmount = studentPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

      summaryMap.set(std.id, {
        student: std,
        totalDueMonths: unpaidMonths.length,
        unpaidMonths,
        totalDueAmount,
        totalPaidAmount,
        payments: studentPayments,
      });
    });

    return summaryMap;
  }, [studentsList, payments]);

  // ৩. ড্যাশবোর্ড পরিসংখ্যান (চলতি মাস বনাম শুরু থেকে আজ পর্যন্ত)
  const metrics = useMemo(() => {
    if (timeScope === 'current_month') {
      const paidTotalAmount = payments
        .filter((p) => p.paymentDate?.startsWith(currentMonth))
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const paidStudentIds = new Set(
        payments
          .filter((p) => p.paymentDate?.startsWith(currentMonth))
          .map((p) => p.studentId)
      );

      const paidCount = paidStudentIds.size;
      const dueStudents = studentsList.filter((s) => !paidStudentIds.has(s.id));
      const dueCount = dueStudents.length;
      const dueTotalAmount = dueStudents.reduce((sum, s) => sum + (Number(s.monthlyFee) || 0), 0);

      return {
        paidTotalAmount,
        paidCount,
        dueTotalAmount,
        dueCount,
      };
    } else {
      // সর্বমোট (All-Time) হিসাব
      let paidTotalAmount = 0;
      let dueTotalAmount = 0;
      let dueCount = 0;
      let paidCount = 0;

      studentsDueSummary.forEach((info) => {
        paidTotalAmount += info.totalPaidAmount;
        dueTotalAmount += info.totalDueAmount;
        if (info.totalDueMonths > 0) {
          dueCount++;
        } else {
          paidCount++;
        }
      });

      return {
        paidTotalAmount,
        paidCount,
        dueTotalAmount,
        dueCount,
      };
    }
  }, [timeScope, payments, studentsList, studentsDueSummary, currentMonth]);

  // ৪. বিভাগ অনুযায়ী বকেয়া শিক্ষার্থীর সংখ্যা
  const dueCountByClass = useMemo(() => {
    const map: Record<string, number> = { সব: metrics.dueCount };

    classList.forEach((cls) => {
      if (cls !== 'সব') {
        let count = 0;
        studentsList.forEach((s) => {
          if (s.className === cls) {
            const info = studentsDueSummary.get(s.id);
            if (timeScope === 'current_month') {
              const hasPaidCurrent = payments.some(
                (p) => p.studentId === s.id && p.paymentDate?.startsWith(currentMonth)
              );
              if (!hasPaidCurrent) count++;
            } else {
              if (info && info.totalDueMonths > 0) count++;
            }
          }
        });
        map[cls] = count;
      }
    });

    return map;
  }, [classList, studentsList, studentsDueSummary, timeScope, payments, currentMonth, metrics.dueCount]);

  // ৫. ফিল্টারকৃত রেন্ডার তালিকা
  const displayedStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return studentsList.filter((std) => {
      const matchClass = selectedClass === 'সব' || std.className === selectedClass;
      if (!matchClass) return false;

      const info = studentsDueSummary.get(std.id);
      const isCurrentPaid = payments.some(
        (p) => p.studentId === std.id && p.paymentDate?.startsWith(currentMonth)
      );

      // মোড ফিল্টার (আদায় বনাম বকেয়া)
      if (viewFilter === 'paid') {
        if (timeScope === 'current_month' && !isCurrentPaid) return false;
        if (timeScope === 'all_time' && (info?.totalPaidAmount || 0) <= 0) return false;
      } else {
        if (timeScope === 'current_month' && isCurrentPaid) return false;
        if (timeScope === 'all_time' && (info?.totalDueMonths || 0) <= 0) return false;
      }

      if (!q) return true;
      return (
        (std.fullNameBangla && std.fullNameBangla.toLowerCase().includes(q)) ||
        (std.fullName && std.fullName.toLowerCase().includes(q)) ||
        (std.rollNo && std.rollNo.toString().includes(q)) ||
        (std.phone && std.phone.includes(q))
      );
    });
  }, [studentsList, selectedClass, studentsDueSummary, viewFilter, timeScope, payments, currentMonth, searchQuery]);

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-[#EDF3EF] text-[#1F2937] antialiased p-0 sm:py-4 font-hind overflow-hidden">
      
      <style jsx global>{`
        @keyframes emeraldGoldSpin {
          0% {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }
        .emerald-royal-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 320%;
          height: 320%;
          transform-origin: center center;
          background: conic-gradient(
            from 0deg,
            #008955 0%,
            #10B981 20%,
            #F59E0B 40%,
            #FCD34D 60%,
            #06B6D4 80%,
            #008955 100%
          );
          animation: emeraldGoldSpin 5s linear infinite;
          z-index: 0;
          filter: blur(2px);
        }
      `}</style>

      {/* মোবাইল ফ্রেম */}
      <div className="relative w-full max-w-[430px] bg-[#F7FBF9] h-full sm:h-[870px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-[#DFECE5]">
        
        {/* টোস্ট */}
        {successToast && (
          <div className="absolute top-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full bg-[#008955] px-4 py-2 text-xs font-bold text-white shadow-xl animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 size={15} className="text-emerald-200" />
            <span>{successToast}</span>
          </div>
        )}

        {/* ================= ১. টপ হেডার বার ================= */}
        <header className="shrink-0 bg-[#F7FBF9] px-4 pt-5 pb-3 z-30 flex items-center justify-between border-b border-[#E7F0EB]">
          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard"
              className="h-10 w-10 rounded-2xl bg-white border border-[#E5EFEA] flex items-center justify-center text-[#4B5563] shadow-xs active:scale-95 transition"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-sm font-bold text-[#1F2937] leading-none">ফি ও হিসাব লেজার</h1>
              <p className="text-[10px] text-[#008955] font-semibold mt-1">
                মোট শিক্ষার্থী: {studentsList.length} জন
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setPreselectedStudent(null);
              setIsModalOpen(true);
            }}
            className="h-10 px-3.5 rounded-2xl bg-[#008955] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition hover:bg-[#007548]"
          >
            <Plus size={16} />
            <span>ফি আদায়</span>
          </button>
        </header>

        {/* ================= স্ক্রলেবল বডি ================= */}
        <main className="flex-1 overflow-y-auto overscroll-contain no-scrollbar p-4 space-y-3.5">
          
          {/* ================= ২. টাইমস্কোপ সিলেক্টর (চলতি মাস বনাম সর্বমোট) ================= */}
          <div className="flex items-center justify-between rounded-2xl bg-[#E8F4EE] p-1 border border-[#CCE8DA]">
            <button
              type="button"
              onClick={() => setTimeScope('current_month')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                timeScope === 'current_month'
                  ? 'bg-[#008955] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar size={13} />
              <span>চলতি মাসের হিসাব</span>
            </button>
            <button
              type="button"
              onClick={() => setTimeScope('all_time')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                timeScope === 'all_time'
                  ? 'bg-[#008955] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers size={13} />
              <span>শুরু থেকে আজ পর্যন্ত (ফুল)</span>
            </button>
          </div>

          {/* ================= ৩. আদায় ও বকেয়া কার্ড মেট্রিক ================= */}
          <div className="grid grid-cols-2 gap-3">
            {/* আদায় কার্ড */}
            <div
              onClick={() => setViewFilter('paid')}
              className={`relative p-[2px] rounded-2xl rounded-tr-[30px] rounded-bl-[30px] overflow-hidden shadow-2xs cursor-pointer transition active:scale-95 ${
                viewFilter === 'paid' ? 'ring-2 ring-[#008955]' : 'opacity-80'
              }`}
            >
              <div className="emerald-royal-glow" />
              <div className="relative z-10 bg-white rounded-[0.95rem] rounded-tr-[28px] rounded-bl-[28px] p-3 flex flex-col justify-between h-[116px]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500">
                    {timeScope === 'current_month' ? 'চলতি মাসে আদায়' : 'সর্বমোট মোট আদায়'}
                  </span>
                  <span className="p-1 rounded-lg bg-[#E7F6ED] text-[#008955]">
                    <CircleDollarSign size={14} />
                  </span>
                </div>
                <div>
                  <p className="text-xl font-black text-[#008955] font-sans tracking-tight leading-none">
                    ৳ {metrics.paidTotalAmount.toLocaleString('en-US')}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">
                    পরিশোধ: <span className="text-[#008955]">{metrics.paidCount} জন</span>
                  </p>
                </div>
              </div>
            </div>

            {/* অনাদায় / বকেয়া কার্ড */}
            <div
              onClick={() => setViewFilter('due')}
              className={`relative p-[2px] rounded-2xl rounded-tr-[30px] rounded-bl-[30px] overflow-hidden shadow-2xs cursor-pointer transition active:scale-95 ${
                viewFilter === 'due' ? 'ring-2 ring-rose-500' : 'opacity-80'
              }`}
            >
              <div className="emerald-royal-glow" />
              <div className="relative z-10 bg-white rounded-[0.95rem] rounded-tr-[28px] rounded-bl-[28px] p-3 flex flex-col justify-between h-[116px]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500">
                    {timeScope === 'current_month' ? 'চলতি মাসে বকেয়া' : 'সর্বমোট অনাদায়'}
                  </span>
                  <span className="p-1 rounded-lg bg-rose-50 text-rose-600">
                    <AlertCircle size={14} />
                  </span>
                </div>
                <div>
                  <p className="text-xl font-black text-rose-600 font-sans tracking-tight leading-none">
                    ৳ {metrics.dueTotalAmount.toLocaleString('en-US')}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">
                    বকেয়া: <span className="text-rose-600">{metrics.dueCount} জন</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ================= ৪. ফিল্টার ট্যাব সুইচ ================= */}
          <div className="flex rounded-2xl bg-white p-1 border border-[#D9E7E0] shadow-2xs">
            <button
              type="button"
              onClick={() => setViewFilter('paid')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                viewFilter === 'paid'
                  ? 'bg-[#008955] text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 size={13} />
              <span>আদায়কৃত তালিকা ({metrics.paidCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewFilter('due')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                viewFilter === 'due'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <AlertCircle size={13} />
              <span>বকেয়া তালিকা ({metrics.dueCount})</span>
            </button>
          </div>

          {/* ================= ৫. সার্চ ও শ্রেণি পিলস (বকেয়া সংখ্যাসহ) ================= */}
          <div className="space-y-2.5">
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder={`${selectedClass === 'সব' ? 'নাম, রোল বা মোবাইল' : selectedClass + ' শ্রেণির ছাত্র'} দিয়ে খুঁজুন...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#D9E7E0] rounded-2xl text-xs font-semibold text-slate-800 shadow-2xs focus:border-[#008955] focus:outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* শ্রেণি পিলস */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {classList.map((cls) => {
                const isSelected = selectedClass === cls;
                const dueCount = dueCountByClass[cls] || 0;

                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setSelectedClass(cls)}
                    className={`min-w-[75px] py-1 px-3 rounded-2xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shrink-0 ${
                      isSelected
                        ? 'bg-[#008955] text-white shadow-xs'
                        : 'bg-white text-[#4B5563] border border-[#E1EDE6] hover:bg-[#EDF4F0]'
                    }`}
                  >
                    <span>{cls}</span>
                    {dueCount > 0 && (
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded-full font-sans ${
                          isSelected ? 'bg-white text-[#008955]' : 'bg-rose-100 text-rose-600'
                        }`}
                      >
                        {dueCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ================= ৬. শিক্ষার্থীদের ইন্টেলিজেন্ট তালিকা ================= */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold text-slate-700">
                {viewFilter === 'paid' ? 'আদায়কৃত শিক্ষার্থীদের তালিকা' : 'বকেয়া ফি সহ শিক্ষার্থীদের তালিকা'}
              </h2>
              <span className="text-[10px] text-slate-400 font-sans font-medium">
                {displayedStudents.length} জন
              </span>
            </div>

            {isLoading ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-7 w-7 animate-spin rounded-full border-3 border-[#008955] border-t-transparent"></div>
                <p className="mt-2 text-xs font-medium text-slate-400">ডাটা লোড হচ্ছে...</p>
              </div>
            ) : displayedStudents.length > 0 ? (
              displayedStudents.map((std) => {
                const dueInfo = studentsDueSummary.get(std.id);
                const hasPastDue = (dueInfo?.totalDueMonths || 0) > (timeScope === 'current_month' ? 0 : 0);
                const currentMonthDue = dueInfo?.unpaidMonths.includes(currentMonth);

                return (
                  <div
                    key={std.id}
                    onClick={() => dueInfo && setSelectedStudentHistory(dueInfo)}
                    className={`group relative bg-white rounded-2xl p-3 flex items-center justify-between shadow-2xs hover:shadow-xs active:scale-[0.99] transition cursor-pointer border ${
                      viewFilter === 'due' ? 'border-rose-100' : 'border-[#E1EDE6]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="h-12 w-12 rounded-2xl rounded-tr-3xl rounded-bl-3xl bg-gradient-to-tr from-[#E7F6ED] to-[#FEF3C7] border border-[#D9E7E0] overflow-hidden flex items-center justify-center text-[#008955] shadow-2xs">
                          {std.photoUrl ? (
                            <img
                              src={std.photoUrl}
                              alt="Student"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User size={22} className="text-[#008955]/70" />
                          )}
                        </div>
                        <span className="absolute -bottom-1 -right-1 bg-[#008955] text-white text-[9px] font-black px-1.5 py-0.2 rounded-md border border-white font-sans">
                          {std.rollNo || '০'}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                            {std.fullNameBangla || std.fullName}
                          </h4>
                          <span className="text-[9px] font-bold text-[#008955] bg-[#E7F6ED] px-1.5 py-0.2 rounded border border-[#CDE9DC] shrink-0">
                            {std.className || 'সাধারণ'}
                          </span>
                        </div>

                        {/* বিগত মাসের বকেয়া ওয়ার্নিং ট্যাগ */}
                        {dueInfo && dueInfo.totalDueMonths > 1 && (
                          <p className="text-[9px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                            <AlertTriangle size={10} />
                            <span>বিগত {dueInfo.totalDueMonths} মাসের ফি বাকি!</span>
                          </p>
                        )}

                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          পিতা: {std.fatherName || 'তথ্য নেই'}
                        </p>
                      </div>
                    </div>

                    {/* ডান পাশ: টাকার অংক ও আদায় বাটন */}
                    <div className="text-right shrink-0">
                      {viewFilter === 'paid' ? (
                        <div>
                          <span className="text-sm font-black text-[#008955] font-sans block">
                            ৳ {(timeScope === 'current_month' ? std.monthlyFee : dueInfo?.totalPaidAmount || 0).toLocaleString('en-US')}
                          </span>
                          <span className="inline-block text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            পরিশোধিত
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-sm font-black text-rose-600 font-sans block">
                            বকেয়া: ৳ {(timeScope === 'current_month' ? std.monthlyFee : dueInfo?.totalDueAmount || 0).toLocaleString('en-US')}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreselectedStudent(std);
                              setIsModalOpen(true);
                            }}
                            className="mt-1 inline-flex items-center gap-1 rounded-xl bg-[#008955] px-2.5 py-1 text-[10px] font-bold text-white shadow-xs active:scale-95 transition hover:bg-[#007548]"
                          >
                            <Plus size={11} />
                            <span>আদায়</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-3xl border border-dashed border-[#DFECE5] bg-white p-8 text-center shadow-2xs">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E7F6ED] text-[#008955]">
                  <Receipt size={24} />
                </div>
                <h3 className="mt-2.5 text-xs font-bold text-slate-700">
                  {viewFilter === 'paid' ? 'কোনো আদায়ের রেকর্ড নেই' : 'কোনো বকেয়া শিক্ষার্থী নেই! আলহামদুলিল্লাহ'}
                </h3>
                <p className="mt-1 text-[11px] text-slate-400">
                  {viewFilter === 'paid' ? 'ফি আদায় সম্পন্ন করুন।' : 'সকল শিক্ষার্থী তাদের বকেয়া পরিশোধ করেছে।'}
                </p>
              </div>
            )}
          </div>

        </main>

        {/* ================= ৭. শিক্ষার্থীর সম্পূর্ণ লেজার ও বকেয়া বিশ্লেষণ পপআপ ================= */}
        {selectedStudentHistory && (
          <div
            onClick={() => setSelectedStudentHistory(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-3 font-hind animate-in fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[350px] max-h-[85vh] rounded-3xl rounded-tr-[40px] rounded-bl-[40px] p-[2.5px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="emerald-royal-glow" />

              <div className="relative z-10 bg-white rounded-[1.4rem] rounded-tr-[38px] rounded-bl-[38px] p-4 flex flex-col justify-between overflow-hidden">
                
                {/* পপআপ হেডার */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <History size={15} className="text-[#008955]" />
                    <span className="text-xs font-bold text-[#008955]">শিক্ষার্থীর ফি বিবরণ ও বকেয়া</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentHistory(null)}
                    className="h-7 w-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* ছাত্রের সংক্ষিপ্ত প্রোফাইল */}
                <div className="flex items-center gap-3 py-2.5 border-b border-slate-100">
                  <div className="h-12 w-12 rounded-2xl rounded-tr-3xl rounded-bl-3xl bg-gradient-to-tr from-[#E7F6ED] to-[#FEF3C7] border border-[#D9E7E0] overflow-hidden flex items-center justify-center shrink-0">
                    {selectedStudentHistory.student.photoUrl ? (
                      <img
                        src={selectedStudentHistory.student.photoUrl}
                        alt="Student"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={22} className="text-[#008955]/70" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 leading-tight">
                      {selectedStudentHistory.student.fullNameBangla || selectedStudentHistory.student.fullName}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                      রোল: {selectedStudentHistory.student.rollNo} • {selectedStudentHistory.student.className} বিভাগ
                    </p>
                    <p className="text-[10px] text-[#008955] font-bold font-sans">
                      মাসিক ফি রেট: ৳ {selectedStudentHistory.student.monthlyFee || '০'}
                    </p>
                  </div>
                </div>

                {/* বকেয়া ও আদায় সারাংশ বক্স */}
                <div className="my-2.5 grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                    <span className="text-[10px] font-bold text-emerald-800 block">মোট পরিশোধ</span>
                    <span className="text-sm font-black text-[#008955] font-sans">
                      ৳ {selectedStudentHistory.totalPaidAmount.toLocaleString('en-US')}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-rose-50 border border-rose-100 text-center">
                    <span className="text-[10px] font-bold text-rose-800 block">মোট বাকি</span>
                    <span className="text-sm font-black text-rose-600 font-sans">
                      ৳ {selectedStudentHistory.totalDueAmount.toLocaleString('en-US')}
                    </span>
                  </div>
                </div>

                {/* বাকি থাকা মাসসমূহের তালিকা */}
                {selectedStudentHistory.unpaidMonths.length > 0 && (
                  <div className="mb-2 p-2 rounded-xl bg-rose-50/70 border border-rose-200">
                    <span className="text-[10px] font-bold text-rose-700 block mb-1">
                      ⚠️ যে যে মাসের ফি এখনো বাকি:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {selectedStudentHistory.unpaidMonths.map((m) => (
                        <span
                          key={m}
                          className="text-[9px] font-bold bg-white text-rose-600 px-2 py-0.5 rounded-md border border-rose-200 font-sans"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* পূর্বের পেমেন্ট হিস্ট্রি */}
                <span className="text-[10px] font-bold text-slate-500 mb-1 px-1">পরিশোধের ইতিহাস:</span>
                <div className="max-h-[160px] overflow-y-auto no-scrollbar space-y-1.5 pr-0.5">
                  {selectedStudentHistory.payments.length > 0 ? (
                    selectedStudentHistory.payments.map((item) => (
                      <div
                        key={item.id}
                        className="p-2 rounded-xl border border-slate-100 bg-[#F7FBF9] flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800 leading-tight">
                            {item.month || 'মাসিক ফি'}
                          </p>
                          <p className="text-[9px] text-slate-400 font-sans mt-0.5">
                            {item.paymentDate} • {item.paymentMethod === 'cash' ? 'নগদ' : item.paymentMethod}
                          </p>
                        </div>
                        <span className="text-xs font-black text-[#008955] font-sans">
                          +৳ {item.amount?.toLocaleString('en-US')}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-3 text-xs text-slate-400">এখনো কোনো ফি জমা দেননি</p>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ফি কালেকশন মোডাল */}
        <FeeCollectionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setPreselectedStudent(null);
          }}
          studentsList={studentsList}
          onSavePayment={handleSavePayment}
        />

        {/* বটম নেভিগেশন */}
        <AdminBottomNav />
      </div>
    </div>
  );
}