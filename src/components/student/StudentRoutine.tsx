'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Calendar, BookOpen, User, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toBengaliNumber } from '@/lib/prayerCalculator';

interface RoutinePeriod {
  id?: string;
  className: string;
  day: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherName: string;
  roomNo?: string;
}

interface StudentRoutineProps {
  classNameProp?: string;
}

export function StudentRoutine({ classNameProp = 'হিফজুল কুরআন' }: StudentRoutineProps) {
  const [routines, setRoutines] = useState<RoutinePeriod[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDay, setSelectedDay] = useState<string>('আজকের দিন');

  const daysList = ['আজকের দিন', 'শনিবার', 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার'];

  useEffect(() => {
    const fetchClassRoutine = async () => {
      try {
        setLoading(true);

        // Supabase-এর class_routines টেবিল থেকে শিক্ষার্থীর ক্লাস অনুযায়ী ডাটা কোয়েরি
        const { data, error } = await supabase
          .from('class_routines')
          .select('*')
          .eq('class_name', classNameProp);

        if (!error && data && data.length > 0) {
          const formatted: RoutinePeriod[] = data.map((item: any) => ({
            id: item.id,
            className: item.class_name,
            day: item.day,
            startTime: item.start_time,
            endTime: item.end_time,
            subjectName: item.subject_name,
            teacherName: item.teacher_name,
            roomNo: item.room_no,
          }));
          setRoutines(formatted);
        } else {
          // লোকাল স্টোরেজ চেক (যদি অফলাইনে অ্যাডমিন ক্যাশ থাকে)
          const cached = localStorage.getItem(`madrasa_routine_${classNameProp}`);
          if (cached) {
            setRoutines(JSON.parse(cached));
          } else {
            setRoutines([]);
          }
        }
      } catch (err) {
        console.warn('রুটিন লোড ত্রুটি:', err);
        setRoutines([]);
      } finally {
        setLoading(false);
      }
    };

    fetchClassRoutine();
  }, [classNameProp]);

  // ফিল্টার করা পিরিয়ড তালিকা
  const displayRoutines = routines.filter((r) => {
    if (selectedDay === 'আজকের দিন') return true;
    return r.day === selectedDay;
  });

  return (
    <div className="space-y-3 font-['Noto_Sans_Bengali',sans-serif]">
      {/* দিনের ফিল্টার বাটন */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
        {daysList.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => setSelectedDay(day)}
            className={`px-3 py-1 rounded-xl text-[11px] font-bold shrink-0 transition ${
              selectedDay === day
                ? 'bg-[#008955] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* কনটেন্ট তালিকা */}
      {loading ? (
        <div className="py-12 text-center space-y-2">
          <Loader2 size={24} className="animate-spin text-[#008955] mx-auto" />
          <p className="text-xs text-slate-400">ক্লাস রুটিন যাচাই করা হচ্ছে...</p>
        </div>
      ) : displayRoutines.length > 0 ? (
        <div className="space-y-2.5 max-h-[420px] overflow-y-auto no-scrollbar pr-0.5">
          {displayRoutines.map((period, idx) => (
            <div
              key={period.id || idx}
              className="bg-white rounded-2xl border border-slate-200/80 p-3 flex items-center justify-between shadow-2xs hover:border-emerald-200 transition"
            >
              <div className="flex items-center gap-3">
                <span className="font-sans font-bold text-[11px] text-[#008955] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl shrink-0">
                  {toBengaliNumber(period.startTime)} - {toBengaliNumber(period.endTime)}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                    {period.subjectName}
                  </h4>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <User size={11} className="text-slate-400" />
                    <span>{period.teacherName}</span>
                    {period.roomNo && (
                      <>
                        <span>•</span>
                        <span>কক্ষ: {toBengaliNumber(period.roomNo)}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* অ্যাডমিন থেকে রুটিন না দেওয়া থাকলে ফাঁকা স্টেট */
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-2">
          <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Calendar size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">কোনো ক্লাস রুটিন যুক্ত করা হয়নি</h4>
            <p className="text-[10px] text-slate-500 max-w-xs mx-auto mt-0.5 leading-relaxed">
              অ্যাডমিন প্যানেল থেকে <span className="font-bold text-slate-700">{classNameProp}</span> বিভাগের জন্য রুটিন আপলোড করা হলে এখানে প্রদর্শিত হবে।
            </p>
          </div>
        </div>
      )}
    </div>
  );
}