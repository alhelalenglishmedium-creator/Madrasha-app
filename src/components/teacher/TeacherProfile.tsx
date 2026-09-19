'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  User,
  Phone,
  Briefcase,
  Calendar,
  LogOut,
  Mail,
  ShieldCheck,
  BookOpen,
  Wallet,
  Clock,
  FileText,
  Receipt,
  Users,
  BadgeCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Printer,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { localDb } from '@/db/localDb';
import { supabase } from '@/lib/supabaseClient';
import type { Staff, Student, SalaryPayment } from '@/types/database.types';

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

interface TeacherProfileProps {
  teacher?: Staff | null;
}

export function TeacherProfile({ teacher: initialTeacher }: TeacherProfileProps) {
  const { user, logout } = useAuth();
  const [teacher, setTeacher] = useState<Staff | null>(() => {
    if (initialTeacher) return initialTeacher;
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('madrasa_teacher_profile');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {}
      }
    }
    return null;
  });
  const [salaryHistory, setSalaryHistory] = useState<SalaryRecord[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(!initialTeacher && !teacher);
  const [selectedReceipt, setSelectedReceipt] = useState<SalaryRecord | null>(null);

  const currentMonthISO = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const loadProfileData = async () => {
    try {
      const activeUid =
        user?.identifier ||
        (typeof window !== 'undefined' ? localStorage.getItem('madrasa_active_uid') : null) ||
        user?.id;

      let matchedStaff: Staff | null = initialTeacher || teacher || null;

      const cleanUid = String(activeUid || '').toLowerCase().trim();
      const onlyDigits = cleanUid.replace(/\D/g, '');
      const uPhone = String(user?.phone || '').trim();
      const uEmail = String(user?.email || '').trim().toLowerCase();

      const isRecordMatch = (rec: any) => {
        const rId = String(rec.id || '').toLowerCase().trim();
        const rUid = String(rec.teacher_uid || rec.id || '').toLowerCase().trim();
        const rPhone = String(rec.phone || '').trim();
        const rEmail = String(rec.email || '').toLowerCase().trim();

        return (
          (cleanUid && (rId === cleanUid || rUid === cleanUid || rId.includes(cleanUid) || rUid.includes(cleanUid))) ||
          (onlyDigits && (rId.endsWith(onlyDigits) || rUid.endsWith(onlyDigits))) ||
          (uPhone && rPhone === uPhone) ||
          (uEmail && rEmail === uEmail)
        );
      };

      // ১. সুপাবেস staff টেবিল ফেচ
      if (!matchedStaff || matchedStaff.fullName === 'মুহতারাম শিক্ষক') {
        try {
          const { data: cloudStaff } = await supabase.from('staff').select('*');
          if (cloudStaff && cloudStaff.length > 0) {
            const found = cloudStaff.find(isRecordMatch);
            if (found) {
              matchedStaff = {
                id: found.id,
                teacher_uid: found.teacher_uid || found.id,
                fullName: found.full_name || found.fullName || found.name || user?.name || 'মুহতারাম শিক্ষক',
                phone: found.phone || user?.phone || '',
                email: found.email || user?.email || '',
                role: found.role || 'teacher',
                designation: found.designation || 'শিক্ষক',
                assignedClass: found.assigned_class || found.assignedClass || 'হিফজ',
                isClassTeacher: found.is_class_teacher ?? found.isClassTeacher ?? true,
                monthlySalary: Number(found.monthly_salary || found.monthlySalary || 15000),
                photoUrl: found.photo_url || found.photoUrl || user?.avatarUrl || '',
                joiningDate: found.joining_date || found.joiningDate || new Date().toISOString().split('T')[0],
                status: found.status || 'active',
                createdAt: found.created_at || new Date().toISOString(),
                updatedAt: found.updated_at || new Date().toISOString(),
              };
            }
          }
        } catch (supaErr) {
          console.warn('Cloud staff fetch error:', supaErr);
        }
      }

      // ২. সুপাবেস teachers টেবিল ফেচ
      if (!matchedStaff) {
        try {
          const { data: cloudTeachers } = await supabase.from('teachers').select('*');
          if (cloudTeachers && cloudTeachers.length > 0) {
            const foundTc = cloudTeachers.find(isRecordMatch);
            if (foundTc) {
              matchedStaff = {
                id: foundTc.id,
                teacher_uid: foundTc.teacher_uid || foundTc.id,
                fullName: foundTc.full_name || foundTc.fullName || foundTc.name || user?.name || 'মুহতারাম শিক্ষক',
                phone: foundTc.phone || user?.phone || '',
                email: foundTc.email || user?.email || '',
                role: 'teacher',
                designation: foundTc.designation || 'শিক্ষক',
                assignedClass: foundTc.assigned_class || foundTc.assignedClass || 'হিফজ',
                isClassTeacher: true,
                monthlySalary: Number(foundTc.monthly_salary || foundTc.monthlySalary || 15000),
                photoUrl: foundTc.photo_url || foundTc.photoUrl || user?.avatarUrl || '',
                joiningDate: foundTc.joining_date || foundTc.joiningDate || new Date().toISOString().split('T')[0],
                status: 'active',
                createdAt: foundTc.created_at || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
            }
          }
        } catch (e) {
          console.warn('Cloud teachers fetch error:', e);
        }
      }

      // ৩. LocalDb ফেচ
      if (!matchedStaff) {
        const staffList = await localDb.staff.toArray();
        if (staffList.length > 0) {
          matchedStaff = staffList.find(isRecordMatch) || null;
          if (!matchedStaff && staffList.length > 0) {
            matchedStaff = staffList.find((s) => s.role === 'teacher') || staffList[0];
          }
        }
      }

      if (matchedStaff) {
        setTeacher(matchedStaff);
        if (typeof window !== 'undefined') {
          localStorage.setItem('madrasa_teacher_profile', JSON.stringify(matchedStaff));
        }
      }

      // ৩. হাদিয়া / পেমেন্ট হিস্ট্রি ফেচ
      const teacherIdKey = matchedStaff?.id || activeUid;
      const teacherUidKey = matchedStaff?.teacher_uid || activeUid;

      if (teacherIdKey || teacherUidKey) {
        try {
          const { data: supaSalaries } = await supabase
            .from('teacher_salaries')
            .select('*');

          if (supaSalaries && supaSalaries.length > 0) {
            const filtered = supaSalaries.filter(
              (s: any) =>
                s.teacher_id === teacherIdKey ||
                s.teacher_id === teacherUidKey ||
                (matchedStaff?.phone && s.teacher_id === matchedStaff.phone)
            );

            const mapped: SalaryRecord[] = filtered.map((s: any) => ({
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
            setSalaryHistory(mapped);
          } else {
            const cached = localStorage.getItem('madrasa_cached_salaries');
            if (cached) {
              const parsed: any[] = JSON.parse(cached);
              const filtered = parsed
                .filter((s) => s.teacherId === teacherIdKey || s.teacherId === teacherUidKey)
                .map((s) => ({
                  id: s.id,
                  staffId: s.teacherId || s.staffId || teacherIdKey,
                  amount: Number(s.amount || 0),
                  month: s.month || 'মাসিক বেতন',
                  paymentDate: s.paymentDate || new Date().toISOString().split('T')[0],
                  paymentMethod: s.paymentMethod || 'নগদ ক্যাশ',
                  notes: s.note || s.notes || '',
                }));
              setSalaryHistory(filtered as any);
            }
          }
        } catch (salErr) {
          console.warn('Salary history fetch warning:', salErr);
        }

        // ৪. অ্যাসাইন করা শিক্ষার্থীদের তালিকা ফেচ
        try {
          const { data: supaStudents } = await supabase
            .from('students')
            .select('*');

          let allStudents: Student[] = [];

          if (supaStudents && supaStudents.length > 0) {
            allStudents = supaStudents.map((std: any) => ({
              id: std.id,
              admissionNo: std.admission_no || std.id,
              fullName: std.full_name || std.name || 'শিক্ষার্থী',
              fullNameBangla: std.name || std.full_name_bangla || std.full_name || 'শিক্ষার্থী',
              className: std.class_name || std.className || 'হিফজুল কুরআন',
              rollNo: String(std.roll || std.roll_no || '০১'),
              fatherName: std.father_name || '',
              phone: std.phone || '',
              monthlyFee: Number(std.monthly_fee || 1000),
              photoUrl: std.photo_url || '',
              assigned_teacher_uid: std.assigned_teacher_uid || '',
              assigned_teacher_name: std.assigned_teacher_name || '',
              status: std.status || 'active',
              createdAt: std.created_at,
              updatedAt: std.updated_at || new Date().toISOString(),
            }));
          } else {
            allStudents = await localDb.students.where('status').equals('active').toArray();
          }

          let assigned = allStudents.filter((std: any) => {
            const stdTeacherUid = String(std.assigned_teacher_uid || '').trim();
            const isDirectlyAssigned =
              stdTeacherUid &&
              (stdTeacherUid === String(teacherIdKey) ||
                stdTeacherUid === String(teacherUidKey) ||
                (matchedStaff?.phone && stdTeacherUid === String(matchedStaff.phone)));

            const isClassMatch = matchedStaff?.assignedClass && std.className === matchedStaff.assignedClass;

            return isDirectlyAssigned || isClassMatch;
          });

          assigned.sort((a, b) => Number(a.rollNo || 0) - Number(b.rollNo || 0));
          setAssignedStudents(assigned);
        } catch (stdErr) {
          console.warn('Assigned students fetch warning:', stdErr);
        }
      }
    } catch (err) {
      console.error('প্রোফাইল লোড ত্রুটি:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();

    // Supabase Realtime চ্যানেল সাবস্ক্রিপশন
    const channel = supabase
      .channel('realtime_teacher_profile_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff' },
        () => loadProfileData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teacher_salaries' },
        () => loadProfileData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students' },
        () => loadProfileData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, initialTeacher]);

  const currentMonthPayment = useMemo(() => {
    return salaryHistory.find((s) => s.month.includes(currentMonthISO));
  }, [salaryHistory, currentMonthISO]);

  if (isLoading) {
    return (
      <div className="py-20 text-center font-hind">
        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-3 border-[#008955] border-t-transparent"></div>
        <p className="mt-2 text-xs font-medium text-slate-400">প্রোফাইল তথ্য লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28 font-hind text-slate-800 animate-in fade-in duration-200">
      
      {/* ১. ওস্তাদের প্রোফাইল কার্ড */}
      <div className="relative p-[2px] rounded-3xl rounded-tr-[40px] rounded-bl-[40px] overflow-hidden shadow-xs">
        <div className="emerald-royal-glow" />
        <div className="relative z-10 bg-gradient-to-tr from-[#008955] via-[#007a4c] to-[#04633e] rounded-[1.4rem] rounded-tr-[38px] rounded-bl-[38px] p-5 text-white shadow-inner">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl rounded-tr-3xl rounded-bl-3xl bg-white border-2 border-emerald-300/40 shadow-sm overflow-hidden flex items-center justify-center">
                {teacher?.photoUrl ? (
                  <img
                    src={teacher.photoUrl}
                    alt={teacher.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={34} className="text-[#008955]" />
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-white" />
            </div>

            <div className="min-w-0 flex-1">
              <span className="rounded-md bg-white/20 px-2 py-0.2 text-[9px] font-bold text-emerald-100 uppercase tracking-wider">
                শিক্ষক পরিচয়পত্র
              </span>
              <h2 className="text-base font-black text-white mt-1 leading-snug truncate">
                {teacher?.fullName || user?.name || 'মুহতারাম শিক্ষক'}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[10px] font-bold text-emerald-950 bg-emerald-200/90 px-2 py-0.2 rounded-md">
                  {teacher?.designation || 'শিক্ষক'}
                </span>
                <span className="text-[10px] text-emerald-100 font-medium">
                  • {teacher?.assignedClass ? `${teacher.assignedClass} বিভাগ` : 'হিফজ বিভাগ'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-emerald-100">
            <span className="text-[10px] bg-black/20 px-2.5 py-0.5 rounded-lg text-white font-mono">
              আইডি: {teacher?.teacher_uid || teacher?.id || 'T-2026'}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-200">
              <ShieldCheck size={13} className="text-emerald-300" />
              <span>সক্রিয় ও অনুমোদিত</span>
            </span>
          </div>
        </div>
      </div>

      {/* ২. ব্যক্তিগত ও প্রাতিষ্ঠানিক তথ্য */}
      <div className="rounded-2xl border border-[#DFECE5] bg-white p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Briefcase size={14} className="text-[#008955]" />
            <span>প্রাতিষ্ঠানিক ও ব্যক্তিগত তথ্য</span>
          </h3>
          <span className="text-[10px] font-bold text-[#008955] bg-[#E7F6ED] px-2 py-0.5 rounded-md">
            অফিসিয়াল
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500">
              <Phone size={14} className="text-[#008955]" />
              <span>মোবাইল নম্বর</span>
            </div>
            <span className="font-bold text-slate-800 font-sans">
              {teacher?.phone || user?.phone || 'তথ্য নেই'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500">
              <BookOpen size={14} className="text-[#008955]" />
              <span>দায়িত্বপ্রাপ্ত শ্রেণি</span>
            </div>
            <span className="font-bold text-slate-800">
              {teacher?.assignedClass ? `${teacher.assignedClass} বিভাগ` : 'হিফজ বিভাগ'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500">
              <Wallet size={14} className="text-[#008955]" />
              <span>নির্ধারিত মাসিক হাদিয়া</span>
            </div>
            <span className="font-black text-[#008955] font-sans">
              ৳ {Number(teacher?.monthlySalary || 0).toLocaleString('en-US')}
            </span>
          </div>

          {teacher?.joiningDate && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500">
                <Calendar size={14} className="text-[#008955]" />
                <span>যোগদানের তারিখ</span>
              </div>
              <span className="font-bold text-slate-800 font-sans">
                {teacher.joiningDate}
              </span>
            </div>
          )}

          {teacher?.email && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500">
                <Mail size={14} className="text-[#008955]" />
                <span>ইমেইল</span>
              </div>
              <span className="font-medium text-slate-700 font-sans truncate max-w-[180px]">
                {teacher.email}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ৩. হাদিয়া ও পেমেন্ট হিস্ট্রি সেকশন */}
      <div className="rounded-2xl border border-[#DFECE5] bg-white p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <FileText size={15} className="text-[#008955]" />
            <span>হাদিয়া ও পেমেন্ট হিস্ট্রি</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-sans">
            মোট {salaryHistory.length} টি রেকর্ড
          </span>
        </div>

        {salaryHistory.length > 0 ? (
          <div className="space-y-2">
            {salaryHistory.map((rec) => (
              <div
                key={rec.id}
                onClick={() => setSelectedReceipt(rec)}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:border-[#008955] active:scale-[0.99] transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-[#E7F6ED] text-[#008955] flex items-center justify-center shrink-0">
                    <Receipt size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">
                      {rec.month} মাসের হাদিয়া
                    </h4>
                    <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                      {rec.paymentDate} • {rec.paymentMethod}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black text-[#008955] font-sans block">
                    +৳ {rec.amount.toLocaleString('en-US')}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-700">রসিদ দেখুন</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
            <Receipt size={22} className="mx-auto text-slate-300" />
            <p className="text-xs font-bold text-slate-600 mt-1">কোনো হাদিয়ার রেকর্ড পাওয়া যায়নি</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              অ্যাডমিন থেকে হাদিয়া প্রদান করা হলে এখানে প্রদর্শিত হবে।
            </p>
          </div>
        )}
      </div>

      {/* ৪. অ্যাসাইন করা শিক্ষার্থীদের তালিকা সেকশন */}
      <div className="rounded-2xl border border-[#DFECE5] bg-white p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Users size={15} className="text-[#008955]" />
            <span>অ্যাসাইন করা শিক্ষার্থীদের তালিকা</span>
          </h3>
          <span className="text-[10px] font-bold text-[#008955] bg-[#E7F6ED] px-2 py-0.5 rounded-md font-sans">
            {assignedStudents.length} জন
          </span>
        </div>

        {assignedStudents.length > 0 ? (
          <div className="space-y-2">
            {assignedStudents.map((std) => (
              <div
                key={std.id}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#E7F6ED] text-[#008955] border border-[#CDE9DC] flex items-center justify-center shrink-0 overflow-hidden">
                    {std.photoUrl ? (
                      <img src={std.photoUrl} alt={std.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <GraduationCap size={18} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                      {std.fullNameBangla || std.fullName}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-sans mt-0.5 truncate">
                      রোল: {std.rollNo || '০১'} • আইডি: {std.admissionNo || std.id}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {std.phone ? (
                    <a
                      href={`tel:${std.phone}`}
                      className="px-2 py-1 rounded-lg bg-[#E7F6ED] text-[#008955] hover:bg-[#008955] hover:text-white border border-[#BBE3D3] flex items-center gap-1 text-[10px] font-bold transition active:scale-95"
                    >
                      <Phone size={10} />
                      <span>কল</span>
                    </a>
                  ) : (
                    <span className="text-[9px] text-slate-400 font-medium">{std.className}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
            <Users size={22} className="mx-auto text-slate-300" />
            <p className="text-xs font-bold text-slate-600 mt-1">কোনো অ্যাসাইন করা শিক্ষার্থী নেই</p>
          </div>
        )}
      </div>

      {/* ৫. লগআউট বাটন */}
      <div className="pt-2">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/60 py-3 text-xs font-bold text-rose-600 transition hover:bg-rose-100 active:scale-95 shadow-2xs"
        >
          <LogOut size={15} />
          <span>লগআউট করুন</span>
        </button>
      </div>

      {/* অফিসিয়াল মানি রসিদ ভাউচার পপআপ */}
      {selectedReceipt && (
        <div
          onClick={() => setSelectedReceipt(null)}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 backdrop-blur-md p-3 font-hind animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[360px] rounded-3xl bg-white p-5 shadow-2xl border border-emerald-300 text-slate-800"
          >
            <div className="text-center pb-3 border-b border-dashed border-emerald-200">
              <div className="flex items-center justify-between no-print mb-1">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  শিক্ষক কপি
                </span>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="h-7 w-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
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
                    {teacher?.fullName || user?.name || 'মুহতারাম শিক্ষক'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">পদবী:</span>
                  <span className="font-bold text-[#008955]">
                    {teacher?.designation || 'শিক্ষক'}
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

              <div className="flex items-center gap-2 no-print">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 rounded-xl bg-[#008955] hover:bg-[#007548] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
                >
                  <Printer size={15} />
                  <span>প্রিন্ট করুন</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition active:scale-95"
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
