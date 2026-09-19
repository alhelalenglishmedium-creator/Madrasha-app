'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  CalendarCheck,
  Clock,
  Sparkles,
  Wallet,
  ArrowRight,
  Phone,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  User,
  Bell,
  Check,
  Receipt,
  X,
  BellRing,
  Megaphone,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { localDb } from '@/db/localDb';
import { supabase } from '@/lib/supabaseClient';
import type { Student, Staff } from '@/types/database.types';

import { TeacherBottomNav, type TeacherTab } from './TeacherBottomNav';
import { TeacherAttendanceSheet } from './TeacherAttendanceSheet';
import { TeacherHadiyaTab, type SalaryRecord } from './TeacherHadiyaTab';
import { TeacherProfile } from './TeacherProfile';
import { DashboardHeader } from '@/components/common/DashboardHeader';
import type { Notice } from '@/components/admin/NoticeModal';
import { PrayerScheduleModal } from '../student/PrayerScheduleModal';
import {
  calculateOfflinePrayerTimes,
  formatTimeBengali,
  formatCountdownBengali,
  DEFAULT_COORDINATES,
} from '@/lib/prayerCalculator';

export function TeacherDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TeacherTab>('home');
  const [students, setStudents] = useState<Student[]>([]);
  const [currentTeacher, setCurrentTeacher] = useState<Staff | null>(() => {
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

  const [isTodayAttendanceDone, setIsTodayAttendanceDone] = useState<boolean>(false);
  const [isHadiyaPaidThisMonth, setIsHadiyaPaidThisMonth] = useState<boolean>(false);
  const [todayPresentCount, setTodayPresentCount] = useState<number>(0);

  // নোটিফিকেশন বার ও ড্রপডাউন স্টেট
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState<boolean>(false);
  const [unreadSalaryNotice, setUnreadSalaryNotice] = useState<SalaryRecord | null>(null);
  const [teacherNotices, setTeacherNotices] = useState<Notice[]>([]);

  // সালাত ট্র্যাকার ও মোডাল স্টেট
  const [isPrayerModalOpen, setIsPrayerModalOpen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentMonthISO = useMemo(() => new Date().toISOString().slice(0, 7), []);

  // প্রতি সেকেন্ডে লাইভ কাউন্টডাউন টিক
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // অফলাইন লাইভ ওয়াক্ত হিসাব
  const prayerData = useMemo(() => {
    return calculateOfflinePrayerTimes(
      DEFAULT_COORDINATES.latitude,
      DEFAULT_COORDINATES.longitude,
      currentTime
    );
  }, [currentTime]);

  useEffect(() => {
    const loadTeacherData = async () => {
      try {
        // ১. লগইন করা শিক্ষকের তথ্য লোড (সুপাবেস staff + teachers টেবিল + লোকালডিবি)
        const activeUid = user?.identifier || (typeof window !== 'undefined' ? localStorage.getItem('madrasa_active_uid') : null);
        let matchedTeacher: Staff | null = null;

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

        // (ক) Supabase - staff টেবিলে সন্ধান
        try {
          const { data: supaStaff } = await supabase
            .from('staff')
            .select('*');

          if (supaStaff && supaStaff.length > 0) {
            const found = supaStaff.find(isRecordMatch);
            if (found) {
              matchedTeacher = {
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
        } catch (e) {
          console.warn('Dashboard cloud staff fetch warning:', e);
        }

        // (খ) Supabase - teachers টেবিলে সন্ধান (যদি staff টেবিলে না পাওয়া যায়)
        if (!matchedTeacher) {
          try {
            const { data: supaTeachers } = await supabase
              .from('teachers')
              .select('*');

            if (supaTeachers && supaTeachers.length > 0) {
              const foundTc = supaTeachers.find(isRecordMatch);
              if (foundTc) {
                matchedTeacher = {
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
            console.warn('Dashboard cloud teachers fetch warning:', e);
          }
        }

        // (গ) LocalDb - staff টেবিলে সন্ধান
        if (!matchedTeacher) {
          const staffList = await localDb.staff.toArray();
          if (staffList.length > 0) {
            matchedTeacher = staffList.find(isRecordMatch) || null;
            if (!matchedTeacher && staffList.length > 0) {
              matchedTeacher = staffList.find((s) => s.role === 'teacher') || staffList[0];
            }
          }
        }

        // (ঘ) স্টেট এবং ক্যাশে সংরক্ষণ (যাতে পেজ রিফ্রেশে তথ্য অক্ষত থাকে)
        if (matchedTeacher) {
          setCurrentTeacher(matchedTeacher);
          if (typeof window !== 'undefined') {
            localStorage.setItem('madrasa_teacher_profile', JSON.stringify(matchedTeacher));
            localStorage.setItem('madrasa_active_uid', matchedTeacher.teacher_uid || matchedTeacher.id);
          }
          try {
            await localDb.staff.put(matchedTeacher);
          } catch (e) {}
        }

        // ২. সুপাবেস ক্লাউড থেকে সরাসরি অ্যাসাইন করা শিক্ষার্থী লোড (প্রাইমারি সোর্স)
        let finalAssignedStudents: Student[] = [];
        try {
          const { data: cloudStudents, error: stdErr } = await supabase
            .from('students')
            .select('*');

          if (!stdErr && cloudStudents && cloudStudents.length > 0) {
            const mappedStudents: Student[] = cloudStudents.map((std: any) => ({
              id: std.id,
              admissionNo: std.admission_no || std.id,
              fullName: std.full_name || std.name || 'শিক্ষার্থী',
              fullNameBangla: std.name || std.full_name_bangla || std.full_name || 'শিক্ষার্থী',
              className: std.class_name || std.className || 'প্লে',
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

            // LocalDb সিঙ্ক
            await localDb.students.clear();
            if (mappedStudents.length > 0) {
              await localDb.students.bulkAdd(mappedStudents);
            }

            if (matchedTeacher) {
              const tUid = String(matchedTeacher.teacher_uid || matchedTeacher.id).trim().toLowerCase();
              const tId = String(matchedTeacher.id).trim().toLowerCase();
              const tPhone = String(matchedTeacher.phone || '').trim();

              finalAssignedStudents = mappedStudents.filter((s: any) => {
                const stdTeacherUid = String(s.assigned_teacher_uid || '').trim().toLowerCase();
                return (
                  stdTeacherUid &&
                  (stdTeacherUid === tUid ||
                    stdTeacherUid === tId ||
                    (tPhone && stdTeacherUid === tPhone))
                );
              });
            } else {
              finalAssignedStudents = [];
            }
          }
        } catch (stdFetchErr) {
          console.error('Cloud students fetch error in Dashboard:', stdFetchErr);
        }

        // ক্লাউড অফলাইন থাকলে LocalDb ব্যাকআপ
        if (finalAssignedStudents.length === 0) {
          const localData = await localDb.students.where('status').equals('active').toArray();
          if (matchedTeacher) {
            const tUid = String(matchedTeacher.teacher_uid || matchedTeacher.id).trim().toLowerCase();
            const tId = String(matchedTeacher.id).trim().toLowerCase();
            const tPhone = String(matchedTeacher.phone || '').trim();

            finalAssignedStudents = localData.filter((s: any) => {
              const stdTeacherUid = String(s.assigned_teacher_uid || '').trim().toLowerCase();
              return (
                stdTeacherUid &&
                (stdTeacherUid === tUid ||
                  stdTeacherUid === tId ||
                  (tPhone && stdTeacherUid === tPhone))
              );
            });
          } else {
            finalAssignedStudents = [];
          }
        }

        finalAssignedStudents.sort((a, b) => Number(a.rollNo || 0) - Number(b.rollNo || 0));
        setStudents(finalAssignedStudents);

        // ৩. আজকের হাজিরা চেক
        const lockKey = `attendance_locked_${todayStr}_${matchedTeacher?.id || 'default'}`;
        const isLocked = localStorage.getItem(lockKey) === 'true';

        try {
          const { data: attendanceData } = await supabase
            .from('attendance')
            .select('*')
            .eq('date', todayStr);

          if (attendanceData && attendanceData.length > 0) {
            setIsTodayAttendanceDone(true);
            const present = attendanceData.filter((a) => a.status === 'present').length;
            setTodayPresentCount(present);
          } else {
            setIsTodayAttendanceDone(isLocked);
          }
        } catch (e) {
          setIsTodayAttendanceDone(isLocked);
        }

        // ৪. হাদিয়া স্টেটমেন্ট চেক
        if (matchedTeacher?.id) {
          const { data: salaryData } = await supabase
            .from('teacher_salaries')
            .select('*')
            .eq('teacher_id', matchedTeacher.id)
            .order('payment_date', { ascending: false });

          if (salaryData && salaryData.length > 0) {
            const latestSalary = salaryData[0];
            if (salaryData.some((s) => s.month?.includes(currentMonthISO))) {
              setIsHadiyaPaidThisMonth(true);
            }

            const acknowledgedKey = `hadiya_acknowledged_${latestSalary.id}_${matchedTeacher.id}`;
            const isAcknowledged = localStorage.getItem(acknowledgedKey) === 'true';

            if (!isAcknowledged) {
              setUnreadSalaryNotice({
                id: latestSalary.id,
                teacherId: latestSalary.teacher_id,
                amount: Number(latestSalary.amount),
                month: latestSalary.month,
                paymentDate: latestSalary.payment_date,
                paymentTime: latestSalary.payment_time || 'সকাল ১০:৩০ মিনিট',
                paymentMethod: latestSalary.payment_method || 'নগদ ক্যাশ',
                note: latestSalary.note || '',
              });
            }
          }
        }

        // ৫. নোটিশ লোড ও স্মার্ট ফিল্টারিং (সুপাবেস + লোকালস্টোরেজ)
        try {
          let cloudNotices: any[] = [];
          const { data: supaNotices, error: noticeErr } = await supabase
            .from('notices')
            .select('*')
            .order('created_at', { ascending: false });

          if (!noticeErr && supaNotices && supaNotices.length > 0) {
            cloudNotices = supaNotices;
          } else {
            const cached = localStorage.getItem('madrasa_admin_notices') || localStorage.getItem('madrasa_notices');
            if (cached) cloudNotices = JSON.parse(cached);
          }

          const teacherIds = Array.from(
            new Set([
              String(matchedTeacher?.teacher_uid || '').trim().toLowerCase(),
              String(matchedTeacher?.id || '').trim().toLowerCase(),
              String(user?.identifier || '').trim().toLowerCase(),
            ].filter(Boolean))
          );

          const relevant = cloudNotices.filter((n: any) => {
            const tType = n.target_type || n.targetAudience;
            const tId = String(n.target_id || n.targetAudience || '').trim().toLowerCase();

            if (!tType || tType === 'all') return true;
            if (tType === 'all_teachers' || tType === 'teachers_all') return true;
            if (tType === 'specific_teacher') {
              return teacherIds.includes(tId);
            }
            if (matchedTeacher?.designation && (tId === `teach_${matchedTeacher.designation.toLowerCase()}` || tType === `teach_${matchedTeacher.designation.toLowerCase()}`)) return true;
            if (matchedTeacher?.assignedClass && (tId === `teach_${matchedTeacher.assignedClass.toLowerCase()}` || tType === `teach_${matchedTeacher.assignedClass.toLowerCase()}`)) return true;

            return false;
          });

          const formattedNotices: Notice[] = relevant.map((n: any) => ({
            id: String(n.id),
            title: n.title,
            description: n.description || n.content || '',
            content: n.description || n.content || '',
            category: n.category || 'সাধারণ',
            target_type: n.target_type || 'all',
            target_id: n.target_id || '',
            date: n.created_at ? n.created_at.split('T')[0] : (n.date || new Date().toISOString().split('T')[0]),
            author: n.created_by || n.author || 'প্রশাসন',
          }));

          setTeacherNotices(formattedNotices);
        } catch (err) {
          console.warn('Teacher notice fetch error:', err);
        }
      } catch (err) {
        console.error('ড্যাশবোর্ড ডাটা লোড ত্রুটি:', err);
      }
    };

    loadTeacherData();
  }, [user, todayStr, currentMonthISO]);

  const handleAcknowledgeSalary = () => {
    if (unreadSalaryNotice && currentTeacher) {
      const acknowledgedKey = `hadiya_acknowledged_${unreadSalaryNotice.id}_${currentTeacher.id}`;
      localStorage.setItem(acknowledgedKey, 'true');
      setUnreadSalaryNotice(null);
    }
  };

  const teacherHadia = currentTeacher?.monthlySalary || 15000;
  const latestNotice = teacherNotices.length > 0 ? teacherNotices[0] : null;
  const totalNotifications = (unreadSalaryNotice ? 1 : 0) + teacherNotices.length;

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-[#EDF3EF] text-[#1F2937] antialiased p-0 sm:py-4 font-hind overflow-hidden">
      
      {/* ঘূর্ণায়মান বর্ডার আভা */}
      <style jsx global>{`
        @keyframes emeraldGoldSpin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
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

      {/* মোবাইল ফ্রেম কনটেইনার */}
      <div className="relative w-full max-w-[430px] bg-[#F7FBF9] h-full sm:h-[870px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-[#DFECE5]">

        {/* ================= হেডার (Student & Teacher Sync) ================= */}
        <DashboardHeader
          onNotificationClick={() => setIsNotificationDrawerOpen(true)}
          hasNotification={totalNotifications > 0}
        />

        {/* স্ক্রলেবল মূল কনটেন্ট */}
        <main className="flex-1 overflow-y-auto overscroll-contain no-scrollbar p-4 space-y-3.5">

          {/* ================= ১. হোম ট্যাব ================= */}
          {activeTab === 'home' && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              
              {/* ওস্তাদজি প্রিমিয়াম ব্যানার */}
              <div className="relative p-[2px] rounded-3xl rounded-tr-[38px] rounded-bl-[38px] overflow-hidden shadow-xs">
                <div className="emerald-royal-glow" />
                <div className="relative z-10 rounded-[1.4rem] rounded-tr-[36px] rounded-bl-[36px] bg-gradient-to-tr from-[#008955] via-[#007548] to-[#046A42] p-4.5 text-white shadow-inner">
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-13 h-13 rounded-2xl rounded-tr-3xl rounded-bl-3xl bg-white border-2 border-emerald-300/40 shadow-sm overflow-hidden flex items-center justify-center">
                          {currentTeacher?.photoUrl ? (
                            <img
                              src={currentTeacher.photoUrl}
                              alt={currentTeacher.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User size={28} className="text-[#008955]" />
                          )}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" />
                      </div>

                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block">
                          শিক্ষক প্যানেল
                        </span>
                        <h1 className="text-base font-black text-white leading-snug truncate">
                          {currentTeacher?.fullName || user?.name || 'মুহতারাম শিক্ষক'}
                        </h1>
                        <p className="text-[10px] text-emerald-100 font-medium truncate">
                          {currentTeacher?.designation || 'শিক্ষক'} • {currentTeacher?.assignedClass || 'হিফজ'} বিভাগ
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* হাদিস বাণী */}
                  <div className="mt-3 rounded-2xl bg-black/15 p-2.5 backdrop-blur-xs border border-white/10 text-white flex items-start gap-2">
                    <Sparkles size={14} className="text-amber-300 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-emerald-50 leading-relaxed font-medium">
                      “তোমাদের মধ্যে সর্বোত্তম ব্যক্তি সে, যে নিজে কুরআন শিখে এবং অন্যকে শেখায়।”
                    </p>
                  </div>
                </div>
              </div>

              {/* সর্বশেষ নোটিশ হাইলাইট স্ট্রিপ */}
              {latestNotice && (
                <div 
                  onClick={() => setIsNotificationDrawerOpen(true)}
                  className="bg-amber-50 border border-amber-200/80 rounded-2xl px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-amber-100/70 transition active:scale-[0.99] shadow-2xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-6 w-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                      <Megaphone size={12} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-amber-950 truncate">
                        {latestNotice.title}
                      </p>
                      <p className="text-[9px] text-amber-700 truncate font-sans">
                        {latestNotice.date} • {latestNotice.targetAudienceLabel || 'সকলের জন্য'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full shrink-0">
                    দেখুন
                  </span>
                </div>
              )}

              {/* ========================================================
                  লাইভ সালাত কার্ড (স্ক্রিনশটের হুবহু ডিজাইন + লাইভ টাইমার)
                  ======================================================== */}
              <button
                type="button"
                onClick={() => setIsPrayerModalOpen(true)}
                className="w-full bg-white border border-[#A4E6C3]/80 rounded-[28px] p-3 flex items-center justify-between shadow-2xs hover:border-[#008955] active:scale-[0.99] transition text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-2xl bg-[#008955] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Clock size={22} className="stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                        চলমান ওয়াক্ত: {prayerData.currentPrayer}
                      </h3>
                      <span className="h-2.5 w-2.5 rounded-full bg-[#E7F6ED] inline-block" />
                    </div>
                    <p className="text-[10.5px] text-slate-500 font-medium truncate mt-0.5">
                      পরবর্তী: {prayerData.nextPrayer} ({formatTimeBengali(prayerData.nextPrayerTime)})
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="bg-[#99F6E4] text-[#0F3A2F] text-xs sm:text-sm font-black font-sans px-3.5 py-1.5 rounded-full shadow-2xs">
                    {formatCountdownBengali(prayerData.remainingSeconds)}
                  </div>
                  <span className="text-[9.5px] font-bold text-slate-400 block mt-0.5 pr-1">
                    বাকি সময়
                  </span>
                </div>
              </button>

              {/* ৩টি গুরুত্বপূর্ণ পরিসংখ্যান কার্ড */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white p-2.5 rounded-2xl border border-[#DFECE5] shadow-2xs flex flex-col justify-between h-20 text-center">
                  <span className="text-[10px] font-bold text-slate-500">শ্রেণির ছাত্র</span>
                  <p className="text-xl font-black text-slate-800 font-sans tracking-tight">
                    {students.length} <span className="text-[10px] font-bold text-slate-400 font-hind">জন</span>
                  </p>
                  <span className="text-[9px] font-bold text-[#008955] bg-[#E7F6ED] rounded-md py-0.2">
                    সক্রিয়
                  </span>
                </div>

                <div 
                  onClick={() => setActiveTab('attendance')}
                  className="bg-white p-2.5 rounded-2xl border border-[#DFECE5] shadow-2xs flex flex-col justify-between h-20 text-center cursor-pointer hover:border-[#008955] transition active:scale-95"
                >
                  <span className="text-[10px] font-bold text-slate-500">আজকের হাজিরা</span>
                  <div className="my-auto flex justify-center">
                    {isTodayAttendanceDone ? (
                      <CheckCircle2 size={18} className="text-[#008955]" />
                    ) : (
                      <AlertCircle size={18} className="text-amber-500" />
                    )}
                  </div>
                  <span
                    className={`text-[9px] font-bold rounded-md py-0.2 ${
                      isTodayAttendanceDone
                        ? 'bg-emerald-50 text-[#008955]'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {isTodayAttendanceDone ? 'সম্পন্ন ✓' : 'নেওয়া বাকি'}
                  </span>
                </div>

                <div 
                  onClick={() => setActiveTab('hadiya')}
                  className="bg-white p-2.5 rounded-2xl border border-[#DFECE5] shadow-2xs flex flex-col justify-between h-20 text-center cursor-pointer hover:border-[#008955] transition active:scale-95"
                >
                  <span className="text-[10px] font-bold text-slate-500">চলতি হাদিয়া</span>
                  <p className="text-xs font-black text-slate-800 font-sans mt-0.5 truncate">
                    ৳ {Number(teacherHadia).toLocaleString('en-US')}
                  </p>
                  <span
                    className={`text-[9px] font-bold rounded-md py-0.2 ${
                      isHadiyaPaidThisMonth
                        ? 'bg-emerald-50 text-[#008955]'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isHadiyaPaidThisMonth ? 'পরিশোধিত ✓' : 'প্রক্রিয়াধীন'}
                  </span>
                </div>
              </div>

              {/* প্রধান অ্যাকশন বাটন: হাজিরা খাতা */}
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('attendance')}
                  className={`w-full py-3.5 px-4 rounded-2xl text-xs font-bold shadow-xs active:scale-[0.99] transition flex items-center justify-between ${
                    isTodayAttendanceDone
                      ? 'bg-[#E7F6ED] border border-[#BBE3D3] text-[#008955]'
                      : 'bg-[#008955] hover:bg-[#007548] text-white shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                        isTodayAttendanceDone
                          ? 'bg-white text-[#008955]'
                          : 'bg-white/20 text-white'
                      }`}
                    >
                      <CalendarCheck size={18} />
                    </div>
                    <div className="text-left">
                      <p className="leading-tight">
                        {isTodayAttendanceDone
                          ? 'আজকের হাজিরা সম্পন্ন হয়েছে'
                          : 'আজকের ক্লাসের হাজিরা গ্রহণ করুন'}
                      </p>
                      <span
                        className={`text-[10px] block mt-0.5 ${
                          isTodayAttendanceDone ? 'text-emerald-700' : 'text-emerald-100'
                        }`}
                      >
                        {isTodayAttendanceDone
                          ? `উপস্থিত: ${todayPresentCount} জন • দেখতে ক্লিক করুন`
                          : '১-ক্লিকে পুরো ক্লাসের হাজিরা মার্ক করুন'}
                      </span>
                    </div>
                  </div>

                  <ArrowRight size={16} />
                </button>
              </div>

              {/* শিক্ষার্থী ও অভিভাবক যোগাযোগ তালিকা */}
              <div className="space-y-2 pt-1 pb-10">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-bold text-slate-800">
                    শিক্ষার্থী ও অভিভাবক যোগাযোগ ({students.length} জন)
                  </h2>
                  <span className="text-[10px] text-[#008955] font-semibold bg-[#E7F6ED] px-2 py-0.5 rounded-md">
                    {currentTeacher?.assignedClass || 'হিফজ'} বিভাগ
                  </span>
                </div>

                <div className="space-y-2">
                  {students.length > 0 ? (
                    students.map((std) => (
                      <div
                        key={std.id}
                        className="bg-white rounded-2xl border border-[#DFECE5] p-2.5 flex items-center justify-between shadow-2xs hover:border-[#008955] transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#E7F6ED] to-[#FEF3C7] text-[#008955] font-black text-xs border border-white shadow-2xs flex items-center justify-center font-sans overflow-hidden">
                              {std.photoUrl ? (
                                <img
                                  src={std.photoUrl}
                                  alt={std.fullNameBangla || std.fullName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span>{std.rollNo || '০'}</span>
                              )}
                            </div>
                            <span className="absolute -bottom-1 -right-1 bg-[#008955] text-white text-[8px] font-black px-1 rounded-sm font-sans">
                              {std.rollNo || '০'}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                              {std.fullNameBangla || std.fullName}
                            </h4>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              পিতা: {std.fatherName || 'তথ্য নেই'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {std.phone ? (
                            <a
                              href={`tel:${std.phone}`}
                              className="h-8 px-2.5 rounded-xl bg-[#E7F6ED] text-[#008955] hover:bg-[#008955] hover:text-white border border-[#BBE3D3] flex items-center gap-1 text-[11px] font-bold transition active:scale-95 shadow-2xs"
                              title="অভিভাবককে সরাসরি ফোন দিন"
                            >
                              <Phone size={11} />
                              <span>কল দিন</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-300 font-medium px-2 py-1">
                              নম্বর নেই
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#DFECE5] bg-white p-6 text-center shadow-2xs">
                      <p className="text-xs font-bold text-slate-700">কোনো শিক্ষার্থী পাওয়া যায়নি</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ================= ২. হাজিরা খাতা ফুল ট্যাব ================= */}
          {activeTab === 'attendance' && (
            <TeacherAttendanceSheet teacher={currentTeacher} />
          )}

          {/* ================= ৩. হাদিয়া লেজার ও রসিদ ট্যাব ================= */}
          {activeTab === 'hadiya' && (
            <TeacherHadiyaTab teacher={currentTeacher} />
          )}

          {/* ================= ৪. শিক্ষক প্রোফাইল ট্যাব ================= */}
          {activeTab === 'profile' && <TeacherProfile teacher={currentTeacher} />}

        </main>

        {/* বটম নেভিগেশন বার */}
        <TeacherBottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      </div>

      {/* ========================================================= */}
      {/* নামাজের সময়সূচি ও আজান অ্যালার্ম মোডাল */}
      {/* ========================================================= */}
      <PrayerScheduleModal
        isOpen={isPrayerModalOpen}
        onClose={() => setIsPrayerModalOpen(false)}
      />

      {/* ========================================================= */}
      {/* নোটিফিকেশন বার ও ড্রয়ার প্যানেল (DROPDOWN MODAL) */}
      {/* ========================================================= */}
      {isNotificationDrawerOpen && (
        <div
          onClick={() => setIsNotificationDrawerOpen(false)}
          className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 font-hind animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px] max-h-[85vh] bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#DFECE5] animate-in slide-in-from-bottom-5"
          >
            {/* ড্রপডাউন হেডার */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-[#F7FBF9]">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-[#E7F6ED] text-[#008955] flex items-center justify-center">
                  <BellRing size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">নোটিফিকেশন ও নোটিশ বার</h3>
                  <p className="text-[10px] text-slate-400">আপনার জন্য প্রেরিত সকল বার্তা</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNotificationDrawerOpen(false)}
                className="h-8 w-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* কনটেন্ট লিস্ট */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              
              {/* ১. হাদিয়া নোটিফিকেশন কার্ড */}
              {unreadSalaryNotice && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-emerald-50 to-[#E7F6ED] border border-[#BBE3D3] space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white bg-[#008955] px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Wallet size={10} />
                      <span>হাদিয়া পরিষদ সম্পন্ন</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans">
                      {unreadSalaryNotice.paymentDate}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      মুহতারাম, আপনার {unreadSalaryNotice.month} মাসের হাদিয়া পরিশোধ করা হয়েছে!
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      পরিমাণ: <strong className="text-[#008955] font-sans">৳ {unreadSalaryNotice.amount.toLocaleString('en-US')}</strong> ({unreadSalaryNotice.paymentMethod})
                    </p>
                  </div>

                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAcknowledgeSalary}
                      className="flex-1 py-2 rounded-xl bg-[#008955] hover:bg-[#007548] text-white text-xs font-bold shadow-xs active:scale-95 transition flex items-center justify-center gap-1"
                    >
                      <Check size={14} strokeWidth={3} />
                      <span>আলহামদুলিল্লাহ, পেয়েছি</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleAcknowledgeSalary();
                        setIsNotificationDrawerOpen(false);
                        setActiveTab('hadiya');
                      }}
                      className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition active:scale-95 flex items-center gap-1"
                    >
                      <Receipt size={13} />
                      <span>রসিদ</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ২. প্রাসঙ্গিক নোটিশসমূহ */}
              {teacherNotices.length > 0 ? (
                teacherNotices.map((notice) => (
                  <div
                    key={notice.id}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200/80 space-y-1.5 shadow-2xs hover:border-[#008955] transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                        notice.category === 'জরুরি'
                          ? 'bg-rose-50 text-rose-600 border border-rose-100'
                          : notice.category === 'ছুটি'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-emerald-50 text-[#008955] border border-emerald-100'
                      }`}>
                        {notice.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-sans">{notice.date}</span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 leading-snug">
                      {notice.title}
                    </h4>

                    <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-2 rounded-xl border border-slate-100">
                      {notice.content}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[9px] text-slate-400">
                      <span>প্রেরক: {notice.author || 'প্রশাসন'}</span>
                      <span className="font-semibold text-emerald-800">
                        {notice.targetAudienceLabel || 'সকলের জন্য'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                !unreadSalaryNotice && (
                  <div className="py-12 text-center text-slate-400">
                    <Bell size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-700">নতুন কোনো নোটিশ নেই</p>
                    <p className="text-[10px] mt-0.5">মাদ্রাসা থেকে কোনো নোটিশ দিলে এখানে দেখতে পাবেন।</p>
                  </div>
                )
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}