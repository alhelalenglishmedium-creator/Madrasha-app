'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  BookOpen,
  Award,
  CheckCircle2,
  Loader2,
  Save,
  User,
  Plus,
  Trash2,
  AlertCircle,
  X,
  FileCheck2,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import type { Student } from '@/types/database.types';

interface AdminResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentsList: Student[];
  onSuccess: (msg: string) => void;
}

const CLASS_SUBJECTS_MAP: { [key: string]: string[] } = {
  'হিফজুল কুরআন': ['হিফজুল কুরআন (তিলাওয়াত ও শুনানী)', 'আদব ও আখলাক', 'মৌখিক মূল্যায়ন'],
  'নাজেরা': ['নাজেরা তিলাওয়াত', 'তাজবীদ ও মাখরাজ', 'মৌখিক দীনিয়াত'],
  'নূরানী': ['কুরআন মাজীদ ও তাজবীদ', 'বাংলা', 'ইংরেজি', 'গণিত', 'দীনিয়াত ও দোয়া'],
  'প্লে': ['ছড়া ও গল্প', 'অঙ্ক চেনার ছড়া', 'ছবি দেখে পরা'],
  'নার্সারি': ['কুরআন চেনা', 'বাংলা বর্ণমালা', 'English Alphabet', 'গণিত প্রাথমিক'],
};

const CLASS_CATEGORIES = [
  'সকল বিভাগ',
  'হিফজুল কুরআন',
  'নাজেরা',
  'নূরানী',
  'প্লে',
  'নার্সারি',
  '১ম শ্রেণি',
  '২য় শ্রেণি',
  '৩য় শ্রেণি',
  'মিজান',
  'নাহবেমীর',
  'কাফিয়া',
];

const EXAM_TYPES = [
  '১ম সাময়িক পরীক্ষা ২০২৬',
  '২য় সাময়িক পরীক্ষা ২০২৬',
  'বার্ষিক মূল্যায়ন ২০২৬',
  'মাসিক টেস্ট ২০২৬',
];

export function AdminResultModal({
  isOpen,
  onClose,
  studentsList,
  onSuccess,
}: AdminResultModalProps) {
  const [selectedClass, setSelectedClass] = useState<string>('সকল বিভাগ');
  const [examName, setExamName] = useState<string>('১ম সাময়িক পরীক্ষা ২০২৬');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // সক্রিয় শিক্ষার্থী এবং বিষয় ও নম্বর স্টেট
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [currentSubjects, setCurrentSubjects] = useState<string[]>([]);
  const [studentSubjectMarks, setStudentSubjectMarks] = useState<{ [subject: string]: number }>({});
  const [newSubjectInput, setNewSubjectInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // ডায়নামিক শ্রেণি ফিল্টারিং
  const filteredStudents = useMemo(() => {
    return studentsList.filter((std) => {
      const matchClass =
        selectedClass === 'সকল বিভাগ' ||
        (std.className && std.className.toLowerCase().includes(selectedClass.toLowerCase()));

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (std.fullNameBangla && std.fullNameBangla.toLowerCase().includes(q)) ||
        (std.fullName && std.fullName.toLowerCase().includes(q)) ||
        (std.rollNo && String(std.rollNo).includes(q)) ||
        (std.phone && std.phone.includes(q)) ||
        (std.admissionNo && std.admissionNo.toLowerCase().includes(q));

      return matchClass && matchSearch;
    });
  }, [studentsList, selectedClass, searchQuery]);

  if (!isOpen) return null;

  // শিক্ষার্থীর শ্রেণি অনুযায়ী প্রাথমিক বিষয়সমূহ নির্ধারণ
  const getSubjectsForStudent = (student: Student) => {
    const cls = student.className || 'নূরানী';
    const foundKey = Object.keys(CLASS_SUBJECTS_MAP).find((key) => cls.includes(key));
    return foundKey ? [...CLASS_SUBJECTS_MAP[foundKey]] : ['কুরআন শিক্ষা', 'দীনিয়াত', 'সাধারণ বিষয়'];
  };

  // শিক্ষার্থীর প্রোফাইলে ক্লিক করলে নম্বর এন্ট্রি প্যানেল ওপেন
  const handleSelectStudentForResult = (student: Student) => {
    setActiveStudent(student);
    const defaultSubs = getSubjectsForStudent(student);
    setCurrentSubjects(defaultSubs);

    const initialMarks: { [subject: string]: number } = {};
    defaultSubs.forEach((sub) => {
      initialMarks[sub] = 0;
    });
    setStudentSubjectMarks(initialMarks);
    setNewSubjectInput('');
  };

  // নতুন বিষয় যোগকরণ
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

  // বিষয় মুছে ফেলা
  const handleRemoveSubject = (subName: string) => {
    if (currentSubjects.length <= 1) {
      alert('কমপক্ষে একটি বিষয় রাখা আবশ্যক!');
      return;
    }
    setCurrentSubjects((prev) => prev.filter((s) => s !== subName));
    setStudentSubjectMarks((prev) => {
      const copy = { ...prev };
      delete copy[subName];
      return copy;
    });
  };

  // নম্বর পরিবর্তন হ্যান্ডলার
  const handleSubjectMarkChange = (subject: string, val: string) => {
    const num = Number(val);
    setStudentSubjectMarks((prev) => ({
      ...prev,
      [subject]: isNaN(num) ? 0 : Math.min(100, Math.max(0, num)),
    }));
  };

  // নম্বর সংরক্ষণ ও প্রকাশ হ্যান্ডলার (Save & Publish)
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

        let subGrade = 'F';
        if (mark >= 80) subGrade = 'A+';
        else if (mark >= 70) subGrade = 'A';
        else if (mark >= 60) subGrade = 'A-';
        else if (mark >= 50) subGrade = 'B';
        else if (mark >= 33) subGrade = 'C';

        return {
          subjectName: subj,
          totalMarks: 100,
          obtainedMarks: mark,
          grade: subGrade,
        };
      });

      const percentage = Math.round((totalObtained / (totalPossibleMarks || 100)) * 100);

      let grade = 'রাসিব (ফেল)';
      let gpa = 0.0;
      if (percentage >= 80) {
        grade = 'মুমতাজ (A+)';
        gpa = 5.0;
      } else if (percentage >= 70) {
        grade = 'জায়্যিদ জিদ্দান (A)';
        gpa = 4.0;
      } else if (percentage >= 60) {
        grade = 'জায়্যিদ (A-)';
        gpa = 3.5;
      } else if (percentage >= 50) {
        grade = 'মাকবুল (B)';
        gpa = 3.0;
      }

      const resultId = `res_${activeStudent.id}_${examName.replace(/[^a-zA-Z0-9]/g, '_')}_2026`;

      const payload = {
        id: resultId,
        student_id: activeStudent.id,
        student_name: activeStudent.fullNameBangla || activeStudent.fullName,
        student_roll: String(activeStudent.rollNo || '০১'),
        admission_no: activeStudent.admissionNo || activeStudent.id,
        class_name: activeStudent.className || 'সাধারণ',
        exam_name: examName,
        year: '২০২৬',
        subjects: subjectBreakdown,
        total_marks: totalPossibleMarks,
        obtained_marks: totalObtained,
        percentage,
        grade,
        gpa,
        status: 'published',
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('exam_results').upsert([payload], { onConflict: 'id' });
      if (error) throw error;

      onSuccess(`${activeStudent.fullNameBangla || activeStudent.fullName}-এর নম্বর সংরক্ষণ ও প্রকাশ করা হয়েছে!`);
      setActiveStudent(null);
    } catch (err: any) {
      console.error('Save result error:', err);
      alert('ফলাফল সংরক্ষণে সমস্যা হয়েছে: ' + (err.message || 'ডাটাবেজ কানেকশন সমস্যা'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex justify-center items-center bg-[#EDF3EF] text-[#1F2937] antialiased p-0 sm:py-4 font-hind overflow-hidden animate-in fade-in">
      {/* মোবাইল ফ্রেম কনটেইনার */}
      <div className="relative w-full max-w-[430px] bg-[#F7FBF9] h-full sm:h-[870px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-[#DFECE5]">
        
        {/* ================= ১. অ্যাপ বার (হেডার) ================= */}
        <header className="shrink-0 bg-white px-5 pt-6 pb-2.5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 w-11 rounded-full bg-white border border-[#E3ECE6] hover:bg-slate-50 text-slate-700 flex items-center justify-center shadow-2xs active:scale-95 transition"
              title="ফিরে যান"
            >
              <ArrowLeft size={20} className="stroke-[2.2]" />
            </button>
            <div>
              <h1 className="text-base font-black text-[#0F2F24] leading-tight">
                পরীক্ষার ফল প্রকাশ ও নম্বর এন্ট্রি
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

        {/* ================= ২. সার্চ ও বিভাগ ফিল্টার ================= */}
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

          {/* বিভাগ সিলেক্টর পিলস */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {CLASS_CATEGORIES.map((cat) => {
              const isActive = selectedClass === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedClass(cat)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition active:scale-95 ${
                    isActive
                      ? 'bg-[#008955] text-white shadow-xs'
                      : 'bg-white text-[#0F2F24] border border-[#DFECE5] hover:bg-slate-50'
                  }`}
                >
                  <BookOpen size={13} className={isActive ? 'text-white' : 'text-[#008955]'} />
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= ৩. পরীক্ষা নাম সিলেক্টর ================= */}
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

        {/* ================= ৪. শিক্ষার্থী তালিকা ================= */}
        <main className="flex-1 overflow-y-auto overscroll-contain no-scrollbar px-4 py-3 space-y-3">
          <p className="text-[11px] font-bold text-slate-500 px-1">
            * নম্বর দিতে শিক্ষার্থীর প্রোফাইল বা নামে চাপ দিন:
          </p>

          {filteredStudents.length > 0 ? (
            filteredStudents.map((std) => (
              <div
                key={std.id}
                onClick={() => handleSelectStudentForResult(std)}
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
              <AlertCircle size={28} className="mx-auto text-slate-300 mb-1" />
              <p className="text-xs font-bold text-slate-600">কোনো শিক্ষার্থী পাওয়া যায়নি</p>
            </div>
          )}
        </main>

        {/* ================= ৫. নির্বাচিত শিক্ষার্থীর নম্বর এন্ট্রি পপআপ ================= */}
        {activeStudent && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in">
            <div className="bg-white rounded-t-[36px] max-h-[88%] flex flex-col shadow-2xl border-t border-[#DFECE5] overflow-hidden animate-in slide-in-from-bottom">

              {/* স্টুডেন্ট প্রোফাইল হেডার */}
              <div className="p-4 bg-[#F7FBF9] border-b border-[#DFECE5] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#EFF8F3] border border-[#DCEBE2] overflow-hidden flex items-center justify-center shrink-0">
                    {activeStudent.photoUrl ? (
                      <img src={activeStudent.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={22} className="text-[#008955]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900 leading-tight truncate">
                      {activeStudent.fullNameBangla || activeStudent.fullName}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      জামাত: <strong className="text-slate-700">{activeStudent.className || 'সাধারণ'}</strong> • রোল: {activeStudent.rollNo || '০১'} • UID: {activeStudent.admissionNo || activeStudent.id}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveStudent(null)}
                  className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition active:scale-95 shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              {/* বিষয় ও নম্বর ইনপুট এরিয়া */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">

                {/* কাস্টম বিষয় যোগ করার বার */}
                <div className="bg-[#EFF8F3] border border-[#CDEEDE] p-2.5 rounded-2xl space-y-1.5">
                  <span className="text-[11px] font-bold text-[#008955] block flex items-center gap-1">
                    <Sparkles size={12} />
                    <span>+ নতুন কোনো বিষয় যোগ করতে চান?</span>
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

                <div className="space-y-2">
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

              {/* সেভ বাটন */}
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