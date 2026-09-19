'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  BookOpen,
  UserPlus,
  User,
  Phone,
  X,
  Edit,
  ChevronRight,
  Trash2,
  AlertTriangle,
  UserCheck,
  Users,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { localDb } from '@/db/localDb';
import { supabase } from '@/lib/supabaseClient';
import type { Student, Staff } from '@/types/database.types';
import { AdminBottomNav } from '@/components/admin/AdminBottomNav';
import { StudentFormModal } from '@/components/admin/StudentFormModal';

export default function StudentsDirectoryPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachersList, setTeachersList] = useState<Staff[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('সব');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // মোডাল ও অ্যাকশন স্টেট
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // শিক্ষক অ্যাসাইনমেন্ট মোডাল স্টেট (Single & Bulk)
  const [assigningSingleStudent, setAssigningSingleStudent] = useState<Student | null>(null);
  const [bulkAssignClass, setBulkAssignClass] = useState<string | null>(null);
  const [selectedTeacherForAssign, setSelectedTeacherForAssign] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  // ডায়নামিক বিভাগ তালিকা (ডাইনামিকালি সব ইউনিক বিভাগ বের করা)
  const dynamicClassList = useMemo(() => {
    const classSet = new Set<string>(['প্লে', 'নার্সারি', 'হিফজ']);

    const savedClasses = typeof window !== 'undefined' ? localStorage.getItem('madrasa_custom_classes') : null;
    if (savedClasses) {
      try {
        const parsed = JSON.parse(savedClasses);
        if (Array.isArray(parsed)) {
          parsed.forEach((c) => c && typeof c === 'string' && classSet.add(c.trim()));
        }
      } catch (e) {}
    }

    students.forEach((s) => {
      if (s.className && s.className.trim()) {
        classSet.add(s.className.trim());
      }
    });

    return ['সব', ...Array.from(classSet)];
  }, [students]);

  // শিক্ষকদের তালিকা লোড
  const loadTeachers = async () => {
    try {
      const { data: cloudStaff } = await supabase.from('staff').select('*');
      if (cloudStaff && cloudStaff.length > 0) {
        const mapped: Staff[] = cloudStaff.map((s: any) => ({
          id: s.id,
          teacher_uid: s.teacher_uid || s.id,
          fullName: s.full_name || s.fullName || s.name || '',
          phone: s.phone || '',
          email: s.email || '',
          role: s.role || 'teacher',
          designation: s.designation || 'শিক্ষক',
          assignedClass: s.assigned_class || '',
          isClassTeacher: s.is_class_teacher ?? false,
          monthlySalary: Number(s.monthly_salary || 0),
          photoUrl: s.photo_url || '',
          joiningDate: s.joining_date || s.joiningDate || new Date().toISOString().split('T')[0],
          status: s.status || 'active',
          createdAt: s.created_at || new Date().toISOString(),
          updatedAt: s.updated_at || new Date().toISOString(),
        }));
        setTeachersList(mapped);
      } else {
        const localStaff = await localDb.staff.toArray();
        setTeachersList(localStaff);
      }
    } catch (e) {
      console.warn('Teacher fetch warning:', e);
    }
  };

  // শিক্ষার্থী তালিকা লোড
  const loadStudents = async () => {
    try {
      setIsLoading(true);

      const { data: supaStudents, error: supaErr } = await supabase
        .from('students')
        .select('*');

      if (!supaErr && supaStudents) {
        const formattedStudents: Student[] = supaStudents.map((s: any) => ({
          id: s.id,
          admissionNo: s.admission_no || s.id,
          fullName: s.full_name || s.fullName || s.name || '',
          fullNameBangla: s.full_name_bangla || s.fullNameBangla || s.full_name || s.name || '',
          className: s.class_name || s.className || 'প্লে',
          rollNo: String(s.roll || s.roll_no || ''),
          fatherName: s.father_name || s.fatherName || '',
          phone: s.phone || '',
          guardianContacts: Array.isArray(s.guardian_contacts)
            ? s.guardian_contacts
            : (typeof s.guardian_contacts === 'string'
                ? (function () { try { return JSON.parse(s.guardian_contacts); } catch (e) { return []; } })()
                : (s.phone ? [{ id: 'c_1', title: 'অভিভাবক', phone: s.phone }] : [])),
          address: s.address || '',
          bloodGroup: s.blood_group || s.bloodGroup || '',
          monthlyFee: Number(s.monthly_fee || s.monthlyFee || 0),
          photoUrl: s.photo_url || s.photoUrl || '',
          assigned_teacher_uid: s.assigned_teacher_uid || '',
          assigned_teacher_name: s.assigned_teacher_name || '',
          status: s.status || 'active',
          createdAt: s.created_at || s.createdAt,
          updatedAt: s.updated_at || s.updatedAt,
        }));

        await localDb.students.clear();
        if (formattedStudents.length > 0) {
          await localDb.students.bulkAdd(formattedStudents);
        }
        setStudents(formattedStudents);
      } else {
        const localData = await localDb.students.where('status').equals('active').toArray();
        localData.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
        setStudents(localData);
      }
    } catch (err) {
      console.error('ডাটা লোড ত্রুটি:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
    loadTeachers();

    // Supabase Realtime সাবস্ক্রিপশন
    const channel = supabase
      .channel('realtime_students_and_staff')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students' },
        () => loadStudents()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff' },
        () => loadTeachers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // শিক্ষার্থী ডিলিট নিশ্চিতকরণ হ্যান্ডলার
  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    try {
      setIsDeleting(true);

      const { error: supaErr } = await supabase
        .from('students')
        .delete()
        .eq('id', studentToDelete.id);

      if (supaErr) console.warn('Supabase Delete Warning:', supaErr.message);

      await localDb.students.delete(studentToDelete.id);

      setStudents((prev) => prev.filter((s) => s.id !== studentToDelete.id));
      if (selectedStudent?.id === studentToDelete.id) {
        setSelectedStudent(null);
      }
      setStudentToDelete(null);
    } catch (err) {
      console.error('শিক্ষার্থী ডিলিট করতে সমস্যা:', err);
      alert('শিক্ষার্থী ডিলিট করতে সমস্যা হয়েছে।');
    } finally {
      setIsDeleting(false);
    }
  };

  // একক শিক্ষার্থীকে শিক্ষকের সাথে যুক্তকরণ (Single Student Assign)
  const handleAssignSingleStudent = async () => {
    if (!assigningSingleStudent) return;

    try {
      setIsAssigning(true);

      const selectedTeacherObj = teachersList.find(
        (t) => (t.teacher_uid || t.id) === selectedTeacherForAssign || t.id === selectedTeacherForAssign
      );

      const teacherName = selectedTeacherObj ? selectedTeacherObj.fullName : '';
      const teacherUidVal = selectedTeacherObj ? (selectedTeacherObj.teacher_uid || selectedTeacherObj.id) : '';

      // ১. সুপাবেস আপডেট
      const { error: supaErr } = await supabase
        .from('students')
        .update({
          assigned_teacher_uid: teacherUidVal,
          assigned_teacher_name: teacherName,
        })
        .eq('id', assigningSingleStudent.id);

      if (supaErr) {
        console.warn('Supabase assign teacher warning:', supaErr.message);
      }

      // ২. লোকালডিবি আপডেট
      await localDb.students.update(assigningSingleStudent.id, {
        assigned_teacher_uid: teacherUidVal,
        assigned_teacher_name: teacherName,
      } as any);

      await loadStudents();
      setAssigningSingleStudent(null);
      setSelectedTeacherForAssign('');
    } catch (err: any) {
      console.error('Single assign error:', err);
      alert('শিক্ষক যুক্ত করতে সমস্যা হয়েছে: ' + (err.message || ''));
    } finally {
      setIsAssigning(false);
    }
  };

  // বিভাগের সকল শিক্ষার্থীকে একসাথে শিক্ষক যুক্তকরণ (Bulk Class Assign)
  const handleBulkAssignClass = async () => {
    if (!bulkAssignClass) return;

    const targetClass = bulkAssignClass;
    const selectedTeacherObj = teachersList.find(
      (t) => (t.teacher_uid || t.id) === selectedTeacherForAssign || t.id === selectedTeacherForAssign
    );

    if (!selectedTeacherObj) {
      alert('অনুগ্রহ করে একজন শিক্ষক নির্বাচন করুন!');
      return;
    }

    try {
      setIsAssigning(true);

      const teacherName = selectedTeacherObj.fullName;
      const teacherUidVal = selectedTeacherObj.teacher_uid || selectedTeacherObj.id;

      const targetStudents = students.filter((s) => s.className === targetClass);
      if (targetStudents.length === 0) {
        alert(`${targetClass} বিভাগে কোনো শিক্ষার্থী পাওয়া যায়নি!`);
        return;
      }

      const ids = targetStudents.map((s) => s.id);

      // ১. সুপাবেসে বাল্ক আপডেট
      const { error: supaErr } = await supabase
        .from('students')
        .update({
          assigned_teacher_uid: teacherUidVal,
          assigned_teacher_name: teacherName,
        })
        .in('id', ids);

      if (supaErr) {
        console.warn('Bulk assign fallback update per student:', supaErr.message);
        for (const stdId of ids) {
          await supabase
            .from('students')
            .update({
              assigned_teacher_uid: teacherUidVal,
              assigned_teacher_name: teacherName,
            })
            .eq('id', stdId);
        }
      }

      // ২. লোকালডিবি-তে বাল্ক আপডেট
      for (const stdId of ids) {
        await localDb.students.update(stdId, {
          assigned_teacher_uid: teacherUidVal,
          assigned_teacher_name: teacherName,
        } as any);
      }

      await loadStudents();
      setBulkAssignClass(null);
      setSelectedTeacherForAssign('');
      alert(`${targetClass} বিভাগের ${ids.length} জন শিক্ষার্থীকে "${teacherName}"-এর সাথে যুক্ত করা হয়েছে!`);
    } catch (err: any) {
      console.error('Bulk assign error:', err);
      alert('সবাইকে শিক্ষক যুক্ত করতে সমস্যা হয়েছে: ' + (err.message || ''));
    } finally {
      setIsAssigning(false);
    }
  };

  // লাইভ সার্চ এবং শ্রেণি ফিল্টার
  const filteredStudents = useMemo(() => {
    return students.filter((std) => {
      const matchClass = selectedClass === 'সব' || std.className === selectedClass;
      if (!matchClass) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (std.fullNameBangla && std.fullNameBangla.toLowerCase().includes(q)) ||
        (std.fullName && std.fullName.toLowerCase().includes(q)) ||
        (std.rollNo && std.rollNo.toString().includes(q)) ||
        (std.phone && std.phone.includes(q)) ||
        (std.address && std.address.toLowerCase().includes(q)) ||
        (std.assigned_teacher_name && std.assigned_teacher_name.toLowerCase().includes(q))
      );
    });
  }, [students, selectedClass, searchQuery]);

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

      {/* মোবাইল ফ্রেম কনটেইনার */}
      <div className="relative w-full max-w-[430px] bg-[#F7FBF9] h-full sm:h-[870px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-[#DFECE5]">
        
        {/* ================= ১. টপ হেডার বার ================= */}
        <header className="shrink-0 bg-[#F7FBF9] px-4 pt-4 pb-2 z-30 flex items-center justify-between border-b border-[#E7F0EB]">
          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard"
              className="h-10 w-10 rounded-2xl bg-white border border-[#E5EFEA] flex items-center justify-center text-[#4B5563] shadow-xs active:scale-95 transition"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-sm font-bold text-[#1F2937] leading-none">শিক্ষার্থী তালিকা</h1>
              <p className="text-[10px] text-[#008955] font-bold mt-1 bg-[#E7F6ED] px-2 py-0.5 rounded-full inline-block font-sans">
                মোট শিক্ষার্থী: {filteredStudents.length} জন
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingStudent(null);
              setIsFormModalOpen(true);
            }}
            className="h-10 w-10 rounded-2xl bg-[#008955] text-white flex items-center justify-center shadow-xs active:scale-95 transition hover:bg-[#007548]"
            title="নতুন ছাত্র ভর্তি"
          >
            <UserPlus size={18} />
          </button>
        </header>

        {/* ================= ২. সার্চ বার, ডায়নামিক শ্রেণি ফিল্টার ও বাল্ক অ্যাসাইন ================= */}
        <div className="px-4 pt-3 pb-2 space-y-2.5 shrink-0 bg-[#F7FBF9] z-20">
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder={`${selectedClass === 'সব' ? 'নাম, রোল, ফোন বা শিক্ষক' : selectedClass + ' শ্রেণির ছাত্র'} দিয়ে খুঁজুন...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D9E7E0] rounded-2xl text-xs font-semibold text-slate-800 shadow-2xs focus:border-[#008955] focus:outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* ডায়নামিক বিভাগ ট্যাবসমূহ */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {dynamicClassList.map((cls) => {
                const isSelected = selectedClass === cls;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setSelectedClass(cls)}
                    className={`min-w-[65px] py-1.5 px-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1 shrink-0 ${
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

            {/* "সবাইকে শিক্ষক যুক্ত করুন" (Bulk Add Button) */}
            <button
              type="button"
              onClick={() => {
                const targetCls = selectedClass === 'সব' ? dynamicClassList[1] || 'প্লে' : selectedClass;
                setBulkAssignClass(targetCls);
                setSelectedTeacherForAssign('');
              }}
              className="py-1.5 px-2.5 rounded-2xl bg-amber-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs hover:bg-amber-600 active:scale-95 transition shrink-0 border border-amber-400/30"
              title="এই বিভাগের সকল শিক্ষার্থীকে একসাথে শিক্ষক যুক্ত করুন"
            >
              <Users size={12} />
              <span>Add All</span>
            </button>
          </div>
        </div>

        {/* ================= ৩. শিক্ষার্থী তালিকা ================= */}
        <main className="flex-1 overflow-y-auto overscroll-contain no-scrollbar px-4 py-2 space-y-2.5">
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-3 border-[#008955] border-t-transparent"></div>
              <p className="mt-2 text-xs font-medium text-[#9CA3AF]">তালিকা লোড হচ্ছে...</p>
            </div>
          ) : filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <div
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className="group relative bg-white border border-[#E1EDE6] rounded-2xl p-2.5 flex items-center justify-between shadow-2xs hover:border-[#008955] hover:shadow-xs active:scale-[0.99] transition cursor-pointer"
              >
                {/* প্রোফাইল ইমেজ ও তথ্য */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-[#E7F6ED] to-[#FEF3C7] border border-[#D9E7E0] overflow-hidden flex items-center justify-center text-[#008955]">
                      {student.photoUrl ? (
                        <img
                          src={student.photoUrl}
                          alt={student.fullNameBangla || student.fullName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User size={22} className="text-[#008955]/70" />
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 bg-[#008955] text-white text-[9px] font-black px-1.5 py-0.2 rounded-md border border-white font-sans">
                      {student.rollNo || '০'}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                      {student.fullNameBangla || student.fullName}
                    </h4>

                    {/* অ্যাসাইন করা শিক্ষকের ব্যাজ */}
                    {student.assigned_teacher_name ? (
                      <p className="text-[9px] font-bold text-[#008955] truncate mt-0.5 flex items-center gap-1">
                        <UserCheck size={11} className="text-[#008955]" />
                        <span>উস্তাদ: {student.assigned_teacher_name}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        পিতা: {student.fatherName || 'তথ্য নেই'}
                      </p>
                    )}

                    <p className="text-[9px] text-slate-400 font-sans mt-0.5">
                      {student.phone ? `ফোন: ${student.phone}` : 'মোবাইল নেই'}
                    </p>
                  </div>
                </div>

                {/* শ্রেণি, শিক্ষক যুক্ত (Single Add Button) এবং অ্যাকশন */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[10px] font-bold text-[#008955] bg-[#E7F6ED] px-2 py-0.5 rounded-lg border border-[#CDE9DC]">
                    {student.className || 'সাধারণ'}
                  </span>

                  {/* সিঙ্গেল "Add" শিক্ষক যুক্তকরণ বাটন */}
                  <button
                    type="button"
                    onClick={() => {
                      setAssigningSingleStudent(student);
                      setSelectedTeacherForAssign(student.assigned_teacher_uid || '');
                    }}
                    className={`h-7 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 transition active:scale-90 border ${
                      student.assigned_teacher_name
                        ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                        : 'bg-[#E7F6ED] text-[#008955] border-[#BBE3D3] hover:bg-[#008955] hover:text-white'
                    }`}
                    title="শিক্ষকের সাথে যুক্ত করুন"
                  >
                    <UserCheck size={12} />
                    <span>{student.assigned_teacher_name ? 'চেঞ্জ' : 'Add'}</span>
                  </button>

                  {/* সরাসরি ডিলিট বাটন */}
                  <button
                    type="button"
                    onClick={() => setStudentToDelete(student)}
                    className="h-7 w-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition active:scale-90 border border-rose-100"
                    title="শিক্ষার্থী বাতিল করুন"
                  >
                    <Trash2 size={13} />
                  </button>

                  <div 
                    onClick={() => setSelectedStudent(student)}
                    className="h-7 w-7 rounded-xl bg-[#F7FBF9] text-slate-400 group-hover:text-[#008955] flex items-center justify-center transition cursor-pointer"
                  >
                    <ChevronRight size={15} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-[#DFECE5] bg-white p-8 text-center shadow-2xs mt-4">
              <User size={30} className="mx-auto text-slate-300" />
              <p className="mt-2 text-xs font-bold text-slate-700">কোনো শিক্ষার্থী পাওয়া যায়নি</p>
              <p className="mt-0.5 text-[10px] text-slate-400">ফিল্টার বা সার্চ পরিবর্তন করে চেষ্টা করুন।</p>
            </div>
          )}
        </main>

        {/* ================= ৪. সিঙ্গেল স্টুডেন্ট টিচার অ্যাসাইন মোডাল ================= */}
        {assigningSingleStudent && (
          <div
            onClick={() => !isAssigning && setAssigningSingleStudent(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[340px] rounded-3xl bg-white p-5 shadow-2xl border border-[#DFECE5]"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-[#E7F6ED] text-[#008955] flex items-center justify-center">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">শিক্ষক যুক্ত করুন</h3>
                    <p className="text-[10px] text-[#008955] font-medium">শিক্ষার্থীকে ওস্তাদের সাথে কানেক্ট করুন</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAssigningSingleStudent(null)}
                  className="h-7 w-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-xs font-bold text-slate-800">
                  {assigningSingleStudent.fullNameBangla || assigningSingleStudent.fullName}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span>{assigningSingleStudent.className} বিভাগ</span>
                  <span>•</span>
                  <span>রোল: {assigningSingleStudent.rollNo || '০১'}</span>
                </div>
                {assigningSingleStudent.assigned_teacher_name && (
                  <p className="text-[10px] font-bold text-[#008955] pt-1">
                    বর্তমান উস্তাদ: {assigningSingleStudent.assigned_teacher_name}
                  </p>
                )}
              </div>

              <div className="mt-3 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-700 block">ওস্তাদ নির্বাচন করুন *</label>
                <select
                  value={selectedTeacherForAssign}
                  onChange={(e) => setSelectedTeacherForAssign(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-[#F7FBF9] px-3 py-2 text-xs font-bold text-slate-800 focus:border-[#008955] focus:outline-none cursor-pointer"
                >
                  <option value="">কোনো শিক্ষক যুক্ত করতে চান না (Unassign)</option>
                  {teachersList.map((tc) => (
                    <option key={tc.id} value={tc.teacher_uid || tc.id}>
                      {tc.fullName} ({tc.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isAssigning}
                  onClick={() => setAssigningSingleStudent(null)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 hover:bg-slate-100 transition active:scale-95"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  disabled={isAssigning}
                  onClick={handleAssignSingleStudent}
                  className="px-4 py-2 rounded-xl bg-[#008955] hover:bg-[#007548] text-white text-xs font-bold shadow-xs active:scale-95 transition disabled:opacity-50 flex items-center gap-1"
                >
                  {isAssigning ? 'সেভ হচ্ছে...' : 'নিশ্চিত করুন'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= ৫. বাল্ক ক্লাস টিচার অ্যাসাইন মোডাল (Add All) ================= */}
        {bulkAssignClass && (
          <div
            onClick={() => !isAssigning && setBulkAssignClass(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[340px] rounded-3xl bg-white p-5 shadow-2xl border border-amber-300"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-amber-100">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Users size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">সবাইকে শিক্ষক যুক্ত করুন (Add All)</h3>
                    <p className="text-[10px] text-amber-600 font-medium">{bulkAssignClass} বিভাগের সকল ছাত্র</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkAssignClass(null)}
                  className="h-7 w-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="mt-3 p-3 bg-amber-50/60 rounded-2xl border border-amber-200/60 space-y-1">
                <p className="text-xs font-bold text-slate-800">
                  বিভাগ: <span className="text-[#008955]">{bulkAssignClass}</span>
                </p>
                <p className="text-[10px] text-slate-600">
                  মোট শিক্ষার্থী: <span className="font-bold text-slate-900">{students.filter((s) => s.className === bulkAssignClass).length} জন</span>
                </p>
              </div>

              <div className="mt-3 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-700 block">দায়িত্বপ্রাপ্ত ওস্তাদ নির্বাচন করুন *</label>
                <select
                  value={selectedTeacherForAssign}
                  onChange={(e) => setSelectedTeacherForAssign(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-[#F7FBF9] px-3 py-2 text-xs font-bold text-slate-800 focus:border-amber-500 focus:outline-none cursor-pointer"
                  required
                >
                  <option value="">ওস্তাদ নির্বাচন করুন</option>
                  {teachersList.map((tc) => (
                    <option key={tc.id} value={tc.teacher_uid || tc.id}>
                      {tc.fullName} ({tc.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isAssigning}
                  onClick={() => setBulkAssignClass(null)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 hover:bg-slate-100 transition active:scale-95"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  disabled={isAssigning}
                  onClick={handleBulkAssignClass}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs active:scale-95 transition disabled:opacity-50 flex items-center gap-1"
                >
                  {isAssigning ? 'যুক্ত হচ্ছে...' : 'সবাইকে যুক্ত করুন (Add All)'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= ৬. স্টুডেন্ট ইনফো মোডাল ================= */}
        {selectedStudent && (
          <div 
            onClick={() => setSelectedStudent(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs animate-in fade-in"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[340px] rounded-3xl rounded-tr-[40px] rounded-bl-[40px] p-[2.5px] shadow-2xl overflow-hidden"
            >
              <div className="emerald-royal-glow" />

              <div className="relative z-10 bg-white rounded-[1.4rem] rounded-tr-[38px] rounded-bl-[38px] px-4 py-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-[10px] font-bold text-[#008955] bg-[#E7F6ED] px-2.5 py-0.5 rounded-full border border-[#BBE3D3]">
                    স্টুডেন্ট ইনফো
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="h-7 w-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="text-center mt-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#008955] bg-[#E7F6ED] px-3 py-0.5 rounded-full border border-[#BBE3D3]">
                    <BookOpen size={11} />
                    <span>{selectedStudent.className || 'সাধারণ'} বিভাগ</span>
                  </span>
                </div>

                <div className="mt-2 flex justify-center">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl rounded-tr-3xl rounded-bl-3xl bg-gradient-to-tr from-[#E7F6ED] to-[#FEF3C7] flex items-center justify-center border-2 border-white shadow-xs overflow-hidden">
                      {selectedStudent.photoUrl ? (
                        <img
                          src={selectedStudent.photoUrl}
                          alt={selectedStudent.fullNameBangla || selectedStudent.fullName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User size={30} className="text-[#008955]/70" />
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-[#008955] text-white text-[10px] font-black px-1.5 py-0.2 rounded-md shadow-xs border border-white font-sans">
                      রোল: {selectedStudent.rollNo || '০'}
                    </div>
                  </div>
                </div>

                <div className="text-center mt-1.5">
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    {selectedStudent.fullNameBangla || selectedStudent.fullName}
                  </h3>
                  {selectedStudent.fullNameBangla && selectedStudent.fullName && (
                    <p className="text-[10px] text-slate-400 font-medium">{selectedStudent.fullName}</p>
                  )}
                </div>

                <div className="mt-2.5 space-y-1.5 text-[11px] border-t border-slate-100 pt-2">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400 font-medium">দায়িত্বপ্রাপ্ত উস্তাদ:</span>
                    <span className="font-bold text-[#008955]">
                      {selectedStudent.assigned_teacher_name || 'যুক্ত করা হয়নি'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400 font-medium">পিতার নাম:</span>
                    <span className="font-bold text-slate-800">{selectedStudent.fatherName || 'তথ্য নেই'}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400 font-medium">ঠিকানা:</span>
                    <span className="font-bold text-slate-800 truncate max-w-[160px] text-right">
                      {selectedStudent.address || 'তথ্য নেই'}
                    </span>
                  </div>

                  {/* যোগাযোগ (অভিভাবকের একাধিক নম্বরসহ) */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-slate-400 font-medium block">অভিভাবকের নম্বরসমূহ:</span>
                    {selectedStudent.guardianContacts && selectedStudent.guardianContacts.length > 0 ? (
                      <div className="space-y-1">
                        {selectedStudent.guardianContacts.map((c, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-[#F7FBF9] px-2.5 py-1 rounded-xl border border-[#E1EDE6]">
                            <span className="text-[10px] font-bold text-[#008955] bg-[#E7F6ED] px-1.5 py-0.2 rounded border border-[#CDEEDE]">
                              {c.title || 'অভিভাবক'}
                            </span>
                            <span className="font-bold font-sans text-slate-800 text-xs">{c.phone}</span>
                            {c.phone ? (
                              <a
                                href={`tel:${c.phone}`}
                                className="inline-flex items-center gap-1 font-bold text-[#008955] bg-white px-2 py-0.5 rounded-lg border border-[#BBE3D3] hover:bg-[#D3EFE0] active:scale-95 transition"
                              >
                                <Phone size={10} />
                                <span>কল</span>
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400">নেই</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400 font-medium">যোগাযোগ:</span>
                        {selectedStudent.phone ? (
                          <a
                            href={`tel:${selectedStudent.phone}`}
                            className="inline-flex items-center gap-1 font-bold text-[#008955] bg-[#E7F6ED] px-2 py-0.5 rounded-lg border border-[#BBE3D3] hover:bg-[#D3EFE0] active:scale-95 transition"
                          >
                            <Phone size={10} />
                            <span>কল করুন</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">নম্বর নেই</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-400 font-medium">মাসিক ফি:</span>
                    <span className="font-black text-slate-900 font-sans">
                      ৳ {selectedStudent.monthlyFee || '০'}
                    </span>
                  </div>
                </div>

                {/* অ্যাকশন বাটনসমূহ (এডিট, শিক্ষক যুক্ত ও ডিলিট) */}
                <div className="mt-3 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const studentToEdit = selectedStudent;
                      setSelectedStudent(null);
                      setEditingStudent(studentToEdit);
                      setIsFormModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-[#008955] py-2 text-xs font-bold text-white shadow-xs hover:bg-[#007548] active:scale-95 transition"
                  >
                    <Edit size={13} />
                    <span>সম্পাদনা</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const toDelete = selectedStudent;
                      setSelectedStudent(null);
                      setStudentToDelete(toDelete);
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 py-2 text-xs font-bold hover:bg-rose-100 active:scale-95 transition"
                  >
                    <Trash2 size={13} />
                    <span>বাতিল করুন</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= ৭. ডিলিট নিশ্চিতকরণ ডায়ালগ ================= */}
        {studentToDelete && (
          <div
            onClick={() => !isDeleting && setStudentToDelete(null)}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[320px] rounded-3xl bg-white p-5 text-center shadow-2xl border border-rose-100"
            >
              <div className="mx-auto h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                <AlertTriangle size={24} />
              </div>

              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                শিক্ষার্থী মুছে ফেলতে চান?
              </h3>
              <p className="text-xs font-semibold text-slate-800 mt-1">
                {studentToDelete.fullNameBangla || studentToDelete.fullName}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {studentToDelete.className} বিভাগ • রোল: {studentToDelete.rollNo}
              </p>
              <p className="text-[10px] text-rose-500 mt-2 bg-rose-50 p-2 rounded-xl border border-rose-100">
                মুছে ফেললে শিক্ষার্থী সম্পর্কিত সকল রেকর্ড ক্লাউড ও লোকাল মেমোরি থেকে স্থায়ীভাবে বাদ যাবে।
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setStudentToDelete(null)}
                  className="rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 active:scale-95 transition disabled:opacity-50"
                >
                  না, রাখুন
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 active:scale-95 transition disabled:opacity-50"
                >
                  {isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, ডিলিট করুন'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= ৮. তথ্য সম্পাদনা মোডাল ================= */}
        <StudentFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingStudent(null);
          }}
          initialData={editingStudent}
          onSave={async (studentData) => {
            const primaryPhone = studentData.phone || (studentData.guardianContacts?.[0]?.phone || '');

            if (editingStudent) {
              const oldOriginalUid = editingStudent.id; // যেমন: 'UID-2026-11' বা '335'
              const newCustomUid = (studentData.admissionNo || editingStudent.admissionNo || oldOriginalUid).trim();

              const fullPayload: any = {
                id: newCustomUid, // প্রাইমারি কি কলাম 'id' নতুন UID-তে আপডেট হবে
                admission_no: newCustomUid,
                name: studentData.fullNameBangla || studentData.fullName,
                full_name: studentData.fullName || studentData.fullNameBangla,
                full_name_bangla: studentData.fullNameBangla || studentData.fullName,
                class_name: studentData.className,
                roll: String(studentData.rollNo || '০১'),
                roll_no: String(studentData.rollNo || '০১'),
                phone: primaryPhone || null,
                guardian_contacts: studentData.guardianContacts || [],
                father_name: studentData.fatherName || null,
                address: studentData.address || null,
                blood_group: studentData.bloodGroup || null,
                monthly_fee: Number(studentData.monthlyFee || 0),
                photo_url: studentData.photoUrl || null,
                assigned_teacher_uid: (editingStudent as any).assigned_teacher_uid || null,
                assigned_teacher_name: (editingStudent as any).assigned_teacher_name || null,
                status: studentData.status || 'active',
                updated_at: new Date().toISOString(),
              };

              console.log("Updating Student Primary Key in Supabase. Old ID:", oldOriginalUid, "New UID:", newCustomUid);

              // ১. পুরোনো ID (oldOriginalUid) ধরে Supabase-এ 'id' কলাম নতুন UID-তে আপডেট
              let { data, error } = await supabase
                .from('students')
                .update(fullPayload)
                .eq('id', oldOriginalUid)
                .select();

              if (error) {
                console.error("Database Save Failed (Update by old id):", error);
              }

              // ২. যদি 0 rows আপডেট হয়, তবে admission_no ধরে আপডেট চেষ্টা
              if ((!data || data.length === 0) && oldOriginalUid) {
                console.warn("No rows updated by old id. Retrying update by admission_no:", oldOriginalUid);
                const retryRes = await supabase
                  .from('students')
                  .update(fullPayload)
                  .eq('admission_no', oldOriginalUid)
                  .select();

                data = retryRes.data;
                if (retryRes.error) {
                  error = retryRes.error;
                  console.error("Database Save Failed (Update by admission_no):", retryRes.error);
                }
              }

              // ৩. যদি পুরোনো কোনো রেকর্ড না পাওয়া যায়, তবে Upsert চেষ্টা
              if (!data || data.length === 0) {
                console.warn("Attempting upsert fallback for new ID:", newCustomUid);
                const upsertRes = await supabase
                  .from('students')
                  .upsert([fullPayload], { onConflict: 'id' })
                  .select();

                if (upsertRes.error) {
                  console.error("Database Save Failed (Upsert):", upsertRes.error);
                  throw new Error(`Supabase আপডেট ব্যর্থ হয়েছে: ${upsertRes.error.message || upsertRes.error.details || 'পারমিশন বা স্কিমা ত্রুটি'}`);
                }
              }

              // ৪. পুরোনো ID পরিবর্তন হয়ে থাকলে LocalDb থেকে পুরোনো রেকর্ড বাদ দিয়ে নতুন ID তে সেভ
              if (newCustomUid !== oldOriginalUid) {
                await localDb.students.delete(oldOriginalUid);
              }

              await localDb.students.put({
                ...editingStudent,
                ...studentData,
                id: newCustomUid,
                admissionNo: newCustomUid,
                phone: primaryPhone,
                updatedAt: new Date().toISOString(),
              });
            } else {
              // নতুন শিক্ষার্থী ভর্তি
              const stdUid = (studentData.admissionNo || `UID-2026-${String(studentData.rollNo || Math.floor(10 + Math.random() * 90)).padStart(2, '0')}`).trim();
              const newId = stdUid;

              const insertPayload: any = {
                id: newId,
                admission_no: stdUid,
                name: studentData.fullNameBangla || studentData.fullName,
                full_name: studentData.fullName,
                full_name_bangla: studentData.fullNameBangla,
                class_name: studentData.className,
                roll: String(studentData.rollNo || '০১'),
                roll_no: String(studentData.rollNo || '০১'),
                phone: primaryPhone || null,
                guardian_contacts: studentData.guardianContacts || [],
                father_name: studentData.fatherName || null,
                address: studentData.address || null,
                blood_group: studentData.bloodGroup || null,
                monthly_fee: Number(studentData.monthlyFee || 0),
                photo_url: studentData.photoUrl || null,
                status: 'active',
                updated_at: new Date().toISOString(),
              };

              const { error: insertErr } = await supabase
                .from('students')
                .upsert([insertPayload], { onConflict: 'id' })
                .select();

              if (insertErr) {
                console.error("Database Save Failed (Insert):", insertErr);
                throw new Error(`Supabase সেভ ব্যর্থ হয়েছে: ${insertErr.message}`);
              }

              await localDb.students.put({
                id: newId,
                ...studentData,
                admissionNo: stdUid,
                phone: primaryPhone,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }

            await loadStudents();
          }}
          onDelete={async (studentId) => {
            try {
              await supabase.from('students').delete().eq('id', studentId);
              await localDb.students.delete(studentId);
              setSelectedStudent(null);
              await loadStudents();
            } catch (err) {
              console.error('ডিলিট ত্রুটি:', err);
            }
          }}
        />

        {/* বটম নেভিগেশন বার */}
        <AdminBottomNav />

      </div>
    </div>
  );
}