'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CalendarDays, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface RoutineItem {
  id?: string;
  class_name: string;
  day: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  teacher_name: string;
  room_no: string;
}

interface AdminRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CLASS_LIST = ['হিফজুল কুরআন', 'নূরানী', 'নাজেরা', 'মিজান', 'নাহবেমীর', 'কাফিয়া', 'হেদায়া'];
const DAYS = ['শনিবার', 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার'];

export function AdminRoutineModal({ isOpen, onClose }: AdminRoutineModalProps) {
  const [selectedClass, setSelectedClass] = useState<string>('হিফজুল কুরআন');
  const [selectedDay, setSelectedDay] = useState<string>('শনিবার');
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const [startTime, setStartTime] = useState<string>('09:00 AM');
  const [endTime, setEndTime] = useState<string>('10:00 AM');
  const [subjectName, setSubjectName] = useState<string>('');
  const [teacherName, setTeacherName] = useState<string>('');
  const [roomNo, setRoomNo] = useState<string>('');

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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRoutines();
    }
  }, [isOpen, selectedClass, selectedDay]);

  const handleAddPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName || !teacherName) {
      alert('বিষয় ও শিক্ষকের নাম প্রদান করুন');
      return;
    }

    try {
      setSaving(true);
      const newPeriod: RoutineItem = {
        class_name: selectedClass,
        day: selectedDay,
        start_time: startTime,
        end_time: endTime,
        subject_name: subjectName,
        teacher_name: teacherName,
        room_no: roomNo || '১০১',
      };

      const { error } = await supabase.from('class_routines').insert([newPeriod]);
      if (error) throw error;

      setSubjectName('');
      setTeacherName('');
      setRoomNo('');
      loadRoutines();
    } catch (err: any) {
      alert('রুটিন সেভ করা যায়নি: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePeriod = async (id?: string) => {
    if (!id) return;
    if (!confirm('এই পিরিয়ডটি মুছে ফেলতে চান?')) return;

    try {
      const { error } = await supabase.from('class_routines').delete().eq('id', id);
      if (error) throw error;
      setRoutines((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      alert('ডিলিট ব্যর্থ হয়েছে: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 font-['Noto_Sans_Bengali',sans-serif] animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] bg-[#F8FAFC] rounded-t-[32px] sm:rounded-3xl shadow-2xl p-4 overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8.5 w-8.5 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <CalendarDays size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">ক্লাস রুটিন কন্ট্রোল</h3>
              <p className="text-[10px] text-slate-500">জামাত ও দিন অনুযায়ী ক্লাস রুটিন নির্ধারণ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar py-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">জামাত / বিভাগ</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none"
              >
                {CLASS_LIST.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">বার / দিন</label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <form onSubmit={handleAddPeriod} className="bg-white p-3 rounded-2xl border border-emerald-100 shadow-2xs space-y-2.5">
            <span className="text-[11px] font-bold text-emerald-800 block">নতুন পিরিয়ড যুক্ত করুন</span>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="শুরু (যেমন: 09:00 AM)"
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none"
                required
              />
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="শেষ (যেমন: 10:00 AM)"
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="বিষয়ের নাম"
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none"
                required
              />
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="উস্তাদের নাম"
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none"
                required
              />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={roomNo}
                onChange={(e) => setRoomNo(e.target.value)}
                placeholder="রুম নং (ঐচ্ছিক)"
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none w-1/2"
              />
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs disabled:opacity-60"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />}
                <span>যোগ করুন</span>
              </button>
            </div>
          </form>

          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-700 px-1 block">নির্ধারিত ক্লাস তালিকা ({routines.length}টি)</span>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Loader2 size={18} className="animate-spin mx-auto text-emerald-600 mb-1" />
                <span>লোড হচ্ছে...</span>
              </div>
            ) : routines.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
                {routines.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold font-sans text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {r.start_time} - {r.end_time}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{r.subject_name}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        উস্তাদ: {r.teacher_name} {r.room_no && `• রুম: ${r.room_no}`}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePeriod(r.id)}
                      className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200 text-xs">
                এই দিনে কোনো ক্লাস নির্ধারণ করা হয়নি
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}