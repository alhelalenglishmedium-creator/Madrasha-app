'use client';

import React, { useState, useEffect } from 'react';
import { X, BookOpen, Save, CheckCircle, Award } from 'lucide-react';
import type { Student } from '@/types/database.types';

export interface SabakRecord {
  id?: string;
  studentId: string;
  date: string;
  newSabak: string;       // নতুন সবক (পারা/পৃষ্ঠা)
  sabki: string;          // সবকি (নিকটবর্তী রিভিশন)
  satpara: string;        // সাতপারা (পুরাতন রিভিশন)
  grade: 'মুমতায' | 'জাইয়্যিদ জিদ্দান' | 'জাইয়্যিদ' | 'মাকবুল' | 'মেহনত প্রয়োজন';
  remark?: string;
}

interface SabakEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: Student | null;
  studentsList?: Student[];
  onSaveSabak: (record: SabakRecord) => Promise<void> | void;
}

const GRADES = [
  { label: 'মুমতায (উত্তম)', value: 'মুমতায', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  { label: 'জাইয়্যিদ জিদ্দান (খুব ভালো)', value: 'জাইয়্যিদ জিদ্দান', color: 'bg-teal-50 text-teal-800 border-teal-300' },
  { label: 'জাইয়্যিদ (ভালো)', value: 'জাইয়্যিদ', color: 'bg-blue-50 text-blue-800 border-blue-300' },
  { label: 'মাকবুল (চলতি)', value: 'মাকবুল', color: 'bg-amber-50 text-amber-800 border-amber-300' },
  { label: 'মেহনত প্রয়োজন', value: 'মেহনত প্রয়োজন', color: 'bg-rose-50 text-rose-800 border-rose-300' },
];

export function SabakEntryModal({
  isOpen,
  onClose,
  student,
  studentsList = [],
  onSaveSabak,
}: SabakEntryModalProps) {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [newSabak, setNewSabak] = useState('');
  const [sabki, setSabki] = useState('');
  const [satpara, setSatpara] = useState('');
  const [grade, setGrade] = useState<SabakRecord['grade']>('মুমতায');
  const [remark, setRemark] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (student) {
      setSelectedStudentId(student.id);
    } else if (studentsList.length > 0) {
      setSelectedStudentId(studentsList[0].id);
    }
    setErrorMessage('');
  }, [student, studentsList, isOpen]);

  const activeStudent = student || studentsList.find((s) => s.id === selectedStudentId);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setErrorMessage('অনুগ্রহ করে শিক্ষার্থী নির্বাচন করুন!');
      return;
    }
    if (!newSabak.trim()) {
      setErrorMessage('আজকের নতুন সবকের বিবরণ প্রদান করুন!');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await onSaveSabak({
        studentId: selectedStudentId,
        date,
        newSabak: newSabak.trim(),
        sabki: sabki.trim(),
        satpara: satpara.trim(),
        grade,
        remark: remark.trim(),
      });
      // রিসেট ও ক্লোজ
      setNewSabak('');
      setSabki('');
      setSatpara('');
      setRemark('');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'সবক সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs font-hind">
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
        
        {/* হেডার */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[#064e3b]">
              <BookOpen size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">দৈনিক সবক এন্ট্রি</h2>
              <p className="text-[11px] text-slate-400">পড়া ও রিভিশনের মূল্যায়ন সংরক্ষণ করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* এরর মেসেজ */}
        {errorMessage && (
          <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600 border border-rose-100">
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          
          {/* শিক্ষার্থী নির্বাচন / সারসংক্ষেপ */}
          {!student && studentsList.length > 0 ? (
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                শিক্ষার্থী নির্বাচন করুন *
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
              >
                {studentsList.map((s) => (
                  <option key={s.id} value={s.id}>
                    রোল {s.rollNo || '-'} : {s.fullNameBangla || s.fullName} ({s.className})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white font-bold text-emerald-800 shadow-xs text-xs">
                  {activeStudent?.rollNo || 'ID'}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {activeStudent?.fullNameBangla || activeStudent?.fullName}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    শ্রেণি: {activeStudent?.className}
                  </p>
                </div>
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none"
              />
            </div>
          )}

          {/* নতুন সবক */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              আজকের নতুন সবক (পারা / পৃষ্ঠা / আয়াত) *
            </label>
            <input
              type="text"
              placeholder="যেমন: সূরা বাকারাহ, পারা-১, পৃষ্ঠা-১৫"
              value={newSabak}
              onChange={(e) => setNewSabak(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
              required
            />
          </div>

          {/* সবকি ও সাতপারা */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                সবকি (নিকটবর্তী রিভিশন)
              </label>
              <input
                type="text"
                placeholder="যেমন: পারা-১, পৃষ্ঠা ১-১৪"
                value={sabki}
                onChange={(e) => setSabki(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                সাতপারা / আমপারা
              </label>
              <input
                type="text"
                placeholder="যেমন: পারা-৩০ সম্পূর্ণ"
                value={satpara}
                onChange={(e) => setSatpara(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* পড়ার মান / গ্রেড নির্বাচন */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
              পড়ার মান / মূল্যায়ন *
            </label>
            <div className="flex flex-wrap gap-1.5">
              {GRADES.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGrade(g.value as SabakRecord['grade'])}
                  className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold transition-all ${
                    grade === g.value
                      ? `${g.color} ring-2 ring-emerald-600/30 shadow-xs`
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* মন্তব্য / ওস্তাদের নসিহত */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              ওস্তাদের মন্তব্য / নসিহত (ঐচ্ছিক)
            </label>
            <input
              type="text"
              placeholder="যেমন: মাশাআল্লাহ সুন্দর হয়েছে, গুন্নাহতে আরও সতর্ক হতে হবে"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* বাটনসমূহ */}
          <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 active:scale-95 transition"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-[#064e3b] px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#053f30] active:scale-95 disabled:opacity-50"
            >
              <Save size={14} />
              <span>{isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'সবক সংরক্ষণ করুন'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}