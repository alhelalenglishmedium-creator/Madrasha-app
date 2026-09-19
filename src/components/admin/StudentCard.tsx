'use client';

import React from 'react';
import { Phone, Edit, CreditCard, Sparkles } from 'lucide-react';
import type { Student } from '@/types/database.types';

interface StudentCardProps {
  student: Student;
  onEdit?: (student: Student) => void;
  onCollectFee?: (student: Student) => void;
}

export function StudentCard({ student, onEdit, onCollectFee }: StudentCardProps) {
  const initial = (student.fullNameBangla || student.fullName || 'ছা').charAt(0);

  return (
    <div className="bg-white rounded-[26px] border border-[#E7F0EB] p-4 shadow-2xs hover:border-[#BBE3D3] transition-all space-y-3.5">
      {/* কার্ড হেডার: নাম, রোল ও ব্যাজ */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* ইমেজ স্টাইলের রাউন্ডেড স্কয়ার অ্যাভাটার */}
          <div className="h-12 w-12 rounded-2xl bg-[#008955] text-white font-bold text-base flex items-center justify-center shrink-0 shadow-xs">
            {initial}
          </div>

          <div>
            {/* রোল / তালিবুল ইলম স্টাইল ট্যাগ */}
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-flex items-center gap-1 bg-[#FEF3C7] text-[#92400E] text-[10px] font-bold px-2 py-0.5 rounded-full">
                <Sparkles size={10} />
                <span>রোল: {student.rollNo || '০'}</span>
              </span>
              <span className="text-[10px] text-[#9CA3AF] font-medium">
                আইডি: {student.admissionNo}
              </span>
            </div>

            <h3 className="text-sm font-bold text-[#1F2937] leading-snug">
              {student.fullNameBangla || student.fullName}
            </h3>
            
            <p className="text-[11px] text-[#008955] font-semibold mt-0.5">
              {student.className} {student.section ? `(শাখা-${student.section})` : ''}
            </p>
          </div>
        </div>

        {/* স্ট্যাটাস চিপস */}
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
            student.status === 'active'
              ? 'bg-[#E7F7EF] text-[#008955]'
              : 'bg-[#F3F4F6] text-[#6B7280]'
          }`}
        >
          {student.status === 'active' ? 'নিয়মিত' : 'আর্কাইভ'}
        </span>
      </div>

      {/* ইনফো স্ট্রিপ: পিতার নাম ও ফি */}
      <div className="grid grid-cols-2 gap-2 bg-[#F9FBFA] border border-[#EDF4F0] rounded-[18px] p-2.5 text-xs">
        <div>
          <span className="text-[10px] text-[#9CA3AF] block font-medium">পিতার নাম</span>
          <span className="font-bold text-[#374151] truncate block mt-0.5">
            {student.fatherName || 'তথ্য নেই'}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-[#9CA3AF] block font-medium">মাসিক প্রদেয়</span>
          <span className="font-extrabold text-[#008955] block mt-0.5">
            {student.monthlyFee?.toLocaleString('bn-BD') || '০'} ৳
          </span>
        </div>
      </div>

      {/* কুইক অ্যাকশন বাটনস */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        {student.phone ? (
          <a
            href={`tel:${student.phone}`}
            className="flex items-center gap-1.5 rounded-xl bg-[#F0FDF4] text-[#008955] border border-[#DCFCE7] px-3 py-2 text-xs font-bold hover:bg-[#DCFCE7] active:scale-95 transition"
          >
            <Phone size={13} className="fill-current" />
            <span>কল করুন</span>
          </a>
        ) : (
          <span className="text-[11px] text-[#9CA3AF] italic px-1">ফোন নম্বর নেই</span>
        )}

        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(student)}
              className="flex items-center gap-1 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#4B5563] hover:bg-[#F3F4F6] active:scale-95 transition"
            >
              <Edit size={13} />
              <span>এডিট</span>
            </button>
          )}

          {onCollectFee && (
            <button
              type="button"
              onClick={() => onCollectFee(student)}
              className="flex items-center gap-1.5 rounded-xl bg-[#008955] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#007347] active:scale-95 transition"
            >
              <CreditCard size={13} />
              <span>ফি নিন</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}