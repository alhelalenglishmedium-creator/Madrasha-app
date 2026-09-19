'use client';

import React, { useState, useEffect } from 'react';
import { X, BellRing, Send, Target, Users, User, GraduationCap } from 'lucide-react';
import { localDb } from '@/db/localDb';

export type NoticeTargetType =
  | 'all'
  | 'all_teachers'
  | 'specific_teacher'
  | 'all_students'
  | 'specific_class'
  | 'specific_student';

export interface Notice {
  id: string;
  title: string;
  description: string;
  content?: string;
  category: 'জরুরি' | 'ছুটি' | 'পরীক্ষা' | 'সাধারণ';
  target_type: NoticeTargetType;
  target_id?: string;
  targetAudienceLabel?: string;
  date?: string;
  created_at?: string;
  created_by?: string;
  author?: string;
}

interface NoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNotice: (notice: Omit<Notice, 'id'>) => void;
}

const CATEGORIES: Notice['category'][] = ['জরুরি', 'ছুটি', 'পরীক্ষা', 'সাধারণ'];

export function NoticeModal({ isOpen, onClose, onSaveNotice }: NoticeModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Notice['category']>('সাধারণ');
  const [targetType, setTargetType] = useState<NoticeTargetType>('all');
  const [targetId, setTargetId] = useState<string>('');
  const [targetLabel, setTargetLabel] = useState<string>('সকলের জন্য (সার্বজনীন)');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  // শিক্ষক ও শিক্ষার্থীদের ডাইনামিক তালিকা
  const [staffList, setStaffList] = useState<{ id: string; name: string; designation: string; uid: string }[]>([]);
  const [studentClasses, setStudentClasses] = useState<string[]>([]);
  const [studentsList, setStudentsList] = useState<{ id: string; name: string; roll: string; className: string }[]>([]);

  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        // ১. শিক্ষক ও স্টাফের তালিকা
        const staff = await localDb.staff.toArray();
        const formattedStaff = staff.map((s) => ({
          id: s.id,
          name: s.fullName,
          designation: s.designation || 'শিক্ষক',
          uid: s.teacher_uid || s.id,
        }));
        setStaffList(formattedStaff);

        // ২. শিক্ষার্থীদের তালিকা ও শ্রেণির তালিকা
        const students = await localDb.students.toArray();
        const formattedStudents = students.map((std) => ({
          id: std.id || std.admissionNo,
          name: std.fullNameBangla || std.fullName,
          roll: String(std.rollNo || '0'),
          className: std.className || 'সাধারণ',
        }));
        setStudentsList(formattedStudents);

        const classes = Array.from(new Set(students.map((s) => s.className).filter(Boolean)));
        const savedClasses = localStorage.getItem('madrasa_custom_classes');
        const customClasses: string[] = savedClasses ? JSON.parse(savedClasses) : ['প্লে', 'নার্সারি', 'হিফজ'];
        setStudentClasses(Array.from(new Set([...classes, ...customClasses])));
      } catch (err) {
        console.error('ডাটা লোড ত্রুটি:', err);
      }
    };

    if (isOpen) loadDropdownData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('শিরোনাম ও নোটিশের বিস্তারিত বিবরণ লিখুন!');
      return;
    }

    if (targetType === 'specific_teacher' && !targetId) {
      setError('অনুগ্রহ করে একজন শিক্ষক নির্বাচন করুন!');
      return;
    }

    if (targetType === 'specific_class' && !targetId) {
      setError('অনুগ্রহ করে একটি শ্রেণি নির্বাচন করুন!');
      return;
    }

    if (targetType === 'specific_student' && !targetId) {
      setError('অনুগ্রহ করে একজন শিক্ষার্থী নির্বাচন করুন!');
      return;
    }

    onSaveNotice({
      title: title.trim(),
      description: content.trim(),
      content: content.trim(),
      category,
      target_type: targetType,
      target_id: targetId,
      targetAudienceLabel: targetLabel,
      date,
      created_at: new Date().toISOString(),
      created_by: 'মুহতামিম / প্রশাসন',
      author: 'মুহতামিম / প্রশাসন',
    });

    setTitle('');
    setContent('');
    setCategory('সাধারণ');
    setTargetType('all');
    setTargetId('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs font-hind">
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
        
        {/* হেডার */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[#008955]">
              <BellRing size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">টার্গেটেড নোটিশ প্রকাশ</h2>
              <p className="text-[11px] text-slate-400">নির্দিষ্ট শিক্ষক ও শিক্ষার্থীদের বার্তা প্রেরণ করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 p-2.5 text-xs font-bold text-rose-600 border border-rose-100">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          
          {/* ১. টার্গেট অডিয়েন্স টাইপ সিলেক্ট */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
              <Target size={13} className="text-[#008955]" />
              <span>নোটিশের প্রাপক (Target Audience) *</span>
            </label>
            <select
              value={targetType}
              onChange={(e) => {
                const val = e.target.value as NoticeTargetType;
                setTargetType(val);
                setTargetId('');
                const selectedText = e.target.options[e.target.selectedIndex].text;
                setTargetLabel(selectedText);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-[#008955] focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="all">সকলের জন্য (শিক্ষক, শিক্ষার্থী ও অভিভাবক)</option>
              <option value="all_teachers">সকল শিক্ষক ও স্টাফদের জন্য</option>
              <option value="specific_teacher">নির্দিষ্ট শিক্ষক/স্টাফ</option>
              <option value="all_students">সকল শিক্ষার্থী ও অভিভাবকদের জন্য</option>
              <option value="specific_class">নির্দিষ্ট শিক্ষার্থী শ্রেণি/শাখা</option>
              <option value="specific_student">নির্দিষ্ট শিক্ষার্থী (Individual Student)</option>
            </select>
          </div>

          {/* ২. কন্ডিশনাল সেকেন্ডারি সিলেক্টর (ডিপেনডেন্ট ড্রপডাউন) */}
          {targetType === 'specific_teacher' && (
            <div className="animate-in fade-in duration-200">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                <Users size={13} className="text-[#008955]" />
                <span>শিক্ষক নির্বাচন করুন *</span>
              </label>
              <select
                value={targetId}
                onChange={(e) => {
                  setTargetId(e.target.value);
                  const selectedText = e.target.options[e.target.selectedIndex].text;
                  setTargetLabel(`শুধুমাত্র ${selectedText}`);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-[#008955] focus:bg-white focus:outline-none cursor-pointer"
                required
              >
                <option value="">-- শিক্ষক নির্বাচন করুন --</option>
                {staffList.map((st) => (
                  <option key={st.id} value={st.uid}>
                    {st.name} ({st.designation})
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetType === 'specific_class' && (
            <div className="animate-in fade-in duration-200">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                <GraduationCap size={13} className="text-[#008955]" />
                <span>শ্রেণি/শাখা নির্বাচন করুন *</span>
              </label>
              <select
                value={targetId}
                onChange={(e) => {
                  setTargetId(e.target.value);
                  setTargetLabel(`${e.target.value} শ্রেণির জন্য`);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-[#008955] focus:bg-white focus:outline-none cursor-pointer"
                required
              >
                <option value="">-- শ্রেণি নির্বাচন করুন --</option>
                {studentClasses.map((sc) => (
                  <option key={sc} value={sc}>
                    {sc} বিভাগ/শ্রেণি
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetType === 'specific_student' && (
            <div className="animate-in fade-in duration-200">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                <User size={13} className="text-[#008955]" />
                <span>শিক্ষার্থী নির্বাচন করুন *</span>
              </label>
              <select
                value={targetId}
                onChange={(e) => {
                  setTargetId(e.target.value);
                  const selectedText = e.target.options[e.target.selectedIndex].text;
                  setTargetLabel(`শুধুমাত্র ${selectedText}`);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-[#008955] focus:bg-white focus:outline-none cursor-pointer"
                required
              >
                <option value="">-- শিক্ষার্থী নির্বাচন করুন --</option>
                {studentsList.map((std) => (
                  <option key={std.id} value={std.id}>
                    {std.name} ({std.className} • রোল {std.roll})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ৩. নোটিশের ধরন বা ক্যাটাগরি */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
              নোটিশের ধরন *
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-xl py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    category === cat
                      ? 'bg-[#008955] text-white shadow-xs'
                      : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* ৪. শিরোনাম */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              নোটিশের শিরোনাম *
            </label>
            <input
              type="text"
              placeholder="যেমন: হিফজ বিভাগের বিশেষ বৈঠক"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 focus:border-[#008955] focus:bg-white focus:outline-none"
              required
            />
          </div>

          {/* ৫. বিস্তারিত বিবরণ */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              বিস্তারিত বার্তা / বিবরণ *
            </label>
            <textarea
              rows={4}
              placeholder="সংশ্লিষ্ট সকলের অবগতির জন্য জানানো যাচ্ছে যে..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-[#008955] focus:bg-white focus:outline-none"
              required
            />
          </div>

          {/* ৬. তারিখ */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              প্রকাশের তারিখ *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:border-[#008955] focus:bg-white focus:outline-none font-sans"
              required
            />
          </div>

          {/* বাটন */}
          <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition active:scale-95 cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-[#008955] px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#007548] active:scale-95 cursor-pointer"
            >
              <Send size={14} />
              <span>নোটিশ প্রকাশ করুন</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
