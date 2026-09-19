'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  CalendarCheck,
  CircleDollarSign,
  UserPlus,
  Receipt,
  UserCheck,
  Clock,
  CheckCircle2,
  BellRing,
  Trash2,
  ChevronRight,
  Bell,
  Sparkles,
  CalendarDays,
  Award,
  IdCard,
  X,
  Plus,
  Save,
  Loader2,
  ArrowLeft,
  Search,
  Check,
  BookOpen,
  User,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { localDb } from '@/db/localDb';
import { supabase } from '@/lib/supabaseClient';
import type { Student, Staff } from '@/types/database.types';

import { AdminBottomNav } from './AdminBottomNav';
import { StudentFormModal } from './StudentFormModal';
import { FeeCollectionModal } from './FeeCollectionModal';
import { TeacherFormModal } from './TeacherFormModal';
import { NoticeModal, type Notice } from './NoticeModal';
import { DashboardHeader } from '@/components/common/DashboardHeader';
import { PrayerScheduleModal } from '../student/PrayerScheduleModal';
import {
  calculateOfflinePrayerTimes,
  formatTimeBengali,
  formatCountdownBengali,
  DEFAULT_COORDINATES,
} from '@/lib/prayerCalculator';

/* ==========================================================================
   ১. ক্লাস রুটিন মোডাল
   ========================================================================== */
const ROUTINE_CLASSES = ['হিফজুল কুরআন', 'নূরানী', 'নাজেরা', 'মিজান', 'নাহবেমীর', 'কাফিয়া'];
const ROUTINE_DAYS = ['শনিবার', 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার'];

function InlineAdminRoutineModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [selectedClass, setSelectedClass] = useState('হিফজুল কুরআন');
  const [selectedDay, setSelectedDay] = useState('শনিবার');
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('10:00 AM');
  const [subjectName, setSubjectName] = useState('');
  const [teacherName, setTeacherName] = useState('');

  const loadRoutines = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('class_routines')
        .select('*')
        .eq('class_name', selectedClass)
        .eq('day', selectedDay)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setRoutines(data);
      } else {
        setRoutines([]);
      }
    } catch {
      setRoutines([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadRoutines();
  }, [isOpen, selectedClass, selectedDay]);

  const handleAddPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName || !teacherName) return;

    try {
      setSaving(true);
      const newPeriod = {
        class_name: selectedClass,
        day: selectedDay,
        start_time: startTime,
        end_time: endTime,
        subject_name: subjectName,
        teacher_name: teacherName,
      };

      const { error } = await supabase.from('class_routines').insert([newPeriod]);
      if (error) throw error;

      setSubjectName('');
      setTeacherName('');
      loadRoutines();
    } catch (err: any) {
      alert('রুটিন সেভ ত্রুটি: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePeriod = async (id: string) => {
    try {
      await supabase.from('class_routines').delete().eq('id', id);
      setRoutines((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert('মুছে ফেলা যায়নি');
    }
  };

  if (!isOpen) return null;

  return (
    <div onClick={onClose} className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 font-hind animate-in fade-in">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[430px] bg-[#F8FAFC] rounded-t-[32px] sm:rounded-3xl shadow-2xl p-4 overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <CalendarDays size={16} />
            </div>
            <h3 className="text-xs font-bold text-slate-900">ক্লাস রুটিন কন্ট্রোল</h3>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 py-3 no-scrollbar">
          <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">জামাত</label>
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:outline-none">
                {ROUTINE_CLASSES.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">দিন</label>
              <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:outline-none">
                {ROUTINE_DAYS.map((d) => (<option key={d} value={d}>{d}</option>))}
              </select>
            </div>
          </div>

          <form onSubmit={handleAddPeriod} className="bg-white p-3 rounded-xl border border-emerald-100 space-y-2">
            <span className="text-[11px] font-bold text-emerald-800 block">নতুন পিরিয়ড এন্ট্রি</span>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="শুরু (যেমন: 09:00 AM)" className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5" required />
              <input type="text" value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="শেষ (যেমন: 10:00 AM)" className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5" required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="বিষয়" className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5" required />
              <input type="text" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="উস্তাদের নাম" className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5" required />
            </div>
            <button type="submit" disabled={saving} className="w-full py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center justify-center gap-1 transition">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />}
              <span>যুক্ত করুন</span>
            </button>
          </form>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500">বর্তমান ক্লাস তালিকা ({routines.length}টি)</span>
            {loading ? (
              <p className="text-center text-xs text-slate-400 py-3">লোড হচ্ছে...</p>
            ) : routines.length > 0 ? (
              routines.map((r) => (
                <div key={r.id} className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-sky-700 font-sans">{r.start_time} - {r.end_time}</span>
                    <h4 className="font-bold text-slate-800">{r.subject_name}</h4>
                    <p className="text-[10px] text-slate-400">উস্তাদ: {r.teacher_name}</p>
                  </div>
                  <button onClick={() => handleDeletePeriod(r.id)} className="text-slate-400 hover:text-rose-600 p-1">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-slate-400 py-4 bg-white rounded-xl border border-dashed">কোনো রুটিন যুক্ত নেই</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   ২. ফলাফল প্রকাশ পেজ (বিষয় যোগ ও মুছে ফেলার প্যানেলসহ)
   ========================================================================== */
const RESULT_CLASS_PILLS = [
  { id: 'সকল বিভাগ', label: 'সব' },
  { id: 'হিফজুল কুরআন', label: 'হিফজ' },
  { id: 'নাজেরা', label: 'নাজেরা' },
  { id: 'নূরানী', label: 'নূরানী' },
  { id: 'প্লে', label: 'প্লে' },
  { id: 'নার্সারি', label: 'নার্সারি' },
  { id: '১ম শ্রেণি', label: '১ম শ্রেণি' },
  { id: '২য় শ্রেণি', label: '২য় শ্রেণি' },
  { id: 'মিজান', label: 'মিজান' },
];

const EXAM_TYPES = [
  '১ম সাময়িক পরীক্ষা ২০২৬',
  '২য় সাময়িক পরীক্ষা ২০২৬',
  'বার্ষিক মূল্যায়ন ২০২৬',
  'মাসিক টেস্ট ২০২৬',
];

const CLASS_SUBJECTS_MAP: { [key: string]: string[] } = {
  'হিফজুল কুরআন': ['হিফজুল কুরআন (তিলাওয়াত ও শুনানী)', 'তাজবীদ ও মাখরাজ', 'মাসনূন দুআ ও নামাজ', 'আদব ও আখলাক'],
  'হিফজ': ['হিফজুল কুরআন (তিলাওয়াত ও শুনানী)', 'তাজবীদ ও মাখরাজ', 'মাসনূন দুআ ও নামাজ', 'আদব ও আখলাক'],
  'নাজেরা': ['নাজেরা কুরআন তিলাওয়াত', 'তাজবীদ শিক্ষা', 'দীনিয়াত ও দুআ', 'আখলাক ও শিষ্টাচার'],
  'নূরানী': ['নূরানী কুরআন শিক্ষা', 'বাংলা ভাষা', 'প্রাথমিক গণিত', 'ইংরেজি', 'দীনিয়াত ও ইসলাম শিক্ষা'],
  'প্লে': ['আরবি হরফ ও শব্দ', 'বাংলা বর্ণমালা', 'মৌখিক ছড়া ও সংখ্যা', 'প্রাথমিক আদব'],
  'নার্সারি': ['আরবি হরফ ও কায়দা', 'বাংলা লিখন ও পঠন', 'ইংরেজি বর্ণমালা', 'সাধারণ জ্ঞান ও সংখ্যা'],
  '১ম শ্রেণি': ['কুরআন ও তাজবীদ', 'বাংলা ১ম ও ২য় পত্র', 'প্রাথমিক গণিত', 'ইংরেজি', 'ইসলাম ও নৈতিক শিক্ষা'],
  '২য় শ্রেণি': ['কুরআন মাজিদ', 'আরবি ভাষা শিক্ষা', 'বাংলা সাহিত্য', 'সাধারণ গণিত', 'ইংরেজি', 'দীনিয়াত'],
  'মিজান': ['মিজানুস সারফ', 'মুনশাইব', 'নাহবেমীর', 'ফিকহ (নূরুল ইযাহ)', 'সিরাত ও আখলাক'],
};

function InlineAdminResultModal({
  isOpen,
  onClose,
  studentsList,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  studentsList: Student[];
  onSuccess: (msg: string) => void;
}) {
  const [selectedTab, setSelectedTab] = useState<string>('সকল বিভাগ');
  const [examName, setExamName] = useState<string>('১ম সাময়িক পরীক্ষা ২০২৬');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [currentSubjects, setCurrentSubjects] = useState<string[]>([]);
  const [studentSubjectMarks, setStudentSubjectMarks] = useState<{ [subject: string]: number }>({});
  const [newSubjectInput, setNewSubjectInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if (!isOpen) return null;

  const filteredStudents = studentsList.filter((std) => {
    const matchClass =
      selectedTab === 'সকল বিভাগ' ||
      (std.className && std.className.toLowerCase().includes(selectedTab.toLowerCase()));

    const q = searchQuery.toLowerCase().trim();
    return (
      matchClass &&
      (!q ||
        (std.fullNameBangla && std.fullNameBangla.toLowerCase().includes(q)) ||
        (std.fullName && std.fullName.toLowerCase().includes(q)) ||
        (std.rollNo && String(std.rollNo).includes(q)) ||
        (std.admissionNo && std.admissionNo.toLowerCase().includes(q)))
    );
  });

  const getSubjectsForStudent = (student: Student) => {
    const cls = student.className || 'নূরানী';
    const found = Object.keys(CLASS_SUBJECTS_MAP).find((key) => cls.includes(key));
    return found ? [...CLASS_SUBJECTS_MAP[found]] : ['কুরআন শিক্ষা', 'দীনিয়াত', 'সাধারণ বিষয়'];
  };

  const handleOpenMarksheet = (student: Student) => {
    setActiveStudent(student);
    const subjects = getSubjectsForStudent(student);
    setCurrentSubjects(subjects);

    const initialMarks: { [subject: string]: number } = {};
    subjects.forEach((subj) => {
      initialMarks[subj] = 0;
    });
    setStudentSubjectMarks(initialMarks);
    setNewSubjectInput('');
  };

  const handleAddCustomSubject = () => {
    const trimmed = newSubjectInput.trim();
    if (!trimmed) return;

    if (currentSubjects.includes(trimmed)) {
      alert('এই বিষয়টি ইতিমধ্যে তালিকায় রয়েছে!');
      return;
    }

    setCurrentSubjects((prev) => [...prev, trimmed]);
    setStudentSubjectMarks((prev) => ({ ...prev, [trimmed]: 0 }));
    setNewSubjectInput('');
  };

  const handleRemoveSubject = (subjName: string) => {
    if (currentSubjects.length <= 1) {
      alert('কমপক্ষে একটি বিষয় রাখা আবশ্যক!');
      return;
    }
    setCurrentSubjects((prev) => prev.filter((s) => s !== subjName));
    setStudentSubjectMarks((prev) => {
      const copy = { ...prev };
      delete copy[subjName];
      return copy;
    });
  };

  const handleSubjectMarkChange = (subject: string, val: string) => {
    const num = Number(val);
    setStudentSubjectMarks((prev) => ({
      ...prev,
      [subject]: isNaN(num) ? 0 : Math.min(100, Math.max(0, num)),
    }));
  };

  const handleSaveStudentResult = async () => {
    if (!activeStudent) return;
    if (currentSubjects.length === 0) {
      alert('অন্তত একটি বিষয় থাকতে হবে!');
      return;
    }

    try {
      setIsSaving(true);
      const totalPossibleMarks = currentSubjects.length * 100;
      let totalObtained = 0;

      const subjectBreakdown = currentSubjects.map((subj) => {
        const mark = studentSubjectMarks[subj] || 0;
        totalObtained += mark;
        return {
          subjectName: subj,
          totalMarks: 100,
          obtainedMarks: mark,
        };
      });

      const percentage = Math.round((totalObtained / (totalPossibleMarks || 100)) * 100);

      let grade = 'রাসিব (ফেল)';
      if (percentage >= 80) grade = 'মুমতাজ (A+)';
      else if (percentage >= 70) grade = 'জায়্যিদ জিদ্দান (A)';
      else if (percentage >= 60) grade = 'জায়্যিদ (A-)';
      else if (percentage >= 50) grade = 'মাকবুল (B)';

      const payload = {
        student_id: activeStudent.id,
        class_name: activeStudent.className || 'সাধারণ',
        exam_name: examName,
        year: '২০২৬',
        subjects: subjectBreakdown,
        total_marks: totalPossibleMarks,
        obtained_marks: totalObtained,
        percentage,
        grade,
      };

      const { error } = await supabase.from('exam_results').upsert([payload]);
      if (error) throw error;

      onSuccess(`${activeStudent.fullNameBangla || activeStudent.fullName}-এর ফলাফল সংরক্ষিত ও প্রকাশিত হয়েছে!`);
      setActiveStudent(null);
    } catch (err: any) {
      alert('ফলাফল সংরক্ষণে ত্রুটি: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex justify-center items-center bg-[#EDF3EF] text-[#1F2937] antialiased p-0 sm:py-4 font-hind overflow-hidden animate-in fade-in">
      <div className="relative w-full max-w-[430px] bg-[#F7FBF9] h-full sm:h-[870px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-[#DFECE5]">
        
        {/* হেডার */}
        <header className="shrink-0 bg-white px-5 pt-6 pb-2.5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 w-11 rounded-full bg-white border border-[#E3ECE6] hover:bg-slate-50 text-slate-700 flex items-center justify-center shadow-2xs active:scale-95 transition"
            >
              <ArrowLeft size={20} className="stroke-[2.2]" />
            </button>
            <div>
              <h1 className="text-base font-black text-[#0F2F24] leading-tight">
                ফলাফল এন্ট্রি ও প্রকাশ
              </h1>
              <span className="inline-block text-[11px] font-bold text-[#008955] bg-[#E7F6ED] px-2.5 py-0.5 rounded-full mt-1 border border-[#D1EFE0]">
                শিক্ষার্থী: {filteredStudents.length} জন
              </span>
            </div>
          </div>

          <div className="h-11 w-11 rounded-2xl bg-[#008955] text-white flex items-center justify-center shadow-sm">
            <Award size={22} />
          </div>
        </header>

        {/* সার্চ ও জামাত ফিল্টার */}
        <div className="px-5 py-2.5 space-y-2.5 shrink-0 bg-white border-b border-slate-100">
          <div className="relative">
            <Search size={17} className="absolute left-4 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="নাম, রোল, ফোন বা UID দিয়ে খুঁজুন..."
              className="w-full text-xs font-medium bg-[#F8FAF9] border border-[#DFECE5] rounded-full pl-11 pr-4 py-2.5 focus:outline-none focus:border-[#008955] shadow-2xs transition text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {RESULT_CLASS_PILLS.map((pill) => {
              const isActive = selectedTab === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setSelectedTab(pill.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition active:scale-95 ${
                    isActive
                      ? 'bg-[#008955] text-white shadow-xs'
                      : 'bg-white text-[#0F2F24] border border-[#DFECE5] hover:bg-slate-50'
                  }`}
                >
                  <BookOpen size={13} className={isActive ? 'text-white' : 'text-[#008955]'} />
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* পরীক্ষা সিলেক্টর */}
        <div className="px-5 py-2 bg-[#EFF8F3] border-b border-[#D5EBE0] shrink-0 flex items-center justify-between">
          <span className="text-xs font-bold text-[#0F2F24]">পরীক্ষার নাম:</span>
          <select
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
            className="text-xs font-bold text-[#008955] bg-white border border-[#C6E5D4] rounded-xl px-3 py-1 focus:outline-none"
          >
            {EXAM_TYPES.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>

        {/* শিক্ষার্থী তালিকা */}
        <main className="flex-1 overflow-y-auto overscroll-contain no-scrollbar px-4 py-3 space-y-3">
          <p className="text-[11px] font-bold text-slate-500 px-1">
            * শিক্ষার্থীর প্রোফাইলে চাপ দিয়ে নম্বর দিন অথবা ইচ্ছামতো বিষয় যোগ/ডিলিট করুন:
          </p>

          {filteredStudents.length > 0 ? (
            filteredStudents.map((std) => (
              <div
                key={std.id}
                onClick={() => handleOpenMarksheet(std)}
                className="bg-white rounded-[24px] border border-[#DFECE5] p-3.5 shadow-2xs hover:border-[#008955] cursor-pointer transition active:scale-[0.98] group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-13 h-13 rounded-2xl bg-[#EFF8F3] border border-[#DCEBE2] overflow-hidden flex items-center justify-center">
                        {std.photoUrl ? (
                          <img
                            src={std.photoUrl}
                            alt={std.fullNameBangla || std.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={24} className="text-[#008955]" />
                        )}
                      </div>
                      <span className="absolute -bottom-1 -right-1 bg-[#008955] text-white font-sans text-[9px] font-black px-1.5 py-0.2 rounded-md shadow-xs border border-white">
                        {String(std.rollNo || '০১').padStart(2, '0')}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-900 group-hover:text-[#008955] transition truncate leading-tight">
                        {std.fullNameBangla || std.fullName}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        পিতা: {std.fatherName || 'তথ্য নেই'}
                      </p>
                      <span className="text-[9.5px] font-sans text-purple-700 font-bold bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100 mt-0.5 inline-block">
                        UID: {std.admissionNo || 'বরাদ্দ নেই'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#008955] bg-[#E7F6ED] border border-[#CDEEDE] px-2.5 py-1 rounded-xl">
                      {std.className || 'হিফজ'}
                    </span>
                    <div className="h-8 w-8 rounded-full bg-[#E7F6ED] text-[#008955] flex items-center justify-center font-bold text-xs shadow-2xs">
                      নম্বর
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-1 bg-white rounded-3xl border border-dashed border-slate-200">
              <p className="text-xs font-bold text-slate-600">কোনো শিক্ষার্থী পাওয়া যায়নি</p>
            </div>
          )}
        </main>

        {/* মার্কশিট পপআপ */}
        {activeStudent && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in">
            <div className="bg-white rounded-t-[36px] max-h-[88%] flex flex-col shadow-2xl border-t border-[#DFECE5] overflow-hidden animate-in slide-in-from-bottom">
              
              <div className="p-4 bg-[#F7FBF9] border-b border-[#DFECE5] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#EFF8F3] border border-[#DCEBE2] overflow-hidden flex items-center justify-center">
                    {activeStudent.photoUrl ? (
                      <img src={activeStudent.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={22} className="text-[#008955]" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">
                      {activeStudent.fullNameBangla || activeStudent.fullName}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      জামাত: <strong className="text-slate-700">{activeStudent.className || 'হিফজ'}</strong> • রোল: {activeStudent.rollNo || '০২'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveStudent(null)}
                  className="h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition active:scale-95"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                <div className="bg-[#EFF8F3] border border-[#CDEEDE] p-2.5 rounded-2xl space-y-1.5">
                  <span className="text-[11px] font-bold text-[#008955] block">
                    + নতুন কোনো বিষয় যোগ করতে চান?
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="বিষয়ের নাম লিখুন (যেমন: আদব ও আখলাক)..."
                      value={newSubjectInput}
                      onChange={(e) => setNewSubjectInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomSubject();
                        }
                      }}
                      className="flex-1 text-xs font-bold bg-white border border-[#BBE3D3] rounded-xl px-3 py-2 focus:outline-none focus:border-[#008955] text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSubject}
                      className="px-3.5 py-2 rounded-xl bg-[#008955] hover:bg-[#007548] text-white text-xs font-bold transition flex items-center gap-1 shrink-0 active:scale-95 shadow-2xs"
                    >
                      <Plus size={14} />
                      <span>যোগ করুন</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between px-1 pt-1">
                  <span className="text-xs font-black text-slate-800">
                    বিষয় তালিকা ({currentSubjects.length}টি)
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    প্রতি বিষয়ে পূর্ণমান: ১০০
                  </span>
                </div>

                <div className="space-y-2.5">
                  {currentSubjects.map((subject, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-[#DFECE5] rounded-2xl flex items-center justify-between gap-2 shadow-2xs hover:border-[#008955]/40 transition group"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleRemoveSubject(subject)}
                          className="h-7 w-7 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition active:scale-90 shrink-0"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 size={15} />
                        </button>
                        <span className="text-xs font-bold text-slate-800 leading-snug truncate">
                          {subject}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          placeholder="0"
                          value={studentSubjectMarks[subject] !== undefined ? studentSubjectMarks[subject] : ''}
                          onChange={(e) => handleSubjectMarkChange(subject, e.target.value)}
                          className="w-18 text-center font-black font-sans text-sm bg-slate-50 border border-slate-200 rounded-xl py-1.5 focus:outline-none focus:border-[#008955] focus:bg-white text-slate-800 shadow-inner"
                        />
                        <span className="text-xs font-sans font-bold text-slate-400">/১০০</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveStudentResult}
                  className="w-full py-3.5 rounded-2xl bg-[#008955] hover:bg-[#007548] text-white text-xs font-black shadow-md active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>নম্বর সংরক্ষণ ও প্রকাশ করুন</span>
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ==========================================================================
   ৩. শিক্ষার্থী ও শিক্ষক স্মার্ট UID বরাদ্দ পেজ (TID পারসিস্ট ফিক্সড)
   ========================================================================== */
function InlineUidManagementPage({
  isOpen,
  onClose,
  studentsList,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  studentsList: Student[];
  onSuccess: (msg: string) => void;
}) {
  const [activePortalTab, setActivePortalTab] = useState<'students' | 'teachers'>('students');
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('সকল বিভাগ');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingUids, setEditingUids] = useState<{ [id: string]: string }>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      localDb.staff.where('role').equals('teacher').toArray().then((data) => {
        setTeachersList(data);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredStudents = studentsList.filter((std) => {
    const matchClass =
      selectedTab === 'সকল বিভাগ' ||
      (std.className && std.className.toLowerCase().includes(selectedTab.toLowerCase()));

    const q = searchQuery.toLowerCase().trim();
    return (
      matchClass &&
      (!q ||
        (std.fullNameBangla && std.fullNameBangla.toLowerCase().includes(q)) ||
        (std.fullName && std.fullName.toLowerCase().includes(q)) ||
        (std.rollNo && String(std.rollNo).includes(q)) ||
        (std.admissionNo && std.admissionNo.toLowerCase().includes(q)))
    );
  });

  const filteredTeachers = teachersList.filter((tc) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      (tc.fullName && tc.fullName.toLowerCase().includes(q)) ||
      (tc.phone && tc.phone.includes(q)) ||
      (tc.designation && tc.designation.toLowerCase().includes(q)) ||
      (tc.teacher_uid && tc.teacher_uid.toLowerCase().includes(q)) ||
      (tc.id && tc.id.toLowerCase().includes(q))
    );
  });

  const handleSaveStudentUid = async (student: Student) => {
    const oldOriginalUid = student.id;
    const newCustomUid =
      editingUids[student.id]?.trim() ||
      student.admissionNo ||
      `UID-2026-${String(student.rollNo || Math.floor(10 + Math.random() * 90)).padStart(2, '0')}`;

    try {
      setLoadingId(student.id);

      const updatePayload: any = {
        id: newCustomUid,
        admission_no: newCustomUid,
        name: student.fullNameBangla || student.fullName,
        full_name: student.fullName,
        full_name_bangla: student.fullNameBangla,
        class_name: student.className,
        roll: String(student.rollNo || '০১'),
        phone: student.phone || null,
        photo_url: student.photoUrl || null,
        updated_at: new Date().toISOString(),
      };

      // ১. Supabase-এ পুরোনো ID ধরে প্রাইমারি কি কলাম 'id' আপডেট
      let { data, error } = await supabase
        .from('students')
        .update(updatePayload)
        .eq('id', oldOriginalUid)
        .select();

      if (error) {
        console.error("Database Save Failed (Update UID):", error);
      }

      if (!data || data.length === 0) {
        const upsertRes = await supabase
          .from('students')
          .upsert([updatePayload], { onConflict: 'id' })
          .select();

        if (upsertRes.error) {
          console.error("Database Save Failed (Upsert UID):", upsertRes.error);
          throw upsertRes.error;
        }
      }

      // ২. লোকাল ডেটাবেজে পুরোনো রেকর্ড ডিলিট করে নতুন আইডি দিয়ে সেভ
      if (newCustomUid !== oldOriginalUid) {
        await localDb.students.delete(oldOriginalUid);
      }
      await localDb.students.put({
        ...student,
        id: newCustomUid,
        admissionNo: newCustomUid,
        updatedAt: new Date().toISOString(),
      });

      onSuccess(`${student.fullNameBangla || student.fullName}-এর UID সংরক্ষিত: ${newCustomUid}`);
    } catch (err: any) {
      console.error("Database Save Failed:", err);
      alert('সংরক্ষণ ব্যর্থ: ' + (err.message || 'ইউআইডি সেভ করতে সমস্যা হয়েছে'));
    } finally {
      setLoadingId(null);
    }
  };

  const handleSaveTeacherUid = async (teacher: any) => {
    const newUid = editingUids[teacher.id]?.trim();
    if (!newUid) {
      alert('অনুগ্রহ করে নতুন UID লিখুন!');
      return;
    }

    try {
      setLoadingId(teacher.id);

      // লোকাল স্টোরেজে teacher_uid ও id উভয় জায়গায় সেভ
      await localDb.staff.update(teacher.id, {
        id: newUid,
        teacher_uid: newUid,
        updatedAt: new Date().toISOString(),
      });

      // ক্লাউডে staff ও teachers টেবিলে সেভ
      try {
        await supabase
          .from('staff')
          .upsert([
            {
              id: teacher.id,
              teacher_uid: newUid,
              full_name: teacher.fullName,
              phone: teacher.phone,
              designation: teacher.designation,
            },
          ], { onConflict: 'id' });

        await supabase
          .from('teachers')
          .upsert([
            {
              id: newUid,
              name: teacher.fullName,
              phone: teacher.phone,
              photo_url: teacher.photoUrl || null,
              is_linked: false,
            },
          ], { onConflict: 'id' });
      } catch (e) {}

      onSuccess(`${teacher.fullName}-এর UID পরিবর্তন হয়েছে: ${newUid}`);
      const updated = await localDb.staff.where('role').equals('teacher').toArray();
      setTeachersList(updated);
    } catch (err: any) {
      alert('শিক্ষক UID আপডেট ত্রুটি: ' + err.message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex justify-center items-center bg-[#EDF3EF] text-[#1F2937] antialiased p-0 sm:py-4 font-hind overflow-hidden animate-in fade-in">
      <div className="relative w-full max-w-[430px] bg-[#F7FBF9] h-full sm:h-[870px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-[#DFECE5]">
        
        {/* হেডার */}
        <header className="shrink-0 bg-white px-5 pt-6 pb-2.5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 w-11 rounded-full bg-white border border-[#E3ECE6] hover:bg-slate-50 text-slate-700 flex items-center justify-center shadow-2xs active:scale-95 transition"
            >
              <ArrowLeft size={20} className="stroke-[2.2]" />
            </button>
            <div>
              <h1 className="text-base font-black text-[#0F2F24] leading-tight">
                স্মার্ট UID বরাদ্দ ও নিয়ন্ত্রণ
              </h1>
              <span className="inline-block text-[11px] font-bold text-[#008955] bg-[#E7F6ED] px-2.5 py-0.5 rounded-full mt-1 border border-[#D1EFE0]">
                {activePortalTab === 'students' ? `শিক্ষার্থী: ${filteredStudents.length} জন` : `শিক্ষক: ${filteredTeachers.length} জন`}
              </span>
            </div>
          </div>

          <div className="h-11 w-11 rounded-2xl bg-[#008955] text-white flex items-center justify-center shadow-sm">
            <IdCard size={22} />
          </div>
        </header>

        {/* পোর্টাল সুইচ ট্যাব */}
        <div className="bg-[#E7F6ED] p-1.5 mx-4 mt-3 rounded-2xl flex items-center gap-1 shrink-0 border border-[#CDEEDE]">
          <button
            type="button"
            onClick={() => setActivePortalTab('students')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
              activePortalTab === 'students'
                ? 'bg-[#008955] text-white shadow-xs'
                : 'text-[#0F2F24] hover:bg-white/50'
            }`}
          >
            শিক্ষার্থী UID
          </button>
          <button
            type="button"
            onClick={() => setActivePortalTab('teachers')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
              activePortalTab === 'teachers'
                ? 'bg-[#008955] text-white shadow-xs'
                : 'text-[#0F2F24] hover:bg-white/50'
            }`}
          >
            শিক্ষক / ওস্তাদ UID
          </button>
        </div>

        {/* সার্চ বার */}
        <div className="px-4 py-2.5 shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activePortalTab === 'students' ? 'ছাত্রের নাম, রোল বা ফোন...' : 'শিক্ষকের নাম, পদবী বা ফোন...'}
              className="w-full text-xs font-medium bg-white border border-[#DFECE5] rounded-full pl-10 pr-4 py-2 focus:outline-none focus:border-[#008955] shadow-2xs text-slate-800"
            />
          </div>
        </div>

        {/* স্ক্রলেবল তালিকা */}
        <main className="flex-1 overflow-y-auto no-scrollbar px-4 pb-4 space-y-3">
          
          {/* ১. শিক্ষক UID তালিকা */}
          {activePortalTab === 'teachers' && (
            <div className="space-y-2.5">
              {filteredTeachers.length > 0 ? (
                filteredTeachers.map((tc) => (
                  <div
                    key={tc.id}
                    className="bg-white rounded-[22px] border border-[#DFECE5] p-3.5 space-y-2.5 shadow-2xs hover:border-[#008955] transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-[#E7F6ED] text-[#008955] flex items-center justify-center font-bold text-base shrink-0 border border-[#CDEEDE]">
                          {tc.photoUrl ? (
                            <img src={tc.photoUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            <User size={24} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-slate-900 truncate">{tc.fullName}</h4>
                          <p className="text-[10px] text-slate-500 truncate">{tc.designation} • {tc.assignedClass}</p>
                          <p className="text-[9.5px] font-sans text-slate-400">ফোন: {tc.phone}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-black font-sans bg-[#E7F6ED] text-[#008955] px-2.5 py-1 rounded-xl border border-[#BEE7D3]">
                          {tc.teacher_uid || tc.id}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      <input
                        type="text"
                        defaultValue={tc.teacher_uid || tc.id}
                        onChange={(e) => setEditingUids({ ...editingUids, [tc.id]: e.target.value })}
                        placeholder="নতুন শিক্ষক UID দিন..."
                        className="flex-1 text-xs font-sans font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#008955] focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const auto = `TID ${Math.floor(100 + Math.random() * 900)}`;
                          setEditingUids({ ...editingUids, [tc.id]: auto });
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 text-[11px] font-bold border border-purple-200"
                        title="অটো সিরিয়াল"
                      >
                        <Sparkles size={12} />
                      </button>
                      <button
                        type="button"
                        disabled={loadingId === tc.id}
                        onClick={() => handleSaveTeacherUid(tc)}
                        className="px-3 py-1.5 rounded-xl bg-[#008955] hover:bg-[#007548] text-white text-[11px] font-bold transition active:scale-95 shadow-2xs flex items-center gap-1 shrink-0"
                      >
                        <RefreshCw size={11} />
                        <span>আপডেট</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 bg-white rounded-3xl border border-dashed">
                  <p className="text-xs font-bold text-slate-600">কোনো শিক্ষক পাওয়া যায়নি</p>
                </div>
              )}
            </div>
          )}

          {/* ২. শিক্ষার্থী UID তালিকা */}
          {activePortalTab === 'students' && (
            <div className="space-y-2.5">
              {filteredStudents.map((std) => (
                <div
                  key={std.id}
                  className="bg-white rounded-[22px] border border-[#DFECE5] p-3 space-y-2 hover:border-[#008955] transition shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-xs text-[#008955] shrink-0 font-sans">
                        {std.rollNo || '০১'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                          {std.fullNameBangla || std.fullName}
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate">জামাত: {std.className}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-sans font-black text-[#008955] bg-[#E7F6ED] px-2 py-0.5 rounded-lg">
                      {std.admissionNo || 'নেই'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <input
                      type="text"
                      defaultValue={std.admissionNo || ''}
                      onChange={(e) => setEditingUids({ ...editingUids, [std.id]: e.target.value })}
                      placeholder="UID দিন (যেমন: UID-2026-01)"
                      className="flex-1 text-xs font-sans font-bold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:bg-white focus:outline-none focus:border-[#008955]"
                    />
                    <button
                      type="button"
                      disabled={loadingId === std.id}
                      onClick={() => handleSaveStudentUid(std)}
                      className="px-3 py-1.5 rounded-xl bg-[#008955] text-white text-[11px] font-bold transition active:scale-95 shadow-2xs flex items-center gap-1"
                    >
                      <Check size={12} />
                      <span>সেভ</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </main>

      </div>
    </div>
  );
}

/* ==========================================================================
   ৪. মূল অ্যাডমিন ড্যাশবোর্ড
   ========================================================================== */
export function AdminDashboard() {
  const { user, logout } = useAuth();

  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    totalStaff: 0,
    attendanceRate: 0,
    totalCollection: 0,
  });
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isUidModalOpen, setIsUidModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // সালাত ট্র্যাকার ও মোডাল স্টেট
  const [isPrayerModalOpen, setIsPrayerModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const prayerData = useMemo(() => {
    return calculateOfflinePrayerTimes(
      DEFAULT_COORDINATES.latitude,
      DEFAULT_COORDINATES.longitude,
      currentTime
    );
  }, [currentTime]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // ১. সুপাবেস ক্লাউড থেকে স্টুডেন্টস ডেটা লোকালডিবি-তে সিঙ্ক
      try {
        const { data: cloudStudents } = await supabase.from('students').select('*');
        if (cloudStudents && cloudStudents.length > 0) {
          for (const std of cloudStudents) {
            const stdId = std.id || std.admission_no || `std_${Date.now()}`;
            const mappedStd = {
              id: stdId,
              admissionNo: std.admission_no || std.admissionNo || std.id || '',
              fullName: std.full_name || std.name || 'শিক্ষার্থী',
              fullNameBangla: std.name || std.full_name_bangla || std.full_name || 'শিক্ষার্থী',
              className: std.class_name || std.className || 'হিফজুল কুরআন',
              rollNo: String(std.roll || std.roll_no || std.rollNo || '০১'),
              fatherName: std.father_name || std.fatherName || '',
              phone: std.phone || '',
              guardianContacts: Array.isArray(std.guardian_contacts)
                ? std.guardian_contacts
                : (typeof std.guardian_contacts === 'string'
                    ? (function () { try { return JSON.parse(std.guardian_contacts); } catch (e) { return []; } })()
                    : (std.phone ? [{ id: 'c_1', title: 'অভিভাবক', phone: std.phone }] : [])),
              monthlyFee: Number(std.monthly_fee || std.monthlyFee || 1000),
              photoUrl: std.photo_url || std.photoUrl || '',
              status: (std.status || 'active') as any,
              createdAt: std.created_at || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await localDb.students.put(mappedStd);
          }
        }
      } catch (e) {
        console.warn('Cloud students sync warning:', e);
      }

      // ২. সুপাবেস ক্লাউড থেকে টিচার্স ও স্টাফ ডেটা লোকালডিবি-তে সিঙ্ক
      try {
        const { data: cloudTeachers } = await supabase.from('teachers').select('*');
        if (cloudTeachers && cloudTeachers.length > 0) {
          for (const tc of cloudTeachers) {
            const existing = await localDb.staff.get(tc.id);
            await localDb.staff.put({
              id: tc.id,
              teacher_uid: tc.id,
              fullName: tc.name || tc.full_name || 'শিক্ষক',
              designation: existing?.designation || 'শিক্ষক',
              role: 'teacher',
              assignedClass: existing?.assignedClass || '',
              isClassTeacher: existing?.isClassTeacher ?? false,
              phone: tc.phone || existing?.phone || '',
              email: existing?.email || '',
              joiningDate: existing?.joiningDate || new Date().toISOString().split('T')[0],
              monthlySalary: existing?.monthlySalary || 12000,
              photoUrl: tc.photo_url || existing?.photoUrl || '',
              status: 'active',
              createdAt: existing?.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }

        const { data: cloudStaff } = await supabase.from('staff').select('*');
        if (cloudStaff && cloudStaff.length > 0) {
          for (const stf of cloudStaff) {
            const stfId = stf.id || stf.teacher_uid || `stf_${Date.now()}`;
            const mappedStf = {
              id: stfId,
              teacher_uid: stf.teacher_uid || stf.id,
              fullName: stf.full_name || stf.fullName || stf.name || 'শিক্ষক',
              designation: stf.designation || 'শিক্ষক',
              role: (stf.role || 'teacher') as any,
              assignedClass: stf.assigned_class || stf.assignedClass || '',
              isClassTeacher: stf.is_class_teacher ?? false,
              phone: stf.phone || '',
              email: stf.email || '',
              joiningDate: stf.joining_date || new Date().toISOString().split('T')[0],
              monthlySalary: Number(stf.monthly_salary || stf.monthlySalary || 12000),
              photoUrl: stf.photo_url || stf.photoUrl || '',
              status: (stf.status || 'active') as any,
              createdAt: stf.created_at || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await localDb.staff.put(mappedStf);
          }
        }
      } catch (e) {
        console.warn('Cloud teachers sync warning:', e);
      }

      const students = await localDb.students.where('status').equals('active').toArray();
      setStudentsList(students);
      const totalStudents = students.length;

      const staffList = await localDb.staff.where('status').equals('active').toArray();
      const totalStaff = staffList.length;

      const todayRecords = await localDb.attendance.where('date').equals(today).toArray();
      const presentCount = todayRecords.filter((r) => r.status === 'present').length;
      const rate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

      const currentMonth = new Date().toISOString().slice(0, 7);
      const payments = await localDb.feePayments.toArray();
      const monthPayments = payments.filter((p) => p.paymentDate?.startsWith(currentMonth));
      const totalCollected = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      setMetrics({
        totalStudents,
        totalStaff,
        attendanceRate: rate,
        totalCollection: totalCollected,
      });

      // নোটিশ লোড (সুপাবেস + লোকালস্টোরেজ)
      try {
        const { data: cloudNotices, error: noticeErr } = await supabase
          .from('notices')
          .select('*')
          .order('created_at', { ascending: false });

        if (!noticeErr && cloudNotices && cloudNotices.length > 0) {
          const mapped: Notice[] = cloudNotices.map((n: any) => ({
            id: String(n.id),
            title: n.title,
            description: n.description || n.content || '',
            content: n.description || n.content || '',
            category: n.category || 'সাধারণ',
            target_type: n.target_type || 'all',
            target_id: n.target_id || '',
            targetAudience: n.target_type || 'all',
            date: n.created_at ? n.created_at.split('T')[0] : (n.date || new Date().toISOString().split('T')[0]),
            created_at: n.created_at,
            created_by: n.created_by || 'মুহতামিম / প্রশাসন',
            author: n.created_by || 'মুহতামিম / প্রশাসন',
          }));
          setNotices(mapped);
          localStorage.setItem('madrasa_notices', JSON.stringify(mapped));
          localStorage.setItem('madrasa_admin_notices', JSON.stringify(mapped));
        } else {
          const savedNotices = localStorage.getItem('madrasa_notices');
          if (savedNotices) {
            setNotices(JSON.parse(savedNotices));
          } else {
            const initialNotice: Notice = {
              id: 'not_1',
              title: 'আসন্ন সাময়িক পরীক্ষার সময়সূচি প্রকাশ',
              description: 'সকল শিক্ষক ও শিক্ষার্থীদের অবগতির জন্য জানানো যাচ্ছে যে, আগামী রবিবার থেকে প্রথম সাময়িক পরীক্ষা অনুষ্ঠিত হবে।',
              content: 'সকল শিক্ষক ও শিক্ষার্থীদের অবগতির জন্য জানানো যাচ্ছে যে, আগামী রবিবার থেকে প্রথম সাময়িক পরীক্ষা অনুষ্ঠিত হবে।',
              category: 'পরীক্ষা',
              target_type: 'all',
              date: new Date().toISOString().split('T')[0],
              author: 'মুহতামিম / প্রশাসন',
            };
            setNotices([initialNotice]);
            localStorage.setItem('madrasa_notices', JSON.stringify([initialNotice]));
            localStorage.setItem('madrasa_admin_notices', JSON.stringify([initialNotice]));
          }
        }
      } catch (e) {
        console.warn('Admin notice load warning:', e);
      }
    } catch (err) {
      console.error('ডাটা লোড ত্রুটি:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const triggerSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
    loadDashboardData();
  };

  const handleSaveNotice = async (noticeData: Omit<Notice, 'id'>) => {
    try {
      const newNotice: Notice = {
        ...noticeData,
        id: `not_${Date.now()}`,
      };

      // Supabase notices টেবিলে সিঙ্ক
      try {
        const { error: supaErr } = await supabase.from('notices').insert([{
          title: noticeData.title,
          description: noticeData.description || noticeData.content || '',
          category: noticeData.category || 'সাধারণ',
          target_type: noticeData.target_type || (noticeData as any).targetAudience || 'all',
          target_id: noticeData.target_id || null,
          created_by: noticeData.author || noticeData.created_by || 'প্রশাসন',
          created_at: noticeData.created_at || new Date().toISOString(),
        }]);

        if (supaErr) {
          console.warn('Notice Supabase insert warning:', supaErr.message);
        }
      } catch (e) {
        console.warn('Notice Supabase network warning:', e);
      }

      const updated = [newNotice, ...notices];
      setNotices(updated);
      localStorage.setItem('madrasa_notices', JSON.stringify(updated));
      localStorage.setItem('madrasa_admin_notices', JSON.stringify(updated));
      triggerSuccess('নোটিশ সফলভাবে প্রকাশ করা হয়েছে!');
    } catch (err) {
      console.error('Save Notice Error:', err);
    }
  };

  const handleDeleteNotice = (id: string) => {
    const updated = notices.filter((n) => n.id !== id);
    setNotices(updated);
    localStorage.setItem('madrasa_notices', JSON.stringify(updated));
    triggerSuccess('নোটিশটি মুছে ফেলা হয়েছে।');
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-[#EDF3EF] text-[#1F2937] antialiased p-0 sm:py-4 font-hind overflow-hidden">
      <div className="relative w-full max-w-[430px] bg-[#F7FBF9] h-full sm:h-[870px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-[#DFECE5]">
        {successToast && (
          <div className="absolute top-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full bg-[#00573D] px-4 py-2 text-xs font-semibold text-white shadow-xl animate-in fade-in">
            <CheckCircle2 size={15} className="text-[#34D399]" />
            <span>{successToast}</span>
          </div>
        )}

        {/* সর্বজনীন ব্র্যান্ড হেডার (Global Brand Header) */}
        <DashboardHeader
          onNotificationClick={() => setIsNoticeModalOpen(true)}
          hasNotification={notices.length > 0}
          onLogoutClick={logout}
        />

        {/* বডি কনটেন্ট */}
        <main className="flex-1 overflow-y-auto overscroll-contain no-scrollbar px-4 pb-4 space-y-3.5">
          {/* প্রোফাইল কার্ড */}
          <div className="bg-[#00573D] rounded-[28px] p-4 text-white shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white font-bold text-lg">
                  মু
                </div>
                <div>
                  <div className="inline-flex items-center gap-1 bg-[#FBBF24] text-[#78350F] text-[10px] font-bold px-2 py-0.5 rounded-full mb-1">
                    <Sparkles size={10} />
                    <span>মুহতামিম / প্রধান</span>
                  </div>
                  <h2 className="text-base font-bold leading-snug">
                    {user?.name || 'মাওলানা আব্দুল্লাহ মাহমুদ'}
                  </h2>
                  <p className="text-[11px] text-emerald-100/80 font-normal">আইডি: ADM-2026 • প্রশাসন</p>
                </div>
              </div>
              <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center text-white/90">
                <ChevronRight size={18} />
              </div>
            </div>
          </div>

          {/* লাইভ সালাত কার্ড */}
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

          {/* মেট্রিক্স */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-white border border-[#E1EDE6] rounded-[22px] p-3 flex flex-col justify-between shadow-2xs">
              <span className="text-[11px] font-bold text-[#374151]">উপস্থিতি</span>
              <span className="text-xl font-black text-[#1F2937] font-sans my-1">{metrics.attendanceRate}%</span>
              <span className="text-[10px] font-medium text-[#008955]">নিয়মিত হাজিরা</span>
            </div>

            <div className="bg-[#FFFDF7] border border-[#FDE68A]/60 rounded-[22px] p-3 flex flex-col justify-between shadow-2xs">
              <span className="text-[11px] font-bold text-[#78350F]">মোট জনবল</span>
              <div className="flex items-baseline gap-1 my-1">
                <span className="text-xl font-black text-[#1F2937] font-sans">{metrics.totalStudents}</span>
                <span className="text-[10px] text-[#6B7280]">/{metrics.totalStaff} জন</span>
              </div>
              <span className="text-[10px] font-medium text-[#D97706]">ছাত্র ও ওস্তাদ</span>
            </div>

            <div className="bg-[#F8F9FE] border border-[#E0E7FF] rounded-[22px] p-3 flex flex-col justify-between shadow-2xs">
              <span className="text-[11px] font-bold text-[#3730A3]">মাসিক ফি</span>
              <span className="text-xs font-bold text-[#4338CA] my-1">৳ {metrics.totalCollection.toLocaleString('bn-BD')}</span>
              <span className="text-[10px] font-medium text-[#4F46E5]">চলতি মাস</span>
            </div>
          </div>

          {/* প্রশাসনিক মেনু ও সেবা */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-[#374151]">প্রশাসনিক মেনু ও সেবা</h3>
              <span className="text-[11px] font-semibold text-[#008955]">কন্ট্রোল সেন্টার</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => setIsStudentModalOpen(true)} className="bg-white border border-[#E3ECE6] rounded-[20px] p-3.5 flex items-center gap-3 shadow-2xs active:scale-95 transition text-left">
                <div className="h-10 w-10 rounded-xl bg-[#008955] text-white flex items-center justify-center shrink-0">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1F2937]">নতুন ভর্তি</h4>
                  <p className="text-[9.5px] text-slate-400 mt-0.5">শিক্ষার্থী অন্তর্ভুক্তি</p>
                </div>
              </button>

              <button onClick={() => setIsFeeModalOpen(true)} className="bg-white border border-[#E3ECE6] rounded-[20px] p-3.5 flex items-center gap-3 shadow-2xs active:scale-95 transition text-left">
                <div className="h-10 w-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0">
                  <Receipt size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1F2937]">ফি আদায়</h4>
                  <p className="text-[9.5px] text-slate-400 mt-0.5">রসিদ ও পেমেন্ট</p>
                </div>
              </button>

              <button onClick={() => setIsRoutineModalOpen(true)} className="bg-white border border-[#E3ECE6] rounded-[20px] p-3.5 flex items-center gap-3 shadow-2xs active:scale-95 transition text-left">
                <div className="h-10 w-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
                  <CalendarDays size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1F2937]">ক্লাস রুটিন</h4>
                  <p className="text-[9.5px] text-slate-400 mt-0.5">জামাতভিত্তিক সময়সূচি</p>
                </div>
              </button>

              <button onClick={() => setIsResultModalOpen(true)} className="bg-white border border-[#E3ECE6] rounded-[20px] p-3.5 flex items-center gap-3 shadow-2xs active:scale-95 transition text-left">
                <div className="h-10 w-10 rounded-xl bg-[#008955] text-white flex items-center justify-center shrink-0">
                  <Award size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1F2937]">ফলাফল প্রকাশ</h4>
                  <p className="text-[9.5px] text-slate-400 mt-0.5">নম্বর এন্ট্রি ও প্রকাশ</p>
                </div>
              </button>

              <button onClick={() => setIsUidModalOpen(true)} className="bg-white border border-[#E3ECE6] rounded-[20px] p-3.5 flex items-center gap-3 shadow-2xs active:scale-95 transition text-left">
                <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                  <IdCard size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1F2937]">UID বরাদ্দ</h4>
                  <p className="text-[9.5px] text-slate-400 mt-0.5">স্মার্ট আইডি সেট</p>
                </div>
              </button>

              <button onClick={() => setIsNoticeModalOpen(true)} className="bg-white border border-[#E3ECE6] rounded-[20px] p-3.5 flex items-center gap-3 shadow-2xs active:scale-95 transition text-left">
                <div className="h-10 w-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center shrink-0">
                  <BellRing size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1F2937]">নোটিশ জারি</h4>
                  <p className="text-[9.5px] text-slate-400 mt-0.5">জরুরি বিজ্ঞপ্তি</p>
                </div>
              </button>
            </div>
          </div>

          {/* নোটিশ বোর্ড */}
          <div className="bg-white rounded-[24px] p-4 border border-[#E2ECE6] shadow-2xs space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-[#1F2937]">মাদ্রাসা নোটিশ বোর্ড</h3>
              <button onClick={() => setIsNoticeModalOpen(true)} className="text-xs font-semibold text-[#008955] hover:underline">
                + নতুন নোটিশ
              </button>
            </div>

            <div className="space-y-2">
              {notices.map((n) => (
                <div key={n.id} className="p-3 rounded-2xl bg-[#F8FAF9] border border-[#E7EFEA] space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-[#008955] bg-emerald-50 px-2 py-0.5 rounded">{n.category}</span>
                    <button onClick={() => handleDeleteNotice(n.id)} className="text-slate-400 hover:text-rose-600"><Trash2 size={12} /></button>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">{n.title}</h4>
                  <p className="text-[11px] text-slate-500">{n.content}</p>
                </div>
              ))}
            </div>
          </div>
        </main>

        <AdminBottomNav />
      </div>

      {/* নামাজের সময়সূচি ও অ্যালার্ম মোডাল */}
      <PrayerScheduleModal
        isOpen={isPrayerModalOpen}
        onClose={() => setIsPrayerModalOpen(false)}
      />

      {/* অন্যান্য প্রশাসনিক মোডালসমূহ */}
      <NoticeModal isOpen={isNoticeModalOpen} onClose={() => setIsNoticeModalOpen(false)} onSaveNotice={handleSaveNotice} />

      {/* নতুন শিক্ষার্থী ভর্তি - Supabase + LocalDb দ্বিমুখী সিঙ্ক */}
      {/* নতুন শিক্ষার্থী ভর্তি - Supabase + LocalDb দ্বিমুখী সিঙ্ক (ফ্লেক্সিবল UID) */}
      <StudentFormModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        onSave={async (d: any) => {
          const finalId = (d.admissionNo || `S-${Math.floor(100 + Math.random() * 900)}`).trim();
          const primaryPhone = d.phone || (d.guardianContacts?.[0]?.phone || '');
          const studentRecord = {
            ...d,
            id: finalId,
            admissionNo: finalId,
            phone: primaryPhone,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const studentPayload: any = {
            id: finalId,
            admission_no: finalId,
            name: d.fullNameBangla || d.fullName,
            full_name: d.fullName,
            full_name_bangla: d.fullNameBangla,
            class_name: d.className,
            roll: String(d.rollNo || '০১'),
            roll_no: String(d.rollNo || '০১'),
            phone: primaryPhone || null,
            guardian_contacts: d.guardianContacts || [],
            father_name: d.fatherName || null,
            address: d.address || null,
            blood_group: d.bloodGroup || null,
            monthly_fee: Number(d.monthlyFee || 0),
            photo_url: d.photoUrl || null,
            status: d.status || 'active',
            updated_at: new Date().toISOString(),
          };

          const { error: stdErr } = await supabase
            .from('students')
            .upsert([studentPayload], { onConflict: 'id' })
            .select();

          if (stdErr) {
            console.error("Student Admission Failed in Supabase:", stdErr);
            throw new Error(`Supabase সেভ ব্যর্থ হয়েছে: ${stdErr.message}`);
          }

          await localDb.students.put(studentRecord);
          triggerSuccess(`শিক্ষার্থী ভর্তি সম্পন্ন! (UID: ${finalId})`);
        }}
      />

      <FeeCollectionModal isOpen={isFeeModalOpen} onClose={() => setIsFeeModalOpen(false)} studentsList={studentsList} onSavePayment={async (d) => { await localDb.feePayments.add({ ...d, id: `fee_${Date.now()}`, receiptNo: `REC-${Date.now().toString().slice(-6)}`, synced: false, createdAt: new Date().toISOString() }); triggerSuccess('ফি আদায় সম্পন্ন!'); }} />
      
      {/* নতুন শিক্ষক যুক্তকরণ - Supabase + LocalDb দ্বিমুখী সিঙ্ক (ফ্লেক্সিবল UID) */}
      <TeacherFormModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        onSave={async (d: any) => {
          const finalId = (d.teacher_uid || d.id || `T-${Math.floor(100 + Math.random() * 900)}`).trim();
          
          const teacherRecord = {
            ...d,
            id: finalId,
            teacher_uid: finalId,
            fullName: d.fullName,
            phone: d.phone || '',
            email: d.email || '',
            role: d.role || 'teacher',
            designation: d.designation || 'শিক্ষক',
            assignedClass: d.assignedClass || '',
            isClassTeacher: !!d.isClassTeacher,
            monthlySalary: Number(d.monthlySalary || 12000),
            photoUrl: d.photoUrl || '',
            status: d.status || 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          await localDb.staff.put(teacherRecord);
          loadDashboardData();

          try {
            const teacherPayload: any = {
              id: finalId,
              teacher_uid: finalId,
              full_name: d.fullName,
              name: d.fullName,
              phone: d.phone || '',
              email: d.email || null,
              role: d.role || 'teacher',
              designation: d.designation || 'শিক্ষক',
              assigned_class: d.assignedClass || '',
              is_class_teacher: !!d.isClassTeacher,
              monthly_salary: Number(d.monthlySalary || 12000),
              photo_url: d.photoUrl || null,
              status: d.status || 'active',
            };

            const { error: staffErr } = await supabase
              .from('staff')
              .upsert([teacherPayload], { onConflict: 'id' });

            if (staffErr) {
              console.warn('Supabase staff sync fallback 1:', staffErr.message);
              const { error: fbErr } = await supabase
                .from('staff')
                .upsert([
                  {
                    id: finalId,
                    teacher_uid: finalId,
                    full_name: d.fullName,
                    phone: d.phone || '',
                    designation: d.designation || 'শিক্ষক',
                    monthly_salary: Number(d.monthlySalary || 12000),
                    photo_url: d.photoUrl || null,
                  },
                ], { onConflict: 'id' });

              if (fbErr) {
                console.warn('Supabase staff sync fallback 2:', fbErr.message);
                await supabase
                  .from('staff')
                  .upsert([
                    {
                      id: finalId,
                      full_name: d.fullName,
                      phone: d.phone || '',
                    },
                  ], { onConflict: 'id' });
              }
            }

            try {
              await supabase
                .from('teachers')
                .upsert([
                  {
                    id: finalId,
                    name: d.fullName,
                    phone: d.phone || '',
                    photo_url: d.photoUrl || null,
                    is_linked: false,
                  },
                ], { onConflict: 'id' });
            } catch (tcErr) {
              console.warn('Supabase teachers table sync error:', tcErr);
            }
          } catch (e) {
            console.warn('Supabase teacher sync warning:', e);
          }
          
          triggerSuccess(`শিক্ষক যুক্ত হয়েছেন! (UID: ${finalId})`);
        }}
      />

      <InlineAdminRoutineModal isOpen={isRoutineModalOpen} onClose={() => setIsRoutineModalOpen(false)} />

      <InlineAdminResultModal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        studentsList={studentsList}
        onSuccess={triggerSuccess}
      />

      <InlineUidManagementPage
        isOpen={isUidModalOpen}
        onClose={() => setIsUidModalOpen(false)}
        studentsList={studentsList}
        onSuccess={triggerSuccess}
      />
    </div>
  );
}