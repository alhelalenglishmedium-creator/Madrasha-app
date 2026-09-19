'use client';

import React from 'react';
import { BookmarkCheck } from 'lucide-react';
import { StudentRoutine } from './StudentRoutine';
import type { Student } from '@/types/database.types';

interface StudentStudyViewProps {
  student: Student;
}

export const StudentStudyView: React.FC<StudentStudyViewProps> = ({ student }) => {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-base font-bold text-[#1F2933]">দৈনিক সবক ও বিষয়সমূহ</h2>
          <p className="text-[11px] text-[#6B7280]">
            শ্রেণি: {student.className} {student.section ? `(শাখা-${student.section})` : ''}
          </p>
        </div>
        <span className="px-2.5 py-1 bg-[#E8F3EE] text-[#0F6B4F] border border-[#0F6B4F]/20 rounded-lg text-xs font-bold">
          শিক্ষাবর্ষ ২০২৬
        </span>
      </div>

      {/* আজকের সবক বক্স */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
          <span className="text-xs font-bold text-[#1F2933] flex items-center gap-1.5">
            <BookmarkCheck className="w-4 h-4 text-[#0F6B4F]" /> আজকের নির্ধারিত পড়া
          </span>
          <span className="text-[10px] bg-[#C89B3C] text-white font-bold px-2 py-0.5 rounded">
            হালনাগাদ
          </span>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="p-2.5 rounded-xl bg-[#FAFAF7] border border-[#E5E7EB] flex justify-between items-center">
            <div>
              <p className="text-[11px] font-bold text-[#1F2933]">১. নতুন সবক (আজকের পাঠ)</p>
              <p className="text-[10px] text-[#6B7280]">সূরা মারইয়াম • আয়াত ১-১৫</p>
            </div>
            <span className="font-sans font-bold text-[#0F6B4F] bg-white border border-[#E5E7EB] px-2 py-1 rounded-lg">
              পৃষ্ঠা ৩০৫
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#FAFAF7] border border-[#E5E7EB] flex justify-between items-center">
            <div>
              <p className="text-[11px] font-bold text-[#1F2933]">২. সাত সবকি (রিভিশন)</p>
              <p className="text-[10px] text-[#6B7280]">পারা ১৫ (সম্পূর্ণ অংশ শুনানী)</p>
            </div>
            <span className="font-sans font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
              সম্পন্ন ✓
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#FAFAF7] border border-[#E5E7EB] flex justify-between items-center">
            <div>
              <p className="text-[11px] font-bold text-[#1F2933]">৩. আমপারা / মঞ্জিল দোহর</p>
              <p className="text-[10px] text-[#6B7280]">পারা ১ থেকে পারা ৩ পর্যন্ত</p>
            </div>
            <span className="font-sans font-bold text-[#C89B3C] bg-[#FAF4E6] border border-[#C89B3C]/30 px-2 py-1 rounded-lg">
              বাকি আছে
            </span>
          </div>
        </div>
      </div>

      {/* পাঠ্যসূচি ও রুটিন কম্পোনেন্ট */}
      <StudentRoutine />
    </div>
  );
};