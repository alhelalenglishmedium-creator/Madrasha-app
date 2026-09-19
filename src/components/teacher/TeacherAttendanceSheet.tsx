'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Check,
  X,
  Search,
  Users,
  TrendingUp,
  CheckCheck,
  PhoneCall,
  ShieldCheck,
  User,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { supabase, supabaseAnon } from '@/lib/supabaseClient';
import { localDb } from '@/db/localDb';
import type { Staff, AttendanceRecord, GuardianContact } from '@/types/database.types';

export type AttendanceStatus = 'present' | 'absent' | 'leave';
type TimeRange = 'today' | 'weekly' | 'monthly' | 'yearly';

interface StudentAttendanceItem {
  id: string;
  fullName: string;
  rollNo: number | string;
  className: string;
  photoUrl?: string;
  guardianPhone: string;
  guardianContacts?: GuardianContact[];
  status: AttendanceStatus;
}

interface TeacherAttendanceSheetProps {
  teacher?: Staff | null;
}

export function TeacherAttendanceSheet({ teacher }: TeacherAttendanceSheetProps) {
  const [students, setStudents] = useState<StudentAttendanceItem[]>([]);
  const [allClassRecords, setAllClassRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [activeCallStudent, setActiveCallStudent] = useState<StudentAttendanceItem | null>(null);

  // শিক্ষার্থী ও পূর্ববর্তী সমস্ত প্রকৃত হাজিরা লোড
  useEffect(() => {
    const fetchStudentsAndAttendance = async () => {
      try {
        setIsLoading(true);

        const lockKey = `attendance_locked_${selectedDate}_${teacher?.id || 'default'}`;
        const isLocked = localStorage.getItem(lockKey) === 'true';
        setIsSubmitted(isLocked);

        // ১. কঠোরভাবে লগইন করা শিক্ষককে অ্যাসাইন করা সক্রিয় শিক্ষার্থীদের ফেচ
        const currentTeacherId = teacher?.teacher_uid || teacher?.id || (typeof window !== 'undefined' ? localStorage.getItem('madrasa_active_uid') : null);
        const tUid = String(currentTeacherId || '').trim().toLowerCase();
        const tId = String(teacher?.id || '').trim().toLowerCase();
        const tPhone = String(teacher?.phone || '').trim();

        const fetchClient = supabaseAnon || supabase;
        const { data: supaStudents, error } = await fetchClient
          .from('students')
          .select('*')
          .eq('status', 'active');

        if (error) {
          console.error('Supabase students fetch error in Attendance Sheet:', error);
        }

        let rawStudents: any[] = [];

        if (!error && supaStudents && supaStudents.length > 0) {
          rawStudents = supaStudents.filter((std: any) => {
            const stdTeacherUid = String(std.assigned_teacher_uid || '').trim().toLowerCase();
            return (
              stdTeacherUid &&
              (stdTeacherUid === tUid ||
                stdTeacherUid === tId ||
                (tPhone && stdTeacherUid === tPhone))
            );
          });
        }

        if (rawStudents.length === 0) {
          const localList = await localDb.students.where('status').equals('active').toArray();
          if (currentTeacherId || teacher) {
            rawStudents = localList.filter((std: any) => {
              const stdTeacherUid = String(std.assigned_teacher_uid || '').trim().toLowerCase();
              return (
                stdTeacherUid &&
                (stdTeacherUid === tUid ||
                  stdTeacherUid === tId ||
                  (tPhone && stdTeacherUid === tPhone))
              );
            });
          }
        }

        rawStudents.sort((a, b) => Number(a.roll || a.rollNo || 0) - Number(b.roll || b.rollNo || 0));

        // ২. ক্লাউড থেকে সব হাজিরা রেকর্ড ফেচ করা
        let attendanceQuery = supabase.from('attendance').select('*');
        if (teacher?.assignedClass) {
          attendanceQuery = attendanceQuery.eq('class_name', teacher.assignedClass);
        }

        const { data: supaAttendance } = await attendanceQuery;
        let allRecords: AttendanceRecord[] = [];

        if (supaAttendance && supaAttendance.length > 0) {
          allRecords = supaAttendance.map((a: any) => ({
            id: a.id || `att_${a.student_id}_${a.date}`,
            studentId: a.student_id,
            date: a.date,
            status: a.status,
            className: a.class_name,
            synced: true,
            createdAt: a.created_at,
          }));
        } else {
          const localAtt = await localDb.attendance.toArray();
          allRecords = teacher?.assignedClass
            ? localAtt.filter((a) => a.className === teacher.assignedClass)
            : localAtt;
        }
        setAllClassRecords(allRecords);

        // ৩. নির্বাচিত দিনের স্ট্যাটাস ও অভিভাবক নম্বর পার্সিং
        if (rawStudents.length > 0) {
          const todayRecords = allRecords.filter((r) => r.date === selectedDate);
          const statusMap = new Map<string, AttendanceStatus>();

          if (todayRecords.length > 0) {
            todayRecords.forEach((r) => {
              statusMap.set(
                r.studentId,
                r.status === 'absent' ? 'absent' : r.status === 'leave' ? 'leave' : 'present'
              );
            });
            setIsSubmitted(true);
          }

          const formatted: StudentAttendanceItem[] = rawStudents.map((st: any, idx: number) => {
            const rawContacts = Array.isArray(st.guardian_contacts)
              ? st.guardian_contacts
              : (typeof st.guardian_contacts === 'string'
                  ? (function () { try { return JSON.parse(st.guardian_contacts); } catch (e) { return []; } })()
                  : (Array.isArray(st.guardianContacts) ? st.guardianContacts : []));

            const validContacts: GuardianContact[] = rawContacts.filter(
              (c: any) => c && c.phone && String(c.phone).trim().length > 0
            );

            const primaryPhone = st.phone || st.guardian_phone || st.guardianPhone || (validContacts[0]?.phone || '');

            return {
              id: st.id,
              fullName: st.full_name_bangla || st.full_name || st.fullName || `শিক্ষার্থী ${idx + 1}`,
              rollNo: st.roll_no || st.rollNo || st.roll || idx + 1,
              className: st.class_name || st.className || teacher?.assignedClass || 'হিফজ বিভাগ',
              photoUrl: st.photo_url || st.photoUrl,
              guardianPhone: primaryPhone,
              guardianContacts: validContacts.length > 0 ? validContacts : (primaryPhone ? [{ id: 'c_1', title: 'অভিভাবক', phone: primaryPhone }] : []),
              status: statusMap.get(st.id) || 'present',
            };
          });
          setStudents(formatted);
        } else {
          setStudents([]);
        }
      } catch (err) {
        console.error('হাজিরা ডেটা ফেচিং ত্রুটি:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentsAndAttendance();
  }, [teacher, selectedDate]);

  // অনুপস্থিত শিক্ষার্থীর অভিভাবককে স্মার্ট কল দেওয়ার লজিক
  const handleCallGuardian = (student: StudentAttendanceItem) => {
    const contacts = (student.guardianContacts || []).filter(
      (c) => c && c.phone && String(c.phone).trim().length > 0
    );

    if (contacts.length === 0 && student.guardianPhone && student.guardianPhone.trim()) {
      contacts.push({ id: 'c_default', title: 'অভিভাবক', phone: student.guardianPhone.trim() });
    }

    if (contacts.length === 0) {
      // কেস ৩: কোনো নম্বর পাওয়া না গেলে
      setToastMessage('কোনো অভিভাবকের নম্বর সংরক্ষিত নেই');
      setTimeout(() => setToastMessage(''), 3000);
    } else if (contacts.length === 1) {
      // কেস ১: ১টি নম্বর থাকলে সরাসরি ডায়াল প্যাড ওপেন
      const cleanNum = String(contacts[0].phone).replace(/[^0-9+]/g, '');
      const a = document.createElement('a');
      a.href = `tel:${cleanNum}`;
      a.click();
    } else {
      // কেস ২: একাধিক নম্বর থাকলে পপআপ মোডাল প্রদর্শন
      setActiveCallStudent({
        ...student,
        guardianContacts: contacts,
      });
    }
  };

  const calculateRateForPeriod = (startDate: string, endDate: string) => {
    const periodRecords = allClassRecords.filter(
      (r) => r.date >= startDate && r.date <= endDate
    );
    if (periodRecords.length === 0) return 0;
    const presentCount = periodRecords.filter((r) => r.status === 'present').length;
    return Math.round((presentCount / periodRecords.length) * 100);
  };

  const statistics = useMemo(() => {
    const total = students.length;
    const present = students.filter((s) => s.status === 'present').length;
    const absent = students.filter((s) => s.status === 'absent').length;
    const leave = students.filter((s) => s.status === 'leave').length;

    const todayRate = isSubmitted && total > 0 ? Math.round((present / total) * 100) : 0;
    const curr = new Date(selectedDate);

    const weekStart = new Date(curr);
    weekStart.setDate(curr.getDate() - 6);
    const weeklyRate = calculateRateForPeriod(
      weekStart.toISOString().split('T')[0],
      selectedDate
    );

    const monthStart = new Date(curr.getFullYear(), curr.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const monthlyRate = calculateRateForPeriod(monthStart, selectedDate);

    const yearStart = new Date(curr.getFullYear(), 0, 1)
      .toISOString()
      .split('T')[0];
    const yearlyRate = calculateRateForPeriod(yearStart, selectedDate);

    return {
      today: todayRate,
      weekly: weeklyRate,
      monthly: monthlyRate,
      yearly: yearlyRate,
      present: isSubmitted ? present : 0,
      absent: isSubmitted ? absent : 0,
      leave: isSubmitted ? leave : 0,
      total,
    };
  }, [students, isSubmitted, selectedDate, allClassRecords]);

  const setStudentStatus = (id: string, newStatus: AttendanceStatus) => {
    if (isSubmitted) return;
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    );
  };

  const markAllPresent = () => {
    if (isSubmitted) return;
    setStudents((prev) => prev.map((s) => ({ ...s, status: 'present' })));
  };

  const handleSaveAttendance = async () => {
    if (students.length === 0) return;
    try {
      setIsSaving(true);

      const records = students.map((s) => ({
        student_id: s.id,
        date: selectedDate,
        status: s.status,
        teacher_id: teacher?.id || null,
        class_name: s.className,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'student_id,date' });

      if (error) console.warn('Supabase Attendance Error:', error.message);

      for (const rec of records) {
        const localRecord = {
          id: `att_${rec.student_id}_${rec.date}`,
          studentId: rec.student_id,
          date: rec.date,
          status: rec.status,
          className: rec.class_name,
          synced: true,
          createdAt: rec.updated_at,
        };
        await localDb.attendance.put(localRecord as any);
      }

      const lockKey = `attendance_locked_${selectedDate}_${teacher?.id || 'default'}`;
      localStorage.setItem(lockKey, 'true');
      setIsSubmitted(true);

      const newlyAdded: AttendanceRecord[] = records.map((r) => ({
        id: `att_${r.student_id}_${r.date}`,
        studentId: r.student_id,
        date: r.date,
        status: r.status,
        className: r.class_name,
        synced: true,
        createdAt: r.updated_at,
      }));
      setAllClassRecords((prev) => [...prev.filter((p) => p.date !== selectedDate), ...newlyAdded]);

      setToastMessage('আজকের হাজিরা সফলভাবে সম্পন্ন ও লক করা হয়েছে!');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      console.error('সংরক্ষণে ত্রুটি:', err);
      setToastMessage('অফলাইনে হাজিরা সংরক্ষিত হয়েছে!');
      setTimeout(() => setToastMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        String(s.rollNo).includes(q)
    );
  }, [students, searchQuery]);

  return (
    <div className="space-y-3 font-hind pb-28 animate-in fade-in duration-200">

      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl bg-[#008955] text-white px-4 py-2.5 text-xs font-bold shadow-xl border border-emerald-300 animate-in slide-in-from-top-2">
          <CheckCircle2 size={16} className="text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================= ১. রয়্যাল উপস্থিতি সামারি ব্যানার ================= */}
      <div className="rounded-3xl bg-gradient-to-tr from-[#008955] via-[#007a4c] to-[#04633e] p-4.5 text-white shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp size={13} />
              <span>উপস্থিতির হার</span>
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h2 className="text-3xl font-black font-sans tracking-tight">
                {timeRange === 'today' && `${statistics.today}%`}
                {timeRange === 'weekly' && `${statistics.weekly}%`}
                {timeRange === 'monthly' && `${statistics.monthly}%`}
                {timeRange === 'yearly' && `${statistics.yearly}%`}
              </h2>
              {timeRange === 'today' && (
                <span className="text-[11px] text-emerald-100 font-medium">
                  {isSubmitted
                    ? `(${statistics.present}/${statistics.total} জন উপস্থিত)`
                    : '(হাজিরা এখনও নেওয়া হয়নি)'}
                </span>
              )}
            </div>
          </div>

          {!isSubmitted && (
            <button
              type="button"
              onClick={markAllPresent}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 active:scale-95 text-white px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-md transition shadow-xs"
            >
              <CheckCheck size={14} />
              <span>সবাই হাজির</span>
            </button>
          )}
        </div>

        {/* টাইম পিরিয়ড ফিল্টার */}
        <div className="flex items-center justify-between bg-black/20 p-1 rounded-2xl text-[11px] font-semibold">
          {(
            [
              { id: 'today', label: 'আজকের' },
              { id: 'weekly', label: 'সাপ্তাহিক' },
              { id: 'monthly', label: 'মাসিক' },
              { id: 'yearly', label: 'বাৎসরিক' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTimeRange(t.id as TimeRange)}
              className={`flex-1 py-1 text-center rounded-xl transition-all ${
                timeRange === t.id
                  ? 'bg-white text-[#008955] font-black shadow-2xs'
                  : 'text-emerald-100/80 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ৩টি লাইভ কাউন্ট পিল */}
        {timeRange === 'today' && (
          <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
            <div className="bg-black/15 p-2 rounded-2xl border border-white/10">
              <span className="text-[10px] text-emerald-100 block">উপস্থিত</span>
              <span className="font-black text-sm font-sans text-emerald-200">
                {statistics.present} জন
              </span>
            </div>

            <div className="bg-black/15 p-2 rounded-2xl border border-white/10">
              <span className="text-[10px] text-rose-200 block">অনুপস্থিত</span>
              <span className="font-black text-sm font-sans text-rose-300">
                {statistics.absent} জন
              </span>
            </div>

            <div className="bg-black/15 p-2 rounded-2xl border border-white/10">
              <span className="text-[10px] text-amber-200 block">ছুটি</span>
              <span className="font-black text-sm font-sans text-amber-300">
                {statistics.leave} জন
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ================= ২. কন্ট্রোল বার (তারিখ ও সার্চ) ================= */}
      <div className="bg-white rounded-2xl border border-[#DFECE5] p-2.5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#E7F6ED] text-[#008955] flex items-center justify-center shrink-0">
              <CalendarIcon size={14} />
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none font-sans cursor-pointer"
            />
          </div>

          <span className="text-[10px] font-bold text-[#008955] bg-[#E7F6ED] px-2.5 py-0.5 rounded-full border border-[#CDE9DC]">
            {teacher?.assignedClass || 'হিফজ'} বিভাগ
          </span>
        </div>

        <div className="relative flex items-center pt-1 border-t border-slate-100">
          <Search size={13} className="absolute left-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="ছাত্রের নাম বা রোল নম্বর..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#008955] placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* ================= ৩. শিক্ষার্থী হাজিরা কার্ড তালিকা ================= */}
      <div className="space-y-2 pt-1">
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-3 border-[#008955] border-t-transparent"></div>
            <p className="mt-2 text-xs font-medium text-slate-400">হাজিরা খাতা লোড হচ্ছে...</p>
          </div>
        ) : filteredStudents.length > 0 ? (
          filteredStudents.map((st) => {
            const isPresent = st.status === 'present';
            const isAbsent = st.status === 'absent';
            const isLeave = st.status === 'leave';

            return (
              <div
                key={st.id}
                className={`bg-white border rounded-2xl p-2.5 flex items-center justify-between shadow-2xs transition-all ${
                  isPresent
                    ? 'border-[#DFECE5]'
                    : isAbsent
                    ? 'border-rose-200 bg-rose-50/25'
                    : 'border-amber-200 bg-amber-50/25'
                }`}
              >
                {/* শিক্ষার্থীর তথ্য ও ছবি */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative h-11 w-11 shrink-0 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                    {st.photoUrl ? (
                      <img
                        src={st.photoUrl}
                        alt={st.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={20} className="text-slate-400" />
                    )}

                    <span
                      className={`absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                        isPresent
                          ? 'bg-emerald-500'
                          : isAbsent
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                      }`}
                    />
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 truncate leading-tight">
                      {st.fullName}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                      রোল: {st.rollNo}
                    </p>
                  </div>
                </div>

                {/* ৩-অপশন হাজিরা কন্ট্রোল ও ডাইনামিক স্মার্ট কল বাটন */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* অনুপস্থিত সিলেক্ট করা থাকলে ডাইনামিক স্মার্ট কল বাটন দেখা যাবে */}
                  {isAbsent && (
                    <button
                      type="button"
                      onClick={() => handleCallGuardian(st)}
                      className="h-7 w-7 rounded-xl bg-rose-500 text-white shadow-2xs flex items-center justify-center hover:bg-rose-600 active:scale-90 transition border border-rose-400 shrink-0 animate-in zoom-in-50"
                      title="অভিভাবককে কল দিন"
                    >
                      <PhoneCall size={12} />
                    </button>
                  )}

                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      disabled={isSubmitted}
                      onClick={() => setStudentStatus(st.id, 'present')}
                      className={`h-7 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                        isPresent
                          ? 'bg-[#008955] text-white shadow-2xs'
                          : 'text-slate-400 hover:text-slate-600'
                      } ${isSubmitted ? 'cursor-not-allowed opacity-80' : 'active:scale-95'}`}
                    >
                      <Check size={11} strokeWidth={3} />
                      <span>হাজির</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitted}
                      onClick={() => setStudentStatus(st.id, 'absent')}
                      className={`h-7 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                        isAbsent
                          ? 'bg-rose-500 text-white shadow-2xs'
                          : 'text-slate-400 hover:text-slate-600'
                      } ${isSubmitted ? 'cursor-not-allowed opacity-80' : 'active:scale-95'}`}
                    >
                      <X size={11} strokeWidth={3} />
                      <span>বাদ</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitted}
                      onClick={() => setStudentStatus(st.id, 'leave')}
                      className={`h-7 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                        isLeave
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : 'text-slate-400 hover:text-slate-600'
                      } ${isSubmitted ? 'cursor-not-allowed opacity-80' : 'active:scale-95'}`}
                    >
                      <Clock size={11} />
                      <span>ছুটি</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-3xl border border-dashed border-[#DFECE5] bg-white p-8 text-center shadow-2xs space-y-2">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users size={24} />
            </div>
            <p className="text-xs font-bold text-slate-800">আপনাকে এখনও কোনো শিক্ষার্থী অ্যাসাইন করা হয়নি।</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              অ্যাডমিন প্যানেল থেকে আপনার অধীনে শিক্ষার্থী অ্যাসাইন করা হলে তাদের হাজিরা খাতা এখানে দেখতে পাবেন।
            </p>
          </div>
        )}
      </div>

      {/* ================= ৪. সাবমিট বাটন ও লক গার্ড ================= */}
      {filteredStudents.length > 0 && (
        <div className="pt-2 pb-1">
          {isSubmitted ? (
            <div className="w-full py-3 rounded-2xl bg-[#E7F6ED] border border-[#BBE3D3] text-[#008955] text-xs font-bold flex items-center justify-center gap-2 shadow-2xs">
              <ShieldCheck size={18} />
              <span>আজকের হাজিরা সফলভাবে সম্পন্ন ও লক করা হয়েছে</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSaveAttendance}
              disabled={isSaving}
              className="w-full py-3.5 rounded-2xl bg-[#008955] hover:bg-[#007548] text-white text-xs font-bold shadow-md active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCheck size={16} />
              <span>{isSaving ? 'সংরক্ষণ করা হচ্ছে...' : 'হাজিরা সম্পন্ন ও সাবমিট করুন'}</span>
            </button>
          )}
        </div>
      )}

      {/* ================= ৫. একাধিক অভিভাবক নম্বর কলিং বটম শিট / মডাল ================= */}
      {activeCallStudent && (
        <div
          onClick={() => setActiveCallStudent(null)}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[360px] rounded-t-[32px] sm:rounded-3xl bg-white p-5 shadow-2xl border border-rose-100 font-hind space-y-3.5 animate-in slide-in-from-bottom duration-200"
          >
            {/* মোবাইল ড্র্যাগ ড্রয়ার বার */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden" />

            {/* হেডার */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold border border-rose-100 shrink-0">
                  <PhoneCall size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    অভিভাবকের সাথে যোগাযোগ করুন
                  </h3>
                  <p className="text-[11px] text-rose-600 font-bold mt-0.5">
                    {activeCallStudent.fullName} (অনুপস্থিত)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveCallStudent(null)}
                className="h-8 w-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition active:scale-95"
              >
                <X size={16} />
              </button>
            </div>

            {/* কন্টাক্ট লিস্ট */}
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-bold text-slate-500 px-0.5">
                যেকোনো নম্বরে চাপ দিলে সরাসরি ডায়াল প্যাড চালু হবে:
              </p>
              {(activeCallStudent.guardianContacts || []).map((contact, idx) => {
                const rawNum = String(contact.phone || '').trim();
                const cleanNum = rawNum.replace(/[^0-9+]/g, '');
                const titleLabel = contact.title || 'অভিভাবক';

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveCallStudent(null);
                      const a = document.createElement('a');
                      a.href = `tel:${cleanNum}`;
                      a.click();
                    }}
                    className="w-full flex items-center justify-between bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 p-3 rounded-2xl transition active:scale-[0.98] group text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-xl bg-emerald-100 text-[#008955] flex items-center justify-center shrink-0">
                        <PhoneCall size={15} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-[#008955] bg-[#E7F6ED] border border-[#BBE3D3] px-2 py-0.2 rounded-md inline-block mb-0.5">
                          {titleLabel}
                        </span>
                        <p className="font-extrabold text-xs text-slate-900 font-sans tracking-wide">
                          📞 {titleLabel}: {rawNum}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-[#008955] bg-white group-hover:bg-[#008955] group-hover:text-white px-3 py-1.5 rounded-xl border border-[#BBE3D3] transition shrink-0 shadow-2xs">
                      কল দিন
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setActiveCallStudent(null)}
              className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 transition active:scale-95"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}

    </div>
  );
}