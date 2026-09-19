'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Calendar,
  Wallet,
  Receipt,
  FileText,
  BadgeCheck,
  Clock,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { localDb } from '@/db/localDb';
import { supabase } from '@/lib/supabaseClient';
import type { Staff, SalaryPayment } from '@/types/database.types';

export interface SalaryRecord {
  id: string;
  teacherId: string;
  amount: number;
  month: string;
  paymentDate: string;
  paymentTime?: string;
  paymentMethod: string;
  note?: string;
  createdAt?: string;
}

interface TeacherHadiyaTabProps {
  teacher?: Staff | null;
}

export function TeacherHadiyaTab({ teacher: propTeacher }: TeacherHadiyaTabProps) {
  const { user } = useAuth();
  const [currentTeacher, setCurrentTeacher] = useState<Staff | null>(propTeacher || null);
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedReceipt, setSelectedReceipt] = useState<SalaryRecord | null>(null);

  const currentMonthISO = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const fetchHadiyaData = async () => {
    try {
      setIsLoading(true);

      const activeUid =
        user?.identifier ||
        (typeof window !== 'undefined' ? localStorage.getItem('madrasa_active_uid') : null) ||
        user?.id;

      let matchedStaff: Staff | null = propTeacher || currentTeacher || null;

      // ১. যদি শিক্ষক অবজেক্ট না থাকে বা মাসিক হাদিয়া ০ থাকে, তবে সুপাবেস staff টেবিল থেকে লোড করা
      if (!matchedStaff || !matchedStaff.monthlySalary) {
        try {
          const { data: cloudStaff } = await supabase
            .from('staff')
            .select('*');

          if (cloudStaff && cloudStaff.length > 0) {
            const cleanUid = String(activeUid || '').toLowerCase().trim();
            const found = cloudStaff.find((s: any) => {
              const suid = String(s.teacher_uid || s.id || '').toLowerCase().trim();
              const sphone = String(s.phone || '').trim();
              return suid === cleanUid || suid.includes(cleanUid) || sphone === user?.phone || sphone === activeUid;
            });

            if (found) {
              matchedStaff = {
                id: found.id,
                teacher_uid: found.teacher_uid || found.id,
                fullName: found.full_name || found.fullName || found.name || '',
                phone: found.phone || '',
                email: found.email || '',
                role: found.role || 'teacher',
                designation: found.designation || 'শিক্ষক',
                assignedClass: found.assigned_class || found.assignedClass || '',
                isClassTeacher: found.is_class_teacher ?? false,
                monthlySalary: Number(found.monthly_salary || found.monthlySalary || 15000),
                photoUrl: found.photo_url || found.photoUrl || '',
                joiningDate: found.joining_date || found.joiningDate || new Date().toISOString().split('T')[0],
                status: found.status || 'active',
                createdAt: found.created_at || new Date().toISOString(),
                updatedAt: found.updated_at || new Date().toISOString(),
              };
            }
          }
        } catch (e) {
          console.warn('Fetch staff in TeacherHadiyaTab warning:', e);
        }
      }

      // ২. সুপাবেসে না পেলে LocalDb থেকে শিক্ষক নিশ্চিত করা
      if (!matchedStaff) {
        const staffList = await localDb.staff.toArray();
        if (activeUid && staffList.length > 0) {
          const cleanUid = String(activeUid).toLowerCase().trim();
          matchedStaff = staffList.find((s) => {
            const uid = (s.teacher_uid || s.id || '').toLowerCase();
            const phone = (s.phone || '').trim();
            return uid === cleanUid || uid.includes(cleanUid) || phone === activeUid;
          }) || null;
        }

        if (!matchedStaff && staffList.length > 0) {
          matchedStaff = staffList.find((s) => s.role === 'teacher') || staffList[0];
        }
      }

      if (matchedStaff) {
        setCurrentTeacher(matchedStaff);
      }

      // ৩. সুপাবেস teacher_salaries টেবিল থেকে হাদিয়া হিস্ট্রি ফেচ করা
      const teacherIdKey = matchedStaff?.id || activeUid;
      const teacherUidKey = matchedStaff?.teacher_uid || activeUid;
      const teacherPhone = matchedStaff?.phone || user?.phone;

      let salaryList: any[] = [];

      try {
        const { data: supaSalaries } = await supabase
          .from('teacher_salaries')
          .select('*');

        if (supaSalaries && supaSalaries.length > 0) {
          salaryList = supaSalaries.filter((s: any) => {
            const tid = String(s.teacher_id || '').trim();
            return (
              tid === String(teacherIdKey) ||
              tid === String(teacherUidKey) ||
              (teacherPhone && tid === String(teacherPhone)) ||
              (activeUid && tid === String(activeUid))
            );
          });
        }
      } catch (salErr) {
        console.warn('Fetch teacher_salaries warning:', salErr);
      }

      // ৪. সুপাবেসে রেকর্ড না থাকলে LocalDb / LocalStorage থেকে ব্যাকআপ নেওয়া
      if (salaryList.length === 0) {
        const cached = localStorage.getItem('madrasa_cached_salaries');
        if (cached) {
          try {
            const parsed: SalaryPayment[] = JSON.parse(cached);
            salaryList = parsed
              .filter(
                (s: any) =>
                  s.teacherId === teacherIdKey ||
                  s.teacherId === teacherUidKey ||
                  (teacherPhone && s.teacherId === teacherPhone) ||
                  (activeUid && s.teacherId === activeUid)
              )
              .map((s: any) => ({
                id: s.id,
                teacher_id: s.teacherId,
                amount: s.amount,
                month: s.month,
                payment_date: s.paymentDate,
                payment_time: s.paymentTime,
                payment_method: s.paymentMethod,
                note: s.note,
              }));
          } catch (e) {
            console.warn('Read cached salaries in HadiyaTab error:', e);
          }
        }
      }

      const mapped: SalaryRecord[] = salaryList.map((s: any) => ({
        id: s.id,
        teacherId: s.teacher_id,
        amount: Number(s.amount),
        month: s.month,
        paymentDate: s.payment_date,
        paymentTime: s.payment_time || 'সকাল ১০:৩০ মিনিট',
        paymentMethod: s.payment_method || 'নগদ ক্যাশ',
        note: s.note || '',
        createdAt: s.created_at,
      }));

      mapped.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
      setSalaries(mapped);
    } catch (err) {
      console.error('হাদিয়া হিস্ট্রি লোড এরর:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHadiyaData();

    const channel = supabase
      .channel('realtime_hadiya_tab_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teacher_salaries' },
        () => fetchHadiyaData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff' },
        () => fetchHadiyaData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, propTeacher]);

  const currentMonthPayment = useMemo(() => {
    return salaries.find((s) => s.month.includes(currentMonthISO));
  }, [salaries, currentMonthISO]);

  const monthlySalaryRate = currentTeacher?.monthlySalary || propTeacher?.monthlySalary || 0;

  return (
    <div className="space-y-4 font-hind pb-24 animate-in fade-in duration-200">
      {/* ১. ধার্যকৃত হাদিয়া ও স্ট্যাটাস কার্ড */}
      <div className="relative rounded-3xl bg-gradient-to-tr from-[#008955] via-[#007a4c] to-[#04633e] p-5 text-white shadow-xs">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-200 flex items-center gap-1.5">
              <Wallet size={14} />
              <span>নির্ধারিত মাসিক হাদিয়া</span>
            </span>
            <p className="text-3xl font-black font-sans tracking-tight mt-1.5">
              ৳ {Number(monthlySalaryRate).toLocaleString('en-US')}
            </p>
          </div>

          {currentMonthPayment ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 px-3 py-1 text-xs font-bold text-emerald-100 shadow-inner">
              <BadgeCheck size={14} className="text-emerald-300" />
              <span>পরিশোধ সম্পন্ন</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 border border-amber-300/40 px-3 py-1 text-xs font-bold text-amber-200 shadow-inner">
              <Clock size={13} className="text-amber-300" />
              <span>ইস্যু প্রক্রিয়াধীন</span>
            </span>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-emerald-100">
          <span className="flex items-center gap-1">
            {currentMonthPayment ? (
              <>
                <CheckCircle2 size={13} className="text-emerald-300" />
                <span>চলতি মাসের হাদিয়া পরিশোধিত</span>
              </>
            ) : (
              <>
                <AlertCircle size={13} className="text-amber-300" />
                <span>চলতি মাসের হাদিয়া এখনো ইস্যু করা হয়নি</span>
              </>
            )}
          </span>

          <span className="font-sans font-bold bg-black/20 px-2.5 py-0.5 rounded-lg text-white">
            {currentMonthISO}
          </span>
        </div>
      </div>

      {/* ২. হাদিয়া গ্রহণের ইতিহাস ও রশিদ তালিকা */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <FileText size={15} className="text-[#008955]" />
            <span>হাদিয়া গ্রহণের ইতিহাস ও রশিদ</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-sans">
            মোট {salaries.length} টি রেকর্ড
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-3 border-[#008955] border-t-transparent"></div>
            <p className="mt-2 text-xs font-medium text-slate-400">হাদিয়ার বিবরণ লোড হচ্ছে...</p>
          </div>
        ) : salaries.length > 0 ? (
          salaries.map((rec) => (
            <div
              key={rec.id}
              onClick={() => setSelectedReceipt(rec)}
              className="bg-white border border-[#DFECE5] rounded-2xl p-3.5 shadow-2xs hover:border-[#008955] active:scale-[0.99] transition cursor-pointer space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#E7F6ED] text-[#008955] border border-[#CDE9DC] flex items-center justify-center shrink-0">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">
                      {rec.month} মাসের হাদিয়া
                    </h4>
                    <p className="text-[10px] text-slate-400 font-sans mt-0.5 flex items-center gap-1">
                      <Calendar size={11} className="text-[#008955]" />
                      <span>{rec.paymentDate}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-[#008955] font-sans block">
                    +৳ {rec.amount.toLocaleString('en-US')}
                  </span>
                  <span className="inline-block mt-0.5 rounded-md bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 uppercase">
                    {rec.paymentMethod}
                  </span>
                </div>
              </div>

              {rec.note && (
                <div className="bg-slate-50 rounded-xl px-2.5 py-1 text-[10px] text-slate-600 border border-slate-100 flex items-start gap-1">
                  <span className="font-bold text-[#008955] shrink-0">নোট:</span>
                  <p className="truncate">{rec.note}</p>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-[#DFECE5] bg-white p-8 text-center shadow-2xs">
            <Receipt size={28} className="mx-auto text-slate-300" />
            <p className="mt-2 text-xs font-bold text-slate-700">কোনো হাদিয়ার রেকর্ড পাওয়া যায়নি</p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              অ্যাডমিন থেকে হাদিয়া পরিশোধ ও রসিদ তৈরি করা হলে এখানে স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে।
            </p>
          </div>
        )}
      </div>

      {/* ৩. অফিসিয়াল মানি রসিদ ভাউচার পপআপ */}
      {selectedReceipt && (
        <div
          onClick={() => setSelectedReceipt(null)}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 backdrop-blur-md p-3 font-hind animate-in fade-in"
        >
          <div
            id="printable-receipt-card"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[360px] rounded-3xl bg-white p-5 shadow-2xl border border-emerald-300 text-slate-800"
          >
            <div className="text-center pb-3 border-b border-dashed border-emerald-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  শিক্ষক কপি
                </span>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="h-7 w-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="h-10 w-10 mx-auto rounded-2xl bg-[#E7F6ED] text-[#008955] flex items-center justify-center mb-1 shadow-2xs">
                <ShieldCheck size={24} />
              </div>
              <h2 className="text-sm font-black text-slate-900 leading-snug text-center">মাদ্রাসায়ে ইসলামিয়া দারুল উলুম, কোম্পানিগঞ্জ।</h2>
              <p className="text-[10px] text-[#008955] font-bold tracking-wide mt-0.5">
                শিক্ষক হাদিয়া ও বেতন পরিশোধ ভাউচার
              </p>
              <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                ভাউচার নং: {selectedReceipt.id}
              </p>
            </div>

            <div className="py-3 space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">ওস্তাদের নাম:</span>
                  <span className="font-bold text-slate-900">
                    {currentTeacher?.fullName || propTeacher?.fullName || user?.name || 'মুহতারাম শিক্ষক'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">পদবী:</span>
                  <span className="font-bold text-[#008955]">
                    {currentTeacher?.designation || propTeacher?.designation || 'শিক্ষক'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">হাদিয়ার মাস:</span>
                  <span className="font-bold text-slate-800">{selectedReceipt.month}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">পরিশোধের তারিখ:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedReceipt.paymentDate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">পরিশোধের সময়:</span>
                  <span className="font-bold text-slate-800">{selectedReceipt.paymentTime || 'সকাল ১০:৩০ মিনিট'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">পেমেন্ট মাধ্যম:</span>
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    {selectedReceipt.paymentMethod}
                  </span>
                </div>
              </div>

              {selectedReceipt.note && (
                <div className="pt-2 border-t border-slate-100 text-[10px]">
                  <span className="text-slate-400 block mb-0.5 font-semibold">মন্তব্য/নোট:</span>
                  <p className="bg-slate-50 p-2 rounded-lg text-slate-700 border border-slate-100 leading-relaxed">
                    {selectedReceipt.note}
                  </p>
                </div>
              )}

              <div className="my-2.5 p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-[#E7F6ED] border border-emerald-300 text-center">
                <span className="text-[10px] font-bold text-[#008955] block">পরিশোধিত হাদিয়ার পরিমাণ</span>
                <p className="text-2xl font-black text-[#008955] font-sans mt-0.5">
                  ৳ {selectedReceipt.amount.toLocaleString('en-US')}
                </p>
                <span className="text-[9px] font-bold text-slate-500">স্ট্যাটাস: পরিশোধ সম্পন্ন (PAID)</span>
              </div>
            </div>

            <div className="pt-2 border-t border-dashed border-slate-200">
              <div className="flex justify-between items-end pb-3 text-[9px] text-slate-400">
                <div className="text-center">
                  <div className="w-20 border-b border-slate-300 mb-1"></div>
                  <span>মুহতামিম স্বাক্ষর</span>
                </div>
                <div className="text-center">
                  <div className="w-20 border-b border-slate-300 mb-1"></div>
                  <span>হিসাবরক্ষক</span>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition active:scale-95 cursor-pointer"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}