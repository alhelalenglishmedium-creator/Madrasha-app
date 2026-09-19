'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  CalendarCheck,
  ArrowLeft,
  Calendar,
  User,
  BookOpen,
  Search,
  Users,
  ChevronDown,
  ChevronUp,
  X,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import { localDb } from '@/db/localDb';
import { supabase } from '@/lib/supabaseClient';
import type { Student, AttendanceRecord } from '@/types/database.types';
import { AdminBottomNav } from '@/components/admin/AdminBottomNav';

type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'yearly';
type StudentReportFrame = 'weekly' | 'monthly' | 'yearly';

interface MetricData {
  rate: number;
  present: number;
  absent: number;
  total: number;
}

export default function AttendancePage() {
  const [activeMetric, setActiveMetric] = useState<TimeFrame>('daily');
  const [classList, setClassList] = useState<string[]>(['সব', 'প্লে', 'নার্সারি', 'হিফজ']);
  const [selectedClass, setSelectedClass] = useState<string>('সব');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showStudentList, setShowStudentList] = useState<boolean>(true);

  // আলাদা ফুল-স্ক্রিন অ্যানালাইসিস পেজ স্টেট
  const [selectedAnalysisFrame, setSelectedAnalysisFrame] = useState<TimeFrame | null>(null);
  const [analysisModalClass, setAnalysisModalClass] = useState<string>('সব');
  const [analysisSearchQuery, setAnalysisSearchQuery] = useState<string>('');

  // শিক্ষার্থীর ব্যক্তিগত কার্ড রিপোর্ট মোডাল
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);
  const [studentReportTab, setStudentReportTab] = useState<StudentReportFrame>('monthly');

  const [metrics, setMetrics] = useState<{
    daily: MetricData;
    weekly: MetricData;
    monthly: MetricData;
    yearly: MetricData;
  }>({
    daily: { rate: 0, present: 0, absent: 0, total: 0 },
    weekly: { rate: 0, present: 0, absent: 0, total: 0 },
    monthly: { rate: 0, present: 0, absent: 0, total: 0 },
    yearly: { rate: 0, present: 0, absent: 0, total: 0 },
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // ক্লাস ক্যাটাগরি লোড
  useEffect(() => {
    const loadCategories = async () => {
      try {
        let classes = ['প্লে', 'নার্সারি', 'হিফজ'];
        const savedClasses = localStorage.getItem('madrasa_custom_classes');
        if (savedClasses) {
          const parsed = JSON.parse(savedClasses);
          if (Array.isArray(parsed) && parsed.length > 0) classes = parsed;
        }

        const allStudents = await localDb.students.where('status').equals('active').toArray();
        allStudents.forEach((s) => {
          if (s.className && !classes.includes(s.className)) {
            classes.push(s.className);
          }
        });

        setClassList(['সব', ...classes]);
      } catch (err) {
        console.error('ক্যাটাগরি লোড ত্রুটি:', err);
      }
    };

    loadCategories();
  }, []);

  // পরিসংখ্যান গণনা ফাংশন
  const calculateRangeStats = (
    records: AttendanceRecord[],
    startStr: string,
    endStr: string,
    targetClass: string,
    activeStudentList: Student[]
  ) => {
    const activeStudentIds = new Set(activeStudentList.map((s) => s.id));
    const totalStudentsCount = activeStudentList.length;

    let filtered = records.filter(
      (r) => r.date >= startStr && r.date <= endStr && activeStudentIds.has(r.studentId)
    );

    if (targetClass !== 'সব') {
      filtered = filtered.filter((r) => r.className === targetClass);
    }

    const actualWorkingDays = Array.from(new Set(filtered.map((r) => r.date))).length;
    const totalRecords = filtered.length;
    const presentRecords = filtered.filter((r) => r.status === 'present').length;

    const rate = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;

    const avgPresent = actualWorkingDays > 0
      ? Math.min(totalStudentsCount, Math.round(presentRecords / actualWorkingDays))
      : 0;

    const avgAbsent = rate === 100 ? 0 : Math.max(0, totalStudentsCount - avgPresent);

    return {
      rate,
      present: avgPresent,
      absent: avgAbsent,
      total: totalStudentsCount,
    };
  };

  // ডাটা লোড
  const loadAllData = useCallback(async () => {
    try {
      setIsLoading(true);

      let loadedStudents = await localDb.students.where('status').equals('active').toArray();
      if (selectedClass !== 'সব') {
        loadedStudents = loadedStudents.filter((s) => s.className === selectedClass);
      }
      loadedStudents.sort((a, b) => Number(a.rollNo || 0) - Number(b.rollNo || 0));
      setStudents(loadedStudents);

      const { data: cloudAttendance } = await supabase.from('attendance').select('*');
      if (cloudAttendance && cloudAttendance.length > 0) {
        await localDb.attendance.clear();
        const mappedRecords: AttendanceRecord[] = cloudAttendance.map((c: any) => ({
          id: c.id || `att_${c.student_id}_${c.date}`,
          studentId: c.student_id,
          date: c.date,
          status: c.status,
          className: c.class_name,
          remark: c.remark || '',
          synced: true,
          createdAt: c.created_at,
        }));
        await localDb.attendance.bulkAdd(mappedRecords);
      }

      const allRecords = await localDb.attendance.toArray();
      setAllAttendanceRecords(allRecords);

      const curr = new Date(selectedDate);
      const dailyStats = calculateRangeStats(allRecords, selectedDate, selectedDate, selectedClass, loadedStudents);

      const weekStart = new Date(curr);
      weekStart.setDate(curr.getDate() - 6);
      const weeklyStats = calculateRangeStats(
        allRecords,
        weekStart.toISOString().split('T')[0],
        selectedDate,
        selectedClass,
        loadedStudents
      );

      const monthStart = new Date(curr.getFullYear(), curr.getMonth(), 1).toISOString().split('T')[0];
      const monthlyStats = calculateRangeStats(allRecords, monthStart, selectedDate, selectedClass, loadedStudents);

      const yearStart = new Date(curr.getFullYear(), 0, 1).toISOString().split('T')[0];
      const yearlyStats = calculateRangeStats(allRecords, yearStart, selectedDate, selectedClass, loadedStudents);

      setMetrics({
        daily: dailyStats,
        weekly: weeklyStats,
        monthly: monthlyStats,
        yearly: yearlyStats,
      });
    } catch (err) {
      console.error('ডাটা লোড ত্রুটি:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedClass, selectedDate]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        (s.fullNameBangla && s.fullNameBangla.toLowerCase().includes(q)) ||
        (s.fullName && s.fullName.toLowerCase().includes(q)) ||
        (s.rollNo && s.rollNo.toString().includes(q)) ||
        (s.phone && s.phone.includes(q))
    );
  }, [students, searchQuery]);

  const dailyAttendanceMap = useMemo(() => {
    const map = new Map<string, string>();
    allAttendanceRecords
      .filter((r) => r.date === selectedDate)
      .forEach((r) => map.set(r.studentId, r.status));
    return map;
  }, [allAttendanceRecords, selectedDate]);

  const studentDetailedReport = useMemo(() => {
    if (!selectedStudentForReport) return null;

    const studentRecords = allAttendanceRecords.filter(
      (r) => r.studentId === selectedStudentForReport.id
    );

    const curr = new Date(selectedDate);
    let startDate = '';

    if (studentReportTab === 'weekly') {
      const w = new Date(curr);
      w.setDate(curr.getDate() - 6);
      startDate = w.toISOString().split('T')[0];
    } else if (studentReportTab === 'monthly') {
      startDate = new Date(curr.getFullYear(), curr.getMonth(), 1).toISOString().split('T')[0];
    } else {
      startDate = new Date(curr.getFullYear(), 0, 1).toISOString().split('T')[0];
    }

    const rangedRecords = studentRecords.filter(
      (r) => r.date >= startDate && r.date <= selectedDate
    );

    const actualTakenDays = rangedRecords.length;
    const presentDays = rangedRecords.filter((r) => r.status === 'present').length;
    const absentDays = rangedRecords.filter((r) => r.status === 'absent').length;
    const leaveDays = rangedRecords.filter((r) => r.status === 'leave').length;
    const rate = actualTakenDays > 0 ? Math.round((presentDays / actualTakenDays) * 100) : 0;

    return {
      actualTakenDays,
      presentDays,
      absentDays,
      leaveDays,
      rate,
      history: rangedRecords.sort((a, b) => b.date.localeCompare(a.date)),
    };
  }, [selectedStudentForReport, allAttendanceRecords, selectedDate, studentReportTab]);

  // ফুল-স্ক্রিন পেজের নির্ভুল অ্যানালাইসিস ডাটা
  const analysisBreakdownData = useMemo(() => {
    if (!selectedAnalysisFrame) return null;

    const curr = new Date(selectedDate);
    let startStr = selectedDate;

    if (selectedAnalysisFrame === 'weekly') {
      const w = new Date(curr);
      w.setDate(curr.getDate() - 6);
      startStr = w.toISOString().split('T')[0];
    } else if (selectedAnalysisFrame === 'monthly') {
      startStr = new Date(curr.getFullYear(), curr.getMonth(), 1).toISOString().split('T')[0];
    } else if (selectedAnalysisFrame === 'yearly') {
      startStr = new Date(curr.getFullYear(), 0, 1).toISOString().split('T')[0];
    }

    let targetStudents = students;
    if (analysisModalClass !== 'সব') {
      targetStudents = students.filter((s) => s.className === analysisModalClass);
    }

    if (analysisSearchQuery.trim()) {
      const q = analysisSearchQuery.toLowerCase().trim();
      targetStudents = targetStudents.filter(
        (s) =>
          (s.fullNameBangla && s.fullNameBangla.toLowerCase().includes(q)) ||
          (s.fullName && s.fullName.toLowerCase().includes(q)) ||
          (s.rollNo && s.rollNo.toString().includes(q))
      );
    }

    const studentIds = new Set(targetStudents.map((s) => s.id));
    const rangeRecords = allAttendanceRecords.filter(
      (r) => r.date >= startStr && r.date <= selectedDate && studentIds.has(r.studentId)
    );

    const uniqueDates = Array.from(new Set(rangeRecords.map((r) => r.date)));
    const totalDaysCount = uniqueDates.length;

    const studentStats = targetStudents.map((std) => {
      const records = rangeRecords.filter((r) => r.studentId === std.id);
      const studentClassDays = Array.from(new Set(records.map((r) => r.date))).length;
      const presentDays = records.filter((r) => r.status === 'present').length;
      const absentDays = records.filter((r) => r.status === 'absent').length;
      const leaveDays = records.filter((r) => r.status === 'leave').length;

      const effectiveDays = studentClassDays > 0 ? studentClassDays : totalDaysCount;
      const rate = effectiveDays > 0 ? Math.round((presentDays / effectiveDays) * 100) : 0;

      return {
        student: std,
        presentDays,
        absentDays,
        leaveDays,
        effectiveDays,
        rate,
        latestStatus: dailyAttendanceMap.get(std.id) || 'প্রক্রিয়াধীন',
      };
    });

    const totalStudents = targetStudents.length;
    const totalPresentSum = studentStats.reduce((acc, s) => acc + s.presentDays, 0);
    const totalPossibleAttendances = rangeRecords.length;

    const overallRate = totalPossibleAttendances > 0
      ? Math.round((totalPresentSum / totalPossibleAttendances) * 100)
      : 0;

    // নির্ভুল গড় ও অনুপস্থিতি গণনা
    const avgPresentPerDay = totalPossibleAttendances > 0 && totalDaysCount > 0
      ? Math.min(totalStudents, Math.round(totalPresentSum / totalDaysCount))
      : 0;

    const avgAbsentPerDay = overallRate === 100 ? 0 : Math.max(0, totalStudents - avgPresentPerDay);

    return {
      title:
        selectedAnalysisFrame === 'daily'
          ? 'দৈনিক উপস্থিতির খতিয়ান'
          : selectedAnalysisFrame === 'weekly'
          ? 'সাপ্তাহিক উপস্থিতির খতিয়ান'
          : selectedAnalysisFrame === 'monthly'
          ? 'মাসিক উপস্থিতির খতিয়ান'
          : 'বাৎসরিক উপস্থিতির খতিয়ান',
      subtitle:
        selectedAnalysisFrame === 'daily'
          ? `আজকের তারিখ: ${selectedDate}`
          : selectedAnalysisFrame === 'weekly'
          ? `বিগত ৭ দিন (${startStr} থেকে ${selectedDate})`
          : selectedAnalysisFrame === 'monthly'
          ? `চলতি মাস (${startStr} থেকে ${selectedDate})`
          : `চলতি বছর (${startStr} থেকে ${selectedDate})`,
      totalStudents,
      totalDaysCount,
      avgPresentPerDay,
      avgAbsentPerDay,
      overallRate,
      studentStats,
    };
  }, [selectedAnalysisFrame, analysisModalClass, analysisSearchQuery, students, allAttendanceRecords, selectedDate, dailyAttendanceMap]);

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-[#EDF3EF] text-[#1F2937] antialiased p-0 sm:py-4 font-hind overflow-hidden">
      
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

      <div className="relative w-full max-w-[430px] bg-[#F7FBF9] h-full sm:h-[870px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-[#DFECE5]">

        {/* ভিউ ১: ফুল-স্ক্রিন অ্যানালাইসিস পেজ */}
        {selectedAnalysisFrame && analysisBreakdownData ? (
          <div className="flex-1 flex flex-col h-full bg-[#F7FBF9] animate-in slide-in-from-right-4 duration-300">
            <header className="shrink-0 bg-[#F7FBF9] px-4 pt-4 pb-3 border-b border-[#E7F0EB] flex items-center justify-between z-20">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAnalysisFrame(null);
                    setAnalysisSearchQuery('');
                  }}
                  className="h-10 w-10 rounded-2xl bg-white border border-[#E5EFEA] flex items-center justify-center text-[#4B5563] shadow-xs active:scale-95 transition"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="min-w-0">
                  <h1 className="text-sm font-bold text-[#1F2937] leading-none truncate">
                    {analysisBreakdownData.title}
                  </h1>
                  <p className="text-[10px] text-[#008955] font-semibold mt-1 truncate">
                    {analysisBreakdownData.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-[#E7F6ED] text-[#008955] px-2.5 py-1 rounded-xl text-xs font-bold font-sans">
                <TrendingUp size={13} />
                <span>{analysisBreakdownData.overallRate}%</span>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto overscroll-contain no-scrollbar p-4 space-y-3.5">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-3 rounded-2xl border border-[#CDE9DC] shadow-2xs">
                  <span className="text-[10px] font-bold text-[#008955] block">উপস্থিতির হার</span>
                  <span className="text-lg font-black text-[#008955] font-sans">
                    {analysisBreakdownData.overallRate}%
                  </span>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-emerald-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-emerald-800 block">গড়ে উপস্থিত</span>
                  <span className="text-lg font-black text-emerald-900 font-sans">
                    {analysisBreakdownData.avgPresentPerDay} জন
                  </span>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-rose-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-rose-700 block">অনুপস্থিত</span>
                  <span className="text-lg font-black text-rose-800 font-sans">
                    {analysisBreakdownData.avgAbsentPerDay} জন
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {classList.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setAnalysisModalClass(cls)}
                    className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition whitespace-nowrap active:scale-95 ${
                      analysisModalClass === cls
                        ? 'bg-[#008955] text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-[#E1EDE6] hover:bg-[#EDF4F0]'
                    }`}
                  >
                    {cls} বিভাগ
                  </button>
                ))}
              </div>

              <div className="relative flex items-center">
                <span className="absolute left-3 text-slate-400">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="ছাত্রের নাম বা রোল দিয়ে খুঁজুন..."
                  value={analysisSearchQuery}
                  onChange={(e) => setAnalysisSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#D9E7E0] rounded-2xl text-xs font-semibold text-slate-800 shadow-2xs focus:border-[#008955] focus:outline-none"
                />
              </div>

              <div className="space-y-2.5 pt-1 pb-8">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-700">
                    শিক্ষার্থী তালিকা ({analysisBreakdownData.studentStats.length} জন)
                  </span>
                  <span className="text-[10px] text-[#008955] font-bold bg-[#E7F6ED] px-2 py-0.5 rounded-md">
                    হাজিরা নেওয়া হয়েছে: {analysisBreakdownData.totalDaysCount} দিন
                  </span>
                </div>

                {analysisBreakdownData.studentStats.length > 0 ? (
                  analysisBreakdownData.studentStats.map((item) => (
                    <div
                      key={item.student.id}
                      onClick={() => setSelectedStudentForReport(item.student)}
                      className="p-3.5 rounded-2xl bg-white border border-[#DFECE5] flex items-center justify-between shadow-2xs hover:border-[#008955] transition cursor-pointer active:scale-[0.99] group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#E7F6ED] to-[#FEF3C7] border border-white shadow-2xs flex items-center justify-center font-bold text-[#008955] text-xs shrink-0 font-sans">
                          {item.student.rollNo || 'ID'}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#008955] transition leading-tight">
                            {item.student.fullNameBangla || item.student.fullName}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {item.student.className} বিভাগ • রোল: {item.student.rollNo}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-[#008955] font-sans block">
                          {item.rate}%
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          উপস্থিত: {item.presentDays}/{item.effectiveDays} দিন
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-[#DFECE5]">
                    <p className="text-xs font-bold text-slate-400">কোনো তথ্য পাওয়া যায়নি</p>
                  </div>
                )}
              </div>
            </main>

            <AdminBottomNav />
          </div>
        ) : (
          /* ভিউ ২: মূল ড্যাশবোর্ড ও ওভারভিউ পেজ */
          <>
            <header className="shrink-0 bg-[#F7FBF9] px-4 pt-5 pb-3 z-30 flex items-center justify-between gap-2 border-b border-[#E7F0EB]">
              <div className="flex items-center gap-2.5 min-w-0">
                <Link
                  href="/dashboard"
                  className="h-10 w-10 shrink-0 rounded-2xl bg-white border border-[#E5EFEA] flex items-center justify-center text-[#4B5563] shadow-xs active:scale-95 transition"
                >
                  <ArrowLeft size={18} />
                </Link>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-[#008955] bg-[#E7F6ED] px-1.5 py-0.5 rounded shrink-0">
                      লাইভ মনিটরিং
                    </span>
                    <span className="text-[10px] text-[#9CA3AF] font-medium">• শিক্ষক দ্বারা পরিচালিত</span>
                  </div>
                  <h1 className="text-xs sm:text-sm font-bold text-[#1F2937] mt-0.5 leading-tight truncate">
                    উপস্থিতির পর্যালোচনা ও খতিয়ান
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-1 rounded-2xl border border-[#D9E7E0] bg-white px-2 py-1.5 shadow-2xs shrink-0">
                <Calendar size={13} className="text-[#008955]" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-[11px] sm:text-xs font-bold text-[#1F2937] bg-transparent focus:outline-none cursor-pointer font-sans"
                />
              </div>
            </header>

            <main className="flex-1 overflow-y-auto overscroll-contain no-scrollbar p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'daily', title: 'দৈনিক উপস্থিতি', label: 'আজকের দিন', data: metrics.daily },
                  { id: 'weekly', title: 'সাপ্তাহিক উপস্থিতি', label: 'বিগত ৭ দিন', data: metrics.weekly },
                  { id: 'monthly', title: 'মাসিক উপস্থিতি', label: 'চলতি মাস', data: metrics.monthly },
                  { id: 'yearly', title: 'বাৎসরিক উপস্থিতি', label: 'চলতি বছর', data: metrics.yearly },
                ].map((card) => {
                  return (
                    <div
                      key={card.id}
                      onClick={() => {
                        setActiveMetric(card.id as TimeFrame);
                        setSelectedAnalysisFrame(card.id as TimeFrame);
                        setAnalysisModalClass(selectedClass);
                      }}
                      className="relative p-[2.5px] rounded-2xl rounded-tr-[36px] rounded-bl-[36px] cursor-pointer transition-all duration-300 overflow-hidden hover:scale-[1.02] shadow-xs active:scale-95"
                    >
                      <div className="emerald-royal-glow" />

                      <div className="relative z-10 rounded-[0.95rem] rounded-tr-[34px] rounded-bl-[34px] p-3.5 flex flex-col justify-between h-[108px] bg-white">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#008955] bg-[#E7F6ED] px-2 py-0.5 rounded-full">
                            {card.data.rate}% হার
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold font-sans">
                            {card.data.present}/{card.data.total} জন
                          </span>
                        </div>

                        <div className="my-auto text-center">
                          <p className="text-2xl font-black text-slate-800 font-sans tracking-tight">
                            {card.data.rate}%
                          </p>
                        </div>

                        <div className="text-center">
                          <p className="text-[11px] font-extrabold text-[#1F2937] leading-tight">
                            {card.title}
                          </p>
                          <span className="text-[9px] text-[#008955] block font-semibold mt-0.5">
                            {card.label} • খতিয়ান দেখুন
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                {classList.map((cls) => {
                  const isSelected = selectedClass === cls;
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setSelectedClass(cls)}
                      className={`flex-1 min-w-[70px] py-1.5 px-3 rounded-2xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#008955] text-white shadow-xs'
                          : 'bg-white text-[#4B5563] border border-[#E1EDE6] hover:bg-[#EDF4F0]'
                      }`}
                    >
                      <BookOpen size={11} className={isSelected ? 'text-white' : 'text-[#008955]'} />
                      <span>{cls}</span>
                    </button>
                  );
                })}
              </div>

              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  placeholder={`${selectedClass === 'সব' ? 'যেকোনো' : selectedClass} শ্রেণির নাম বা রোল দিয়ে খুঁজুন...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D9E7E0] rounded-2xl text-xs font-semibold text-slate-800 shadow-2xs focus:border-[#008955] focus:outline-none transition-all"
                />
              </div>

              <div
                onClick={() => setShowStudentList(!showStudentList)}
                className="rounded-[22px] bg-white border border-[#BBE3D3] p-3.5 flex items-center justify-between shadow-2xs cursor-pointer active:scale-[0.99] transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-[#E7F6ED] text-[#008955] flex items-center justify-center">
                    <Users size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      {selectedClass === 'সব' ? 'শিক্ষার্থীদের তালিকা ও লাইভ খতিয়ান' : `${selectedClass} বিভাগ শিক্ষার্থী তালিকা`}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium font-sans">
                      মোট শিক্ষার্থী: {filteredStudents.length} জন • বিস্তারিত দেখতে কার্ডে ক্লিক করুন
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="h-8 w-8 rounded-xl bg-[#F7FBF9] text-[#008955] flex items-center justify-center"
                >
                  {showStudentList ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {showStudentList && (
                <div className="space-y-3.5 pt-1 animate-in fade-in pb-12">
                  {isLoading ? (
                    <div className="py-12 text-center">
                      <div className="mx-auto h-7 w-7 animate-spin rounded-full border-3 border-[#008955] border-t-transparent"></div>
                      <p className="mt-2 text-xs font-medium text-[#9CA3AF]">লোড হচ্ছে...</p>
                    </div>
                  ) : filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => {
                      const status = dailyAttendanceMap.get(student.id);

                      return (
                        <div
                          key={student.id}
                          onClick={() => setSelectedStudentForReport(student)}
                          className="relative p-[2.5px] rounded-2xl rounded-tr-[36px] rounded-bl-[36px] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.99] group"
                        >
                          <div className="emerald-royal-glow" />

                          <div className="relative z-10 bg-white rounded-[0.95rem] rounded-tr-[34px] rounded-bl-[34px] p-4.5 w-full h-full space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-[#E7F6ED] text-[#008955] text-[11px] font-bold rounded-full border border-[#BBE3D3]">
                                <BookOpen size={11} />
                                <span>{student.className || 'হিফজ'} বিভাগ</span>
                              </span>

                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-sans">
                                রোল: {student.rollNo || '০'}
                              </span>
                            </div>

                            <div className="flex items-center gap-3.5">
                              <div className="relative shrink-0">
                                <div className="w-16 h-16 bg-gradient-to-tr from-[#E7F6ED] to-[#FEF3C7] rounded-2xl rounded-tr-3xl rounded-bl-3xl flex items-center justify-center border-2 border-white shadow-inner overflow-hidden">
                                  {student.photoUrl ? (
                                    <img
                                      src={student.photoUrl}
                                      alt={student.fullNameBangla || student.fullName}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <User size={30} className="text-[#008955]/70" />
                                  )}
                                </div>
                              </div>

                              <div className="min-w-0 flex-1">
                                <h3 className="text-sm font-black text-slate-900 leading-tight group-hover:text-[#008955] transition">
                                  {student.fullNameBangla || student.fullName}
                                </h3>
                                <p className="text-[11px] text-[#6B7280] mt-1 font-medium">
                                  পিতা: {student.fatherName || 'তথ্য নেই'}
                                </p>
                                <p className="text-[10px] text-slate-400 font-sans mt-0.5 flex items-center gap-1">
                                  <Phone size={10} />
                                  <span>{student.phone || 'মোবাইল নেই'}</span>
                                </p>
                              </div>
                            </div>

                            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-slate-500">
                                আজকের হাজিরা স্ট্যাটাস:
                              </span>

                              <div>
                                {status === 'present' && (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#008955] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                                    <CheckCircle2 size={13} />
                                    <span>উপস্থিত</span>
                                  </span>
                                )}
                                {status === 'absent' && (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl">
                                    <XCircle size={13} />
                                    <span>অনুপস্থিত (আসে নাই)</span>
                                  </span>
                                )}
                                {status === 'leave' && (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                                    <Clock size={13} />
                                    <span>ছুটি নিয়েছে</span>
                                  </span>
                                )}
                                {!status && (
                                  <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-xl">
                                    এন্ট্রি প্রক্রিয়াধীন
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-[#DFECE5] bg-white p-6 text-center shadow-2xs">
                      <p className="text-xs font-bold text-slate-700">কোনো শিক্ষার্থী পাওয়া যায়নি</p>
                    </div>
                  )}
                </div>
              )}
            </main>

            <AdminBottomNav />
          </>
        )}

        {/* শিক্ষার্থীর ব্যক্তিগত খতিয়ান মোডাল */}
        {selectedStudentForReport && studentDetailedReport && (
          <div
            onClick={() => setSelectedStudentForReport(null)}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 backdrop-blur-md p-3 font-hind animate-in fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[360px] max-h-[88vh] rounded-3xl rounded-tr-[40px] rounded-bl-[40px] p-[2.5px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="emerald-royal-glow" />

              <div className="relative z-10 bg-white rounded-[1.4rem] rounded-tr-[38px] rounded-bl-[38px] p-4.5 flex flex-col justify-between overflow-hidden">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <BarChart3 size={16} className="text-[#008955]" />
                    <span className="text-xs font-bold text-[#008955]">ব্যক্তিগত হাজিরা খতিয়ান</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentForReport(null)}
                    className="h-7 w-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="flex items-center gap-3.5 py-3 border-b border-slate-100">
                  <div className="w-14 h-14 bg-gradient-to-tr from-[#E7F6ED] to-[#FEF3C7] rounded-2xl flex items-center justify-center border border-slate-200 overflow-hidden shrink-0">
                    {selectedStudentForReport.photoUrl ? (
                      <img
                        src={selectedStudentForReport.photoUrl}
                        alt="Student"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={28} className="text-[#008955]" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">
                      {selectedStudentForReport.fullNameBangla || selectedStudentForReport.fullName}
                    </h3>
                    <p className="text-[11px] text-[#008955] font-bold mt-0.5">
                      {selectedStudentForReport.className} বিভাগ • রোল: {selectedStudentForReport.rollNo}
                    </p>
                    <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                      অভিভাবক: {selectedStudentForReport.fatherName}
                    </p>
                  </div>
                </div>

                <div className="flex rounded-2xl bg-slate-100 p-1 my-3 border border-slate-200 text-xs font-bold">
                  {(
                    [
                      { id: 'weekly', label: 'সাপ্তাহিক' },
                      { id: 'monthly', label: 'মাসিক' },
                      { id: 'yearly', label: 'বাৎসরিক' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStudentReportTab(tab.id)}
                      className={`flex-1 py-1.5 rounded-xl transition text-center ${
                        studentReportTab === tab.id
                          ? 'bg-[#008955] text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-700 block">উপস্থিত</span>
                    <span className="text-base font-black text-emerald-800 font-sans">
                      {studentDetailedReport.presentDays} দিন
                    </span>
                  </div>

                  <div className="bg-rose-50 p-2 rounded-xl border border-rose-200">
                    <span className="text-[10px] font-bold text-rose-600 block">অনুপস্থিত</span>
                    <span className="text-base font-black text-rose-700 font-sans">
                      {studentDetailedReport.absentDays} দিন
                    </span>
                  </div>

                  <div className="bg-amber-50 p-2 rounded-xl border border-amber-200">
                    <span className="text-[10px] font-bold text-amber-600 block">ছুটি</span>
                    <span className="text-base font-black text-amber-700 font-sans">
                      {studentDetailedReport.leaveDays} দিন
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-2xl bg-[#E7F6ED] border border-[#CDE9DC] flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-700">উপস্থিতির অনুপাত:</span>
                  <span className="text-sm font-black text-[#008955] font-sans">
                    {studentDetailedReport.rate}% ({studentDetailedReport.actualTakenDays} দিন ক্লাসের হিসাব)
                  </span>
                </div>

                <span className="text-[10px] font-bold text-slate-500 mb-1 px-1">সর্বশেষ তারিখভিত্তিক বিবরণ:</span>
                <div className="max-h-[160px] overflow-y-auto no-scrollbar space-y-1.5 pr-0.5">
                  {studentDetailedReport.history.length > 0 ? (
                    studentDetailedReport.history.map((record) => (
                      <div
                        key={record.id}
                        className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                      >
                        <span className="font-mono font-bold text-slate-700 text-[11px]">
                          {record.date}
                        </span>
                        <span
                          className={`font-bold text-[10px] px-2 py-0.5 rounded-md ${
                            record.status === 'present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : record.status === 'absent'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {record.status === 'present'
                            ? 'উপস্থিত'
                            : record.status === 'absent'
                            ? 'আসে নাই'
                            : 'ছুটি'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-4 text-xs text-slate-400">এই সময়ের কোনো রেকর্ড পাওয়া যায়নি</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}