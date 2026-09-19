'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  Sparkles,
  IdCard,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  BookOpen,
  Check,
  User,
} from 'lucide-react';
import { localDb } from '@/db/localDb';
import { supabase } from '@/lib/supabaseClient';
import type { Student } from '@/types/database.types';

interface UidManagementPageProps {
  isOpen: boolean;
  onClose: () => void;
  studentsList: Student[];
  onSuccess: (msg: string) => void;
}

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

export function UidManagementPage({
  isOpen,
  onClose,
  studentsList,
  onSuccess,
}: UidManagementPageProps) {
  const [activePortalTab, setActivePortalTab] = useState<'students' | 'teachers'>('students');
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('সকল বিভাগ');
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
      selectedClass === 'সকল বিভাগ' ||
      (std.className && std.className.toLowerCase().includes(selectedClass.toLowerCase()));

    const q = searchQuery.toLowerCase().trim();
    return (
      matchClass &&
      (!q ||
        (std.fullNameBangla && std.fullNameBangla.toLowerCase().includes(q)) ||
        (std.fullName && std.fullName.toLowerCase().includes(q)) ||
        (std.rollNo && String(std.rollNo).includes(q)) ||
        (std.phone && std.phone.includes(q)) ||
        (std.fatherName && std.fatherName.toLowerCase().includes(q)) ||
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

      // ১. Supabase-এ পুরোনো ID ধরে প্রাইমারি কি কলাম 'id' নতুন UID-তে আপডেট
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

      onSuccess(
        `${student.fullNameBangla || student.fullName}-এর ইউআইডি সংরক্ষিত: ${newCustomUid}`
      );
    } catch (err: any) {
      console.error("Database Save Failed:", err);
      alert('ইউআইডি সংরক্ষণে সমস্যা হয়েছে: ' + (err.message || 'সেভ করতে সমস্যা হয়েছে'));
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

      await localDb.staff.update(teacher.id, {
        id: newUid,
        teacher_uid: newUid,
        updatedAt: new Date().toISOString(),
      });

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
      } catch (e) {
        console.warn('Supabase teacher UID update warning:', e);
      }

      onSuccess(`${teacher.fullName}-এর UID আপডেট হয়েছে: ${newUid}`);
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
        
        {/* ১. হেডার */}
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
                স্মার্ট UID বরাদ্দ ও নিয়ন্ত্রণ
              </h1>
              <span className="inline-block text-[11px] font-bold text-[#008955] bg-[#E7F6ED] px-2.5 py-0.5 rounded-full mt-1 border border-[#D1EFE0]">
                {activePortalTab === 'students'
                  ? `শিক্ষার্থী: ${filteredStudents.length} জন`
                  : `শিক্ষক: ${filteredTeachers.length} জন`}
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

        {/* ২. সার্চ ও জামাত ফিল্টার */}
        <div className="px-5 py-2.5 space-y-2.5 shrink-0 bg-white border-b border-slate-100">
          <div className="relative">
            <Search size={17} className="absolute left-4 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activePortalTab === 'students'
                  ? 'ছাত্রের নাম, রোল, ফোন বা UID দিয়ে খুঁজুন...'
                  : 'শিক্ষকের নাম, পদবী, ফোন বা UID দিয়ে খুঁজুন...'
              }
              className="w-full text-xs font-medium bg-[#F8FAF9] border border-[#DFECE5] rounded-full pl-11 pr-4 py-2.5 focus:outline-none focus:border-[#008955] shadow-2xs transition text-slate-800 placeholder:text-slate-400 font-sans"
            />
          </div>

          {activePortalTab === 'students' && (
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
          )}
        </div>

        {/* ৩. মূল স্ক্রলেবল কনটেন্ট */}
        <main className="flex-1 overflow-y-auto overscroll-contain no-scrollbar px-4 py-3 space-y-3">
          
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
                          <p className="text-[10px] text-slate-500 truncate">{tc.designation} • {tc.assignedClass || 'সাধারণ'}</p>
                          <p className="text-[9.5px] font-sans text-slate-400">ফোন: {tc.phone || 'নেই'}</p>
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
              {filteredStudents.length > 0 ? (
                filteredStudents.map((std) => (
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
                      <span className="text-[11px] font-sans font-black text-[#008955] bg-[#E7F6ED] px-2.5 py-1 rounded-xl border border-[#BEE7D3]">
                        {std.admissionNo || 'বরাদ্দ নেই'}
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
                        onClick={() => {
                          const roll = std.rollNo ? String(std.rollNo).padStart(2, '0') : '01';
                          setEditingUids({ ...editingUids, [std.id]: `UID-2026-${roll}` });
                        }}
                        className="px-2 py-1.5 rounded-xl bg-purple-50 text-purple-700 text-[11px] font-bold border border-purple-200"
                        title="অটো সিরিয়াল"
                      >
                        <Sparkles size={12} />
                      </button>
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
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 bg-white rounded-3xl border border-dashed">
                  <p className="text-xs font-bold text-slate-600">কোনো শিক্ষার্থী পাওয়া যায়নি</p>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}