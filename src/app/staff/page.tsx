'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  ArrowLeft,
  Search,
  Phone,
  Edit,
  CheckCircle2,
  Briefcase,
  Plus,
  User,
  Award,
  BookOpen,
  Receipt,
  CircleDollarSign,
  X,
  History,
  Clock,
  Calendar,
  CreditCard,
  MessageSquare,
  Printer,
  ShieldCheck,
  AlertCircle,
  Check,
  DollarSign,
  Filter,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { localDb } from '@/db/localDb';
import { supabase } from '@/lib/supabaseClient';
import type { Staff } from '@/types/database.types';

import { TeacherFormModal } from '@/components/admin/TeacherFormModal';
import { AdminBottomNav } from '@/components/admin/AdminBottomNav';

export interface SalaryPayment {
  id: string;
  teacherId: string;
  amount: number;
  month: string;
  paymentDate: string;
  paymentTime?: string;
  paymentMethod: string;
  note?: string;
  createdAt: string;
}

// বাস্তবসম্মত প্রাথমিক ডেমো রেকর্ড
const DEMO_SALARY_HISTORY: SalaryPayment[] = [
  {
    id: 'REC-2026-0801',
    teacherId: 'all',
    amount: 15000,
    month: '2026-08',
    paymentDate: '০১-০৮-২০২৬',
    paymentTime: 'সকাল ১০:৩০ মিনিট',
    paymentMethod: 'নগদ ক্যাশ',
    note: 'মাসিক নির্ধারিত হাদিয়া সম্পূর্ণ পরিশোধ করা হয়েছে।',
    createdAt: new Date().toISOString(),
  },
];

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState<'directory' | 'salary'>('directory');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryPayment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // খতিয়ান ফিল্টারিং স্টেট
  const [selectedLedgerMonth, setSelectedLedgerMonth] = useState<string>(
    () => new Date().toISOString().slice(0, 7) // YYYY-MM
  );
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<'all' | 'paid' | 'due'>('all');

  // মোডাল ও আলাদা পেজ স্টেট
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [selectedTeacherForPage, setSelectedTeacherForPage] = useState<Staff | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<SalaryPayment | null>(null);

  // শিক্ষক ডিলিট স্টেট
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // হাদিয়া ফর্ম স্টেট
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isSalarySubmitting, setIsSalarySubmitting] = useState(false);
  const [salaryError, setSalaryError] = useState('');
  const [salaryForm, setSalaryForm] = useState({
    teacherId: '',
    amount: 15000,
    month: new Date().toISOString().slice(0, 7),
    paymentDate: new Date().toISOString().split('T')[0],
    paymentTime: 'সকাল ১০:৩০ মিনিট',
    paymentMethod: 'নগদ ক্যাশ',
    note: '',
  });

  const [successToast, setSuccessToast] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('madrasa_teacher_categories');
    if (saved) {
      try {
        setCustomCategories(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // ডাটা ফেচিং
  const loadData = async () => {
    try {
      setIsLoading(true);

      // ১. সুপাবেস ক্লাউড থেকে স্টাফ ও টিচার্স ডাটা ফেচ (দ্বিমুখী সেফ ফেচ)
      const { data: supaStaff, error: staffErr } = await supabase
        .from('staff')
        .select('*');

      const { data: supaTeachers } = await supabase
        .from('teachers')
        .select('*');

      let cloudStaffMap = new Map<string, Staff>();

      if (!staffErr && supaStaff && supaStaff.length > 0) {
        supaStaff.forEach((s: any) => {
          const sid = s.id || s.teacher_uid || `stf_${Date.now()}`;
          cloudStaffMap.set(sid, {
            id: sid,
            teacher_uid: s.teacher_uid || sid,
            fullName: s.full_name || s.fullName || s.name || '',
            phone: s.phone || '',
            email: s.email || '',
            role: s.role || 'teacher',
            designation: s.designation || 'শিক্ষক',
            assignedClass: s.assigned_class || s.assignedClass || '',
            isClassTeacher: s.is_class_teacher ?? s.isClassTeacher ?? false,
            monthlySalary: Number(s.monthly_salary || s.monthlySalary || 15000),
            photoUrl: s.photo_url || s.photoUrl || '',
            joiningDate: s.joining_date || s.joiningDate || new Date().toISOString().split('T')[0],
            status: s.status || 'active',
            createdAt: s.created_at || s.createdAt || new Date().toISOString(),
            updatedAt: s.updated_at || s.updatedAt || new Date().toISOString(),
          });
        });
      }

      if (supaTeachers && supaTeachers.length > 0) {
        supaTeachers.forEach((tc: any) => {
          if (!cloudStaffMap.has(tc.id)) {
            cloudStaffMap.set(tc.id, {
              id: tc.id,
              teacher_uid: tc.id,
              fullName: tc.name || tc.full_name || 'শিক্ষক',
              phone: tc.phone || '',
              email: '',
              role: 'teacher',
              designation: 'শিক্ষক',
              assignedClass: '',
              isClassTeacher: false,
              monthlySalary: 15000,
              photoUrl: tc.photo_url || '',
              joiningDate: tc.joining_date || tc.joiningDate || new Date().toISOString().split('T')[0],
              status: 'active',
              createdAt: tc.created_at || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        });
      }

      let formattedStaff: Staff[] = Array.from(cloudStaffMap.values());

      if (formattedStaff.length > 0) {
        await localDb.staff.clear();
        await localDb.staff.bulkAdd(formattedStaff);
        setStaffList(formattedStaff);
      } else {
        // ক্লাউড খালি হলে লোকালডিবি থেকে ফেচ ও ক্লাউডে ব্যাকগ্রাউন্ড অটো-সিঙ্ক
        const localStaff = await localDb.staff.toArray();
        if (localStaff && localStaff.length > 0) {
          setStaffList(localStaff);
          for (const stf of localStaff) {
            try {
              await supabase.from('staff').upsert([
                {
                  id: stf.id,
                  teacher_uid: stf.teacher_uid || stf.id,
                  full_name: stf.fullName,
                  phone: stf.phone || '',
                  designation: stf.designation || 'শিক্ষক',
                  monthly_salary: Number(stf.monthlySalary || 15000),
                  photo_url: stf.photoUrl || null,
                  status: stf.status || 'active',
                },
              ], { onConflict: 'id' });

              await supabase.from('teachers').upsert([
                {
                  id: stf.id,
                  name: stf.fullName,
                  phone: stf.phone || '',
                  photo_url: stf.photoUrl || null,
                },
              ], { onConflict: 'id' });
            } catch (syncErr) {
              console.warn('Sync local staff error:', syncErr);
            }
          }
        } else {
          setStaffList([]);
        }
      }

      // ২. সুপাবেস ক্লাউড থেকে হাদিয়া স্যালেরি ডাটা ফেচ
      const { data: supaSalaries, error: salaryErr } = await supabase
        .from('teacher_salaries')
        .select('*');

      if (!salaryErr && supaSalaries && supaSalaries.length > 0) {
        const mappedSalaries: SalaryPayment[] = supaSalaries.map((s: any) => ({
          id: s.id,
          teacherId: s.teacher_id,
          amount: Number(s.amount),
          month: s.month,
          paymentDate: s.payment_date,
          paymentTime: s.payment_time || 'সকাল ১০:৩০ মিনিট',
          paymentMethod: s.payment_method,
          note: s.note,
          createdAt: s.created_at,
        }));
        setSalaryRecords(mappedSalaries);
        localStorage.setItem('madrasa_cached_salaries', JSON.stringify(mappedSalaries));
      } else {
        const cached = localStorage.getItem('madrasa_cached_salaries');
        if (cached) {
          try {
            const parsed: SalaryPayment[] = JSON.parse(cached);
            setSalaryRecords(parsed);
          } catch (e) {
            console.warn('Read cached salaries error:', e);
          }
        } else {
          setSalaryRecords(DEMO_SALARY_HISTORY);
        }
      }
    } catch (err) {
      console.error('ডাটা লোড সমস্যা:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Supabase Realtime চ্যানেল (ডাটাবেজ থেকে রিয়েলটাইম ডিলিট/ইনসার্ট/আপডেট সিঙ্ক)
    const channel = supabase
      .channel('realtime_staff_and_salaries')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff' },
        () => {
          loadData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teachers' },
        () => {
          loadData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teacher_salaries' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
    loadData();
  };

  // শিক্ষক ডিলিট হ্যান্ডলার
  const handleConfirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    try {
      setIsDeleting(true);

      const { error: supaErr } = await supabase
        .from('staff')
        .delete()
        .eq('id', staffToDelete.id);

      if (supaErr) console.warn('Supabase Staff Delete Warning:', supaErr.message);

      try {
        await supabase
          .from('teachers')
          .delete()
          .eq('id', staffToDelete.id);
      } catch {}

      await localDb.staff.delete(staffToDelete.id);

      setStaffList((prev) => prev.filter((s) => s.id !== staffToDelete.id));
      if (selectedTeacherForPage?.id === staffToDelete.id) {
        setSelectedTeacherForPage(null);
      }
      setStaffToDelete(null);
      triggerToast('শিক্ষকের তথ্য সফলভাবে মুছে ফেলা হয়েছে!');
    } catch (err) {
      console.error('শিক্ষক ডিলিট করতে সমস্যা:', err);
      alert('শিক্ষক ডিলিট করতে সমস্যা হয়েছে।');
    } finally {
      setIsDeleting(false);
    }
  };

  // শিক্ষক সেভ / আপডেট হ্যান্ডলার
  const handleSaveStaff = async (formData: any) => {
    try {
      const now = new Date().toISOString();
      const isEditing = !!editingStaff;

      // ১. টার্গেট আইডি নির্ধারণ (এডিটিং মোডে ওই নির্দিষ্ট টিচারের ID ধরে রাখা)
      const targetId = (editingStaff?.id || formData.teacher_uid || formData.id || `T-${Math.floor(100 + Math.random() * 900)}`).trim();
      const teacherUid = (formData.teacher_uid || targetId).trim();

      // যদি এডিটের সময় আইডি বা ইউআইডি পরিবর্তন হয়, তবে পুরানো আইডি ক্লিনআপ
      if (editingStaff?.id && editingStaff.id !== targetId) {
        try {
          await supabase.from('staff').delete().eq('id', editingStaff.id);
          await localDb.staff.delete(editingStaff.id);
        } catch (delErr) {
          console.warn('Old staff ID cleanup warning:', delErr);
        }
      }

      const updatePayload: any = {
        teacher_uid: teacherUid,
        full_name: formData.fullName,
        phone: formData.phone || '',
        email: formData.email || null,
        role: formData.role || 'teacher',
        designation: formData.designation || 'শিক্ষক',
        assigned_class: formData.assignedClass || '',
        is_class_teacher: !!formData.isClassTeacher,
        monthly_salary: Number(formData.monthlySalary || 0),
        photo_url: formData.photoUrl || null,
        status: formData.status || 'active',
        updated_at: now,
      };

      let isSavedInSupabase = false;
      let supaErrorMessage = '';

      if (isEditing) {
        // =====================================
        // এডিটিং মোড: UPDATE (PATCH Request)
        // =====================================
        const { error: updateErr1 } = await supabase
          .from('staff')
          .update(updatePayload)
          .or(`id.eq.${targetId},teacher_uid.eq.${teacherUid},phone.eq.${editingStaff.phone}`);

        if (!updateErr1) {
          isSavedInSupabase = true;
        } else {
          supaErrorMessage = updateErr1.message;
          console.warn('Supabase staff update 1 failed:', updateErr1.message);

          const { error: updateErr2 } = await supabase
            .from('staff')
            .update({
              full_name: formData.fullName,
              phone: formData.phone || '',
              designation: formData.designation || 'শিক্ষক',
              monthly_salary: Number(formData.monthlySalary || 0),
              photo_url: formData.photoUrl || null,
              assigned_class: formData.assignedClass || '',
              is_class_teacher: !!formData.isClassTeacher,
              role: formData.role || 'teacher',
            })
            .or(`id.eq.${targetId},teacher_uid.eq.${teacherUid}`);

          if (!updateErr2) {
            isSavedInSupabase = true;
          } else {
            supaErrorMessage = updateErr2.message;
            console.warn('Supabase staff update 2 failed:', updateErr2.message);

            const { error: upsertErr } = await supabase
              .from('staff')
              .upsert([{ id: targetId, ...updatePayload }], { onConflict: 'id' });

            if (!upsertErr) {
              isSavedInSupabase = true;
            } else {
              supaErrorMessage = upsertErr.message;
              console.error('Supabase staff update 3 failed:', upsertErr.message);
            }
          }
        }
      } else {
        // =====================================
        // নতুন শিক্ষক যুক্তকরণ মোড: INSERT / UPSERT
        // =====================================
        const insertPayload = { id: targetId, created_at: now, ...updatePayload };

        const { error: insertErr1 } = await supabase
          .from('staff')
          .insert([insertPayload]);

        if (!insertErr1) {
          isSavedInSupabase = true;
        } else {
          supaErrorMessage = insertErr1.message;
          console.warn('Supabase staff insert 1 failed:', insertErr1.message);

          const { error: insertErr2 } = await supabase
            .from('staff')
            .upsert([insertPayload], { onConflict: 'id' });

          if (!insertErr2) {
            isSavedInSupabase = true;
          } else {
            supaErrorMessage = insertErr2.message;
            console.error('Supabase staff insert 2 failed:', insertErr2.message);
          }
        }
      }

      // যদি সুপাবেসে সেভ/আপডেট ব্যর্থ হয়, তবে সাইলেন্টলি ওভাররাইট করবে না—ইউজারকে স্পষ্ট এরর দেখাবে
      if (!isSavedInSupabase) {
        alert(`সুপাবেস ডেটাবেজ আপডেট ব্যর্থ হয়েছে!\n\nত্রুটি: ${supaErrorMessage}\n\nঅনুগ্রহ করে সুপাবেসের SQL Script টি রান করে UPDATE পারমিশন অন করুন।`);
        return;
      }

      // ৩. সুপাবেস - teachers টেবিলে সিঙ্ক
      try {
        await supabase
          .from('teachers')
          .upsert([
            {
              id: targetId,
              name: formData.fullName,
              phone: formData.phone || '',
              photo_url: formData.photoUrl || null,
              is_linked: false,
            },
          ], { onConflict: 'id' });
      } catch (tcErr) {
        console.warn('Supabase teachers table sync error:', tcErr);
      }

      // ৪. সুপাবেস - profiles টেবিলে সিঙ্ক
      try {
        await supabase
          .from('profiles')
          .update({
            full_name: formData.fullName,
            phone: formData.phone || null,
            avatar_url: formData.photoUrl || null,
          })
          .or(`identifier.eq.${teacherUid},identifier.eq.${targetId},phone.eq.${formData.phone}`);
      } catch (pErr) {
        console.warn('Supabase profiles update error:', pErr);
      }

      // ৫. লোকালডিবি-তে সেভ বা আপডেট
      const staffRecord: Staff = {
        id: targetId,
        teacher_uid: teacherUid,
        fullName: formData.fullName,
        phone: formData.phone || '',
        email: formData.email || '',
        role: formData.role || 'teacher',
        designation: formData.designation || 'শিক্ষক',
        assignedClass: formData.assignedClass || '',
        isClassTeacher: !!formData.isClassTeacher,
        joiningDate: formData.joiningDate || new Date().toISOString().split('T')[0],
        monthlySalary: Number(formData.monthlySalary || 0),
        photoUrl: formData.photoUrl || '',
        status: formData.status || 'active',
        createdAt: editingStaff?.createdAt || now,
        updatedAt: now,
      };

      await localDb.staff.put(staffRecord);

      triggerToast(editingStaff ? 'শিক্ষকের তথ্য সফলভাবে আপডেট হয়েছে!' : 'নতুন শিক্ষক সফলভাবে যোগ করা হয়েছে!');
      setEditingStaff(null);
      await loadData();
    } catch (err: any) {
      console.error('Save staff error:', err);
      alert('ত্রুটি: ' + (err.message || 'ডাটা সংরক্ষণ করা সম্ভব হয়নি'));
    }
  };

  // হাদিয়া ফর্ম ওপেন
  const openPaySalaryModal = (teacher?: Staff | null, targetMonth?: string) => {
    const currentTime = new Date().toLocaleTimeString('bn-BD', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const targetTeacher = teacher || staffList[0] || null;

    setSalaryForm({
      teacherId: targetTeacher?.id || (staffList.length > 0 ? staffList[0].id : ''),
      amount: Number(targetTeacher?.monthlySalary) || 12000,
      month: targetMonth || selectedLedgerMonth || new Date().toISOString().slice(0, 7),
      paymentDate: new Date().toISOString().split('T')[0],
      paymentTime: currentTime,
      paymentMethod: 'নগদ ক্যাশ',
      note: '',
    });
    setSalaryError('');
    setIsSalaryModalOpen(true);
  };

  // হাদিয়া পরিশোধ সাবমিট
  const handlePaySalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryForm.teacherId) {
      setSalaryError('অনুগ্রহ করে একজন শিক্ষক নির্বাচন করুন!');
      return;
    }

    try {
      setIsSalarySubmitting(true);
      setSalaryError('');

      const newSalaryId = `REC-${Date.now().toString().slice(-6)}`;
      const now = new Date().toISOString();

      const targetStaffId = salaryForm.teacherId;
      const teacherObj = staffList.find((s) => s.id === targetStaffId) ||
        (await localDb.staff.get(targetStaffId));

      const teacherName = teacherObj?.fullName || 'শিক্ষক';

      // ১. Foreign Key (teacher_id) মিসম্যাচ এড়াতে আগে Supabase staff টেবিলে শিক্ষক রেকর্ড নিশ্চিত করা
      try {
        await supabase.from('staff').insert([
          {
            id: targetStaffId,
            teacher_uid: teacherObj?.teacher_uid || targetStaffId,
            full_name: teacherName,
            name: teacherName,
            phone: teacherObj?.phone || '',
            designation: teacherObj?.designation || 'শিক্ষক',
            monthly_salary: Number(teacherObj?.monthlySalary || salaryForm.amount),
          },
        ]);
      } catch (stfErr) {
        console.warn('Pre-insert staff warning:', stfErr);
      }

      const newSalary: SalaryPayment = {
        id: newSalaryId,
        teacherId: targetStaffId,
        amount: Number(salaryForm.amount) || 0,
        month: salaryForm.month,
        paymentDate: salaryForm.paymentDate,
        paymentTime: salaryForm.paymentTime || '১০:৩০ AM',
        paymentMethod: salaryForm.paymentMethod,
        note: salaryForm.note || '',
        createdAt: now,
      };

      // ২. Supabase - teacher_salaries টেবিলে ইনসার্ট চেষ্টা (৩-স্তরের ফলব্যাক)
      let isSavedInSupabase = false;
      let lastSupaError = '';

      // চেষ্টা ১: ফুল পেলোড
      const { error: err1 } = await supabase.from('teacher_salaries').insert([
        {
          id: newSalary.id,
          teacher_id: targetStaffId,
          amount: newSalary.amount,
          month: newSalary.month,
          payment_date: newSalary.paymentDate,
          payment_time: newSalary.paymentTime,
          payment_method: newSalary.paymentMethod,
          note: newSalary.note,
          created_at: now,
        },
      ]);

      if (!err1) {
        isSavedInSupabase = true;
      } else {
        lastSupaError = err1.message;
        console.warn('Supabase salary insert 1 failed:', err1.message);

        // চেষ্টা ২: স্ট্যান্ডার্ড কলামসমূহ দিয়ে ইনসার্ট
        const { error: err2 } = await supabase.from('teacher_salaries').insert([
          {
            id: newSalary.id,
            teacher_id: targetStaffId,
            amount: newSalary.amount,
            month: newSalary.month,
            payment_date: newSalary.paymentDate,
            payment_method: newSalary.paymentMethod,
            note: newSalary.note,
          },
        ]);

        if (!err2) {
          isSavedInSupabase = true;
        } else {
          lastSupaError = err2.message;
          console.warn('Supabase salary insert 2 failed:', err2.message);

          // চেষ্টা ৩: মিনিমাল কলাম
          const { error: err3 } = await supabase.from('teacher_salaries').insert([
            {
              id: newSalary.id,
              teacher_id: targetStaffId,
              amount: newSalary.amount,
              month: newSalary.month,
              payment_date: newSalary.paymentDate,
            },
          ]);

          if (!err3) {
            isSavedInSupabase = true;
          } else {
            lastSupaError = err3.message;
            console.error('Supabase salary insert 3 failed:', err3.message);
          }
        }
      }

      // যদি সুপাবেসে সেভ ব্যর্থ হয়, তবে মোডাল বন্ধ হবে না এবং ইউজারকে স্পষ্ট এরর দেখাবে
      if (!isSavedInSupabase) {
        setSalaryError(`সুপাবেসে সেভ হয়নি: ${lastSupaError}। অনুগ্রহ করে দেওয়া SQL Script টি Supabase-এ রান করুন।`);
        return;
      }

      // ৩. localDb-তে সেভ
      try {
        if (localDb?.salaryPayments) {
          await localDb.salaryPayments.put({
            id: newSalary.id,
            staffId: targetStaffId,
            amount: newSalary.amount,
            month: newSalary.month,
            paymentDate: newSalary.paymentDate,
            paymentMethod: newSalary.paymentMethod as any,
            notes: newSalary.note,
            synced: true,
            createdAt: now,
          });
        }
      } catch (dbErr) {
        console.warn('LocalDb salary save warning:', dbErr);
      }

      // ৪. সুপাবেসে সফলভাবে সেভ হলে তবেই লোকাল স্টেট ও লোকাল স্টোরেজ আপডেট
      const updated = [newSalary, ...salaryRecords];
      setSalaryRecords(updated);
      localStorage.setItem('madrasa_cached_salaries', JSON.stringify(updated));

      setIsSalaryModalOpen(false);
      triggerToast('হাদিয়া সফলভাবে ডেটাবেজে সেভ হয়েছে!');
    } catch (err: any) {
      console.error('Pay salary error:', err);
      setSalaryError('হাদিয়া সংরক্ষণ করতে সমস্যা হয়েছে: ' + (err.message || ''));
    } finally {
      setIsSalarySubmitting(false);
    }
  };

  // নতুন পদবী/ক্যাটাগরি তৈরি
  const handleAddCategoryPrompt = () => {
    const name = window.prompt('নতুন ক্যাটাগরি বা পদবীর নাম লিখুন (যেমন: বাবুর্চি, খতিব, মুয়াজ্জিন):');
    if (name && name.trim()) {
      const trimmed = name.trim();
      const updated = Array.from(new Set([...customCategories, trimmed]));
      setCustomCategories(updated);
      localStorage.setItem('madrasa_teacher_categories', JSON.stringify(updated));
      setSelectedRole(trimmed);
    }
  };

  // ডাইনামিক ক্যাটাগরি ফিল্টার লিস্ট
  const allCategoryTabs = useMemo(() => {
    const existingRoles = Array.from(new Set(staffList.map((s) => s.role).filter(Boolean)));
    const existingDesignations = Array.from(new Set(staffList.map((s) => s.designation).filter(Boolean)));
    const combined = Array.from(new Set([...existingRoles, ...existingDesignations, ...customCategories]));

    return [
      { id: 'all', label: 'সকল ওস্তাদ' },
      ...combined.map((c) => ({
        id: c,
        label:
          c === 'teacher' ? 'শিক্ষক' :
          c === 'admin' ? 'প্রশাসন' :
          c === 'staff' ? 'স্টাফ' : c,
      })),
    ];
  }, [staffList, customCategories]);

  // ফিল্টার করা শিক্ষক তালিকা
  const filteredStaff = useMemo(() => {
    return staffList.filter((member: any) => {
      let matchCategory = true;
      if (selectedRole !== 'all') {
        matchCategory =
          member.role === selectedRole ||
          member.designation?.toLowerCase().includes(selectedRole.toLowerCase());
      }

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        member.fullName?.toLowerCase().includes(q) ||
        member.designation?.toLowerCase().includes(q) ||
        member.phone?.includes(q);

      return matchCategory && matchQuery;
    });
  }, [staffList, selectedRole, searchQuery]);

  // ==========================================
  // খতিয়ান ও বাজেট গণনার রিয়েলটাইম মেমোরি
  // ==========================================
  const ledgerMonthPayments = useMemo(() => {
    return salaryRecords.filter((s) => s.month.includes(selectedLedgerMonth));
  }, [salaryRecords, selectedLedgerMonth]);

  const paidTeacherIdSet = useMemo(() => {
    return new Set(ledgerMonthPayments.map((s) => s.teacherId));
  }, [ledgerMonthPayments]);

  // মোট বাজেট ও পরিশোধের সামারি
  const totalBudget = useMemo(() => {
    return staffList.reduce((sum, s) => sum + Number(s.monthlySalary || 0), 0);
  }, [staffList]);

  const totalPaidAmount = useMemo(() => {
    return ledgerMonthPayments.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  }, [ledgerMonthPayments]);

  const totalDueAmount = Math.max(0, totalBudget - totalPaidAmount);
  const paidCount = paidTeacherIdSet.size;
  const dueCount = Math.max(0, staffList.length - paidCount);

  // পরিশোধিত বনাম বকেয়া অনুযায়ী ফিল্টার তালিকা
  const ledgerStaffList = useMemo(() => {
    return filteredStaff.filter((member) => {
      const isPaid = paidTeacherIdSet.has(member.id);
      if (ledgerStatusFilter === 'paid') return isPaid;
      if (ledgerStatusFilter === 'due') return !isPaid;
      return true;
    });
  }, [filteredStaff, paidTeacherIdSet, ledgerStatusFilter]);

  const targetTeacherForForm = staffList.find((s) => s.id === salaryForm.teacherId);

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-[#EDF3EF] text-[#1F2937] antialiased p-0 sm:py-4 font-hind overflow-hidden">
      
      {/* গ্লো ও প্রিন্ট স্টাইল */}
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

        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt-card, #printable-receipt-card * {
            visibility: visible;
          }
          #printable-receipt-card {
            position: fixed;
            left: 50%;
            top: 5%;
            transform: translateX(-50%);
            width: 92% !important;
            max-width: 480px !important;
            border: 1px solid #008955 !important;
            box-shadow: none !important;
            background: white !important;
            z-index: 999999 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* মোবাইল ফ্রেম */}
      <div className="relative w-full max-w-[430px] bg-[#F7FBF9] h-full sm:h-[870px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-[#DFECE5]">
        
        {/* টোস্ট */}
        {successToast && (
          <div className="absolute top-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full bg-[#008955] px-4 py-2 text-xs font-bold text-white shadow-xl animate-in fade-in slide-in-from-top-2 no-print">
            <CheckCircle2 size={15} className="text-emerald-200" />
            <span>{successToast}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ভিউ ১: ওস্তাদজির পূর্ণাঙ্গ ও আলাদা পেজ */}
        {/* ========================================================================= */}
        {selectedTeacherForPage ? (
          <div className="flex-1 flex flex-col h-full bg-[#F7FBF9] animate-in slide-in-from-right-4 duration-300">
            <header className="shrink-0 bg-[#F7FBF9] px-4 pt-4 pb-3 border-b border-[#E7F0EB] flex items-center justify-between z-20">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedTeacherForPage(null)}
                  className="h-10 w-10 rounded-2xl bg-white border border-[#E5EFEA] flex items-center justify-center text-[#4B5563] shadow-xs active:scale-95 transition"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h1 className="text-sm font-bold text-[#1F2937] leading-none">ওস্তাদজি লেজার ও বিবরণ</h1>
                  <p className="text-[10px] text-[#008955] font-semibold mt-1">
                    শিক্ষক প্রোফাইল ও হাদিয়া স্টেটমেন্ট
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditingStaff(selectedTeacherForPage);
                    setIsTeacherModalOpen(true);
                  }}
                  className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition flex items-center gap-1"
                >
                  <Edit size={13} />
                  <span>এডিট</span>
                </button>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto overscroll-contain no-scrollbar p-4 space-y-4">
              <div className="relative p-[2px] rounded-3xl rounded-tr-[40px] rounded-bl-[40px] overflow-hidden shadow-sm">
                <div className="emerald-royal-glow" />
                <div className="relative z-10 bg-white rounded-[1.4rem] rounded-tr-[38px] rounded-bl-[38px] p-4.5">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <div className="w-20 h-20 rounded-2xl rounded-tr-3xl rounded-bl-3xl bg-gradient-to-tr from-[#E7F6ED] via-emerald-50 to-[#FEF3C7] border-2 border-white shadow-md overflow-hidden flex items-center justify-center">
                        {selectedTeacherForPage.photoUrl ? (
                          <img
                            src={selectedTeacherForPage.photoUrl}
                            alt={selectedTeacherForPage.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={38} className="text-[#008955]/70" />
                        )}
                      </div>
                      {selectedTeacherForPage.isClassTeacher && (
                        <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-1.5 rounded-xl shadow-md border-2 border-white">
                          <Award size={13} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="inline-flex items-center gap-1 bg-[#E7F6ED] text-[#008955] text-[10px] font-bold px-2 py-0.5 rounded-md mb-1 border border-[#CDE9DC]">
                        <Briefcase size={10} />
                        <span>{selectedTeacherForPage.designation || 'হিফজ শিক্ষক'}</span>
                      </div>
                      <h2 className="text-base font-black text-slate-900 leading-snug">
                        {selectedTeacherForPage.fullName}
                      </h2>
                      <p className="text-xs font-bold text-[#008955] mt-1 font-sans">
                        নির্ধারিত হাদিয়া: ৳ {Number(selectedTeacherForPage.monthlySalary || 0).toLocaleString('en-US')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5 text-[11px]">
                      <Phone size={13} className="text-[#008955]" />
                      <span className="font-sans font-bold text-slate-700">{selectedTeacherForPage.phone || 'মোবাইল নম্বর নেই'}</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      সক্রিয় ওস্তাদ
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => openPaySalaryModal(selectedTeacherForPage)}
                  className="w-full py-3.5 rounded-2xl bg-[#008955] hover:bg-[#007548] text-white text-xs font-bold shadow-md active:scale-95 transition flex items-center justify-center gap-2 tracking-wide"
                >
                  <Plus size={16} />
                  <span>হাদিয়া প্রদান করুন</span>
                </button>
              </div>

              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <History size={14} className="text-[#008955]" />
                    <span>হাদিয়া প্রদানের ইতিহাস</span>
                  </h3>
                  <span className="text-[10px] font-bold text-[#008955] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    রসিদ দেখতে ক্লিক করুন
                  </span>
                </div>

                <div className="space-y-2.5 pb-6">
                  {salaryRecords
                    .filter((s) => s.teacherId === selectedTeacherForPage.id)
                    .map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedReceipt(item)}
                        className="p-3.5 rounded-2xl border border-[#DFECE5] bg-white space-y-2 shadow-2xs hover:border-[#008955] transition cursor-pointer active:scale-[0.99]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900">
                            {item.month} মাসের হাদিয়া
                          </span>
                          <span className="text-sm font-black text-[#008955] font-sans">
                            +৳ {item.amount.toLocaleString('en-US')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-sans pt-1 border-t border-slate-50">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} className="text-[#008955]" />
                            {item.paymentDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-[#008955]" />
                            {item.paymentTime || 'সকাল ১০:৩০ মিনিট'}
                          </span>
                          <span className="bg-[#F7FBF9] border border-slate-200 px-2 py-0.5 rounded-md font-bold text-slate-700 text-[10px]">
                            {item.paymentMethod}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </main>

            <div className="no-print">
              <AdminBottomNav />
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* ভিউ ২: শিক্ষক তালিকা ও হাদিয়া খতিয়ান মূল পেজ */
          /* ========================================================================= */
          <>
            <header className="shrink-0 bg-[#F7FBF9] px-4 pt-4 pb-2 z-30 border-b border-[#E7F0EB]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <Link
                    href="/dashboard"
                    className="h-10 w-10 rounded-2xl bg-white border border-[#E5EFEA] flex items-center justify-center text-[#4B5563] shadow-xs active:scale-95 transition"
                  >
                    <ArrowLeft size={18} />
                  </Link>
                  <div>
                    <h1 className="text-sm font-bold text-[#1F2937] leading-none">শিক্ষক ও হাদিয়া</h1>
                    <p className="text-[10px] text-[#008955] font-semibold mt-1">
                      নিবন্ধিত শিক্ষক: {staffList.length} জন
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {activeTab === 'directory' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStaff(null);
                        setIsTeacherModalOpen(true);
                      }}
                      className="h-9 px-3 rounded-xl bg-[#008955] text-white text-xs font-bold flex items-center gap-1 shadow-xs active:scale-95 transition hover:bg-[#007548]"
                    >
                      <Plus size={15} />
                      <span>শিক্ষক যোগ</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (staffList.length > 0) openPaySalaryModal(staffList[0]);
                      }}
                      className="h-9 px-3 rounded-xl bg-[#008955] text-white text-xs font-bold flex items-center gap-1 shadow-xs active:scale-95 transition hover:bg-[#007548]"
                    >
                      <CircleDollarSign size={15} />
                      <span>হাদিয়া দিন</span>
                    </button>
                  )}
                </div>
              </div>

              {/* মেইন ট্যাব সুইচ */}
              <div className="flex rounded-2xl bg-white p-1 border border-[#D9E7E0] shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('directory')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'directory'
                      ? 'bg-[#008955] text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Users size={13} />
                  <span>ওস্তাদ তালিকা</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('salary')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    activeTab === 'salary'
                      ? 'bg-[#008955] text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Receipt size={13} />
                  <span>হাদিয়া ও খতিয়ান</span>
                </button>
              </div>
            </header>

            {/* স্ক্রলেবল কনটেন্ট */}
            <main className="flex-1 overflow-y-auto overscroll-contain no-scrollbar p-4 space-y-3.5">
              
              {/* ================= TAB ১: ওস্তাদ তালিকা ================= */}
              {activeTab === 'directory' && (
                <>
                  <div className="space-y-2.5">
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-slate-400">
                        <Search size={16} />
                      </span>
                      <input
                        type="text"
                        placeholder="ওস্তাদের নাম, পদবী বা মোবাইল..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-[#D9E7E0] rounded-2xl text-xs font-semibold text-slate-800 shadow-2xs focus:border-[#008955] focus:outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 pb-1">
                      <button
                        type="button"
                        onClick={handleAddCategoryPrompt}
                        title="নতুন ক্যাটাগরি যোগ করুন"
                        className="h-7 w-7 rounded-xl bg-emerald-50 border border-emerald-300 text-[#008955] flex items-center justify-center shrink-0 hover:bg-[#008955] hover:text-white transition active:scale-90"
                      >
                        <Plus size={14} />
                      </button>

                      {allCategoryTabs.map((cat) => {
                        const isSelected = selectedRole === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedRole(cat.id)}
                            className={`min-w-[65px] py-1 px-3 rounded-2xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-[#008955] text-white shadow-xs'
                                : 'bg-white text-[#4B5563] border border-[#E1EDE6] hover:bg-[#EDF4F0]'
                            }`}
                          >
                            <span>{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    {isLoading ? (
                      <div className="py-16 text-center">
                        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-3 border-[#008955] border-t-transparent"></div>
                        <p className="mt-2 text-xs font-medium text-slate-400">ওস্তাদদের তালিকা লোড হচ্ছে...</p>
                      </div>
                    ) : filteredStaff.length > 0 ? (
                      filteredStaff.map((member: any) => {
                        const isPaidThisMonth = paidTeacherIdSet.has(member.id);

                        return (
                          <div
                            key={member.id}
                            onClick={() => setSelectedTeacherForPage(member)}
                            className="relative p-[2px] rounded-3xl rounded-tr-[36px] rounded-bl-[36px] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group"
                          >
                            <div className="emerald-royal-glow" />

                            <div className="relative z-10 bg-white rounded-[1.4rem] rounded-tr-[34px] rounded-bl-[34px] p-4 flex flex-col justify-between gap-3">
                              <div className="flex items-center gap-3.5">
                                <div className="relative shrink-0">
                                  <div className="w-18 h-18 rounded-2xl rounded-tr-3xl rounded-bl-3xl bg-gradient-to-tr from-[#E7F6ED] via-emerald-50 to-[#FEF3C7] border-2 border-white shadow-md overflow-hidden flex items-center justify-center">
                                    {member.photoUrl ? (
                                      <img
                                        src={member.photoUrl}
                                        alt={member.fullName}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <User size={34} className="text-[#008955]/70" />
                                    )}
                                  </div>
                                </div>

                                <div className="min-w-0 flex-1">
                                  <h3 className="text-sm font-black text-slate-900 leading-tight group-hover:text-[#008955] transition">
                                    {member.fullName}
                                  </h3>
                                  <p className="mt-1 text-[11px] font-bold text-[#008955] inline-flex items-center gap-1 bg-[#E7F6ED] px-2 py-0.5 rounded-lg border border-[#CDE9DC]">
                                    <Briefcase size={11} />
                                    <span>{member.designation || 'শিক্ষক'}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-bold text-slate-400">নির্ধারিত মাসিক হাদিয়া</span>
                                  <span className="text-xs font-black text-[#008955] font-sans">
                                    ৳ {Number(member.monthlySalary || 0).toLocaleString('en-US')}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => openPaySalaryModal(member)}
                                    className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold shadow-xs active:scale-95 transition ${
                                      isPaidThisMonth
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                        : 'bg-[#008955] text-white hover:bg-[#007548]'
                                    }`}
                                  >
                                    <CircleDollarSign size={13} />
                                    <span>{isPaidThisMonth ? 'পরিশোধিত ✓' : 'বেতন প্রদান করুন'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingStaff(member);
                                      setIsTeacherModalOpen(true);
                                    }}
                                    className="h-8 px-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 hover:bg-slate-100 active:scale-95 transition flex items-center gap-1"
                                  >
                                    <Edit size={12} />
                                    <span className="text-[11px]">এডিট</span>
                                  </button>

                                  {/* ডিলিট বাটন */}
                                  <button
                                    type="button"
                                    onClick={() => setStaffToDelete(member)}
                                    className="h-8 w-8 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition active:scale-90 border border-rose-100"
                                    title="শিক্ষক বাতিল করুন"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>

                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center text-xs text-slate-400 py-8">কোনো ওস্তাদ পাওয়া যায়নি</p>
                    )}
                  </div>
                </>
              )}

              {/* ================= TAB ২: হাদিয়া ও খতিয়ান ================= */}
              {activeTab === 'salary' && (
                <div className="space-y-3.5 animate-in fade-in duration-200 pb-12">
                  <div className="bg-white p-3 rounded-2xl border border-[#DFECE5] shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Calendar size={14} className="text-[#008955]" />
                        <span>খতিয়ানের মাস:</span>
                      </div>
                      <input
                        type="month"
                        value={selectedLedgerMonth}
                        onChange={(e) => setSelectedLedgerMonth(e.target.value)}
                        className="border border-[#BBE3D3] bg-[#F7FBF9] text-xs font-bold text-[#008955] px-2.5 py-1 rounded-xl focus:outline-none font-sans"
                      />
                    </div>

                    <div className="relative flex items-center pt-1 border-t border-slate-100">
                      <Search size={13} className="absolute left-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="ওস্তাদের নাম বা মোবাইল দিয়ে খুঁজুন..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#008955] placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="relative p-[2px] rounded-3xl rounded-tr-[36px] rounded-bl-[36px] overflow-hidden shadow-sm">
                    <div className="emerald-royal-glow" />
                    <div className="relative z-10 bg-gradient-to-tr from-[#008955] to-[#047857] rounded-[1.4rem] rounded-tr-[34px] rounded-bl-[34px] p-4 text-white space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-200 block uppercase tracking-wider">
                            ধার্যকৃত মোট হাদিয়া বাজেট
                          </span>
                          <p className="text-2xl font-black font-sans mt-0.5">
                            ৳ {totalBudget.toLocaleString('en-US')}
                          </p>
                        </div>
                        <div className="h-11 w-11 rounded-2xl bg-white/15 flex items-center justify-center text-amber-300 shadow-inner">
                          <CircleDollarSign size={24} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/15 text-xs">
                        <div className="bg-black/15 p-2 rounded-xl border border-white/10">
                          <span className="text-[10px] text-emerald-100 block">পরিশোধিত হাদিয়া:</span>
                          <span className="font-bold text-sm font-sans text-emerald-300">
                            ৳ {totalPaidAmount.toLocaleString('en-US')}
                          </span>
                          <span className="text-[9px] block text-emerald-100/90 font-hind mt-0.5">
                            ({paidCount}/{staffList.length} জন পেয়েছেন)
                          </span>
                        </div>

                        <div className="bg-black/15 p-2 rounded-xl border border-white/10">
                          <span className="text-[10px] text-amber-200 block">বকেয়া / বাকি হাদিয়া:</span>
                          <span className="font-bold text-sm font-sans text-amber-300">
                            ৳ {totalDueAmount.toLocaleString('en-US')}
                          </span>
                          <span className="text-[9px] block text-amber-100/90 font-hind mt-0.5">
                            ({dueCount} জনের বাকি)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex rounded-2xl bg-white p-1 border border-[#D9E7E0] shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setLedgerStatusFilter('all')}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                        ledgerStatusFilter === 'all'
                          ? 'bg-[#008955] text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <span>সকল ({staffList.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLedgerStatusFilter('paid')}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                        ledgerStatusFilter === 'paid'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-emerald-700 hover:text-emerald-900'
                      }`}
                    >
                      <Check size={13} strokeWidth={3} />
                      <span>পরিশোধিত ({paidCount})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLedgerStatusFilter('due')}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                        ledgerStatusFilter === 'due'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-amber-700 hover:text-amber-900'
                      }`}
                    >
                      <AlertCircle size={13} />
                      <span>বকেয়া ({dueCount})</span>
                    </button>
                  </div>

                  <div className="space-y-2 pt-1">
                    <h3 className="text-xs font-bold text-slate-800 px-1">
                      {ledgerStatusFilter === 'paid'
                        ? 'পরিশোধিত হাদিয়া তালিকা'
                        : ledgerStatusFilter === 'due'
                        ? 'বকেয়া তালিকা ও সরাসরি পরিশোধ'
                        : 'চলতি মাসের শিক্ষকভিত্তিক খতিয়ান'}
                    </h3>

                    {ledgerStaffList.length > 0 ? (
                      ledgerStaffList.map((member) => {
                        const isPaid = paidTeacherIdSet.has(member.id);
                        const memberReceipt = ledgerMonthPayments.find((s) => s.teacherId === member.id);

                        return (
                          <div
                            key={member.id}
                            className={`p-3 rounded-2xl border transition shadow-2xs flex items-center justify-between ${
                              isPaid
                                ? 'bg-white border-[#E1EDE6]'
                                : 'bg-amber-50/40 border-amber-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-[#E7F6ED] to-[#FEF3C7] border border-white shadow-2xs overflow-hidden flex items-center justify-center">
                                  {member.photoUrl ? (
                                    <img src={member.photoUrl} alt={member.fullName} className="w-full h-full object-cover" />
                                  ) : (
                                    <User size={22} className="text-[#008955]" />
                                  )}
                                </div>
                                <span
                                  className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full ring-2 ring-white ${
                                    isPaid ? 'bg-emerald-500' : 'bg-amber-500'
                                  }`}
                                />
                              </div>

                              <div>
                                <h4 className="text-xs font-bold text-slate-900 leading-tight">
                                  {member.fullName}
                                </h4>
                                <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                                  ধার্যকৃত: ৳ {Number(member.monthlySalary || 0).toLocaleString('en-US')}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              {isPaid ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (memberReceipt) setSelectedReceipt(memberReceipt);
                                    else {
                                      setSelectedReceipt({
                                        id: `REC-${member.id}`,
                                        teacherId: member.id,
                                        amount: Number(member.monthlySalary || 0),
                                        month: selectedLedgerMonth,
                                        paymentDate: new Date().toISOString().split('T')[0],
                                        paymentTime: 'সকাল ১০ঃ৩০',
                                        paymentMethod: 'নগদ ক্যাশ',
                                        note: 'মাসিক হাদিয়া পরিশোধিত',
                                        createdAt: new Date().toISOString(),
                                      });
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 active:scale-95 transition"
                                >
                                  <Receipt size={13} />
                                  <span>রসিদ দেখুন</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openPaySalaryModal(member, selectedLedgerMonth)}
                                  className="inline-flex items-center gap-1 rounded-xl bg-[#008955] text-white px-3 py-1.5 text-xs font-bold hover:bg-[#007548] active:scale-95 transition shadow-xs"
                                >
                                  <CircleDollarSign size={13} />
                                  <span>হাদিয়া দিন</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center text-xs text-slate-400 py-6">কোনো রেকর্ড পাওয়া যায়নি</p>
                    )}
                  </div>

                  <div className="space-y-2 pt-2">
                    <h3 className="text-xs font-bold text-slate-800 px-1">
                      হাদিয়া প্রদানের রশিদসমূহ (মোট {salaryRecords.length} টি)
                    </h3>
                    
                    {salaryRecords.length > 0 ? (
                      salaryRecords.map((item) => {
                        const teacher = staffList.find((s) => s.id === item.teacherId);
                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedReceipt(item)}
                            className="bg-white border border-[#E1EDE6] rounded-2xl p-3 flex items-center justify-between shadow-2xs cursor-pointer hover:border-[#008955] transition"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-[#E7F6ED] text-[#008955] flex items-center justify-center">
                                <Receipt size={18} />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-900 leading-tight">
                                  {teacher?.fullName || 'ওস্তাদ'}
                                </h4>
                                <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                                  {item.month} মাস • {item.paymentDate}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-sm font-black text-[#008955] font-sans block">
                                +৳ {item.amount.toLocaleString('en-US')}
                              </span>
                              <span className="text-[9px] font-bold text-slate-500 uppercase">
                                {item.paymentMethod}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center text-xs text-slate-400 py-6">এখনো কোনো হাদিয়া প্রদান করা হয়নি</p>
                    )}
                  </div>

                </div>
              )}

            </main>

            <div className="no-print">
              <AdminBottomNav />
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* শিক্ষক ডিলিট নিশ্চিতকরণ ডায়ালগ */}
        {/* ========================================================================= */}
        {staffToDelete && (
          <div
            onClick={() => !isDeleting && setStaffToDelete(null)}
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[320px] rounded-3xl bg-white p-5 text-center shadow-2xl border border-rose-100"
            >
              <div className="mx-auto h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                <AlertTriangle size={24} />
              </div>

              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                শিক্ষক বা ওস্তাদকে বাদ দিতে চান?
              </h3>
              <p className="text-xs font-semibold text-slate-800 mt-1">
                {staffToDelete.fullName}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                পদবী: {staffToDelete.designation || 'শিক্ষক'}
              </p>
              <p className="text-[10px] text-rose-500 mt-2 bg-rose-50 p-2 rounded-xl border border-rose-100">
                মুছে ফেললে শিক্ষকের তথ্য ও খতিয়ান ক্লাউড ও লোকাল ডেটাবেজ থেকে স্থায়ীভাবে বাদ যাবে।
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setStaffToDelete(null)}
                  className="rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 active:scale-95 transition disabled:opacity-50"
                >
                  না, রাখুন
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDeleteStaff}
                  className="rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 active:scale-95 transition disabled:opacity-50"
                >
                  {isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, ডিলিট করুন'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ডিজিটাল অফিসিয়াল মানি রসিদ ও প্রিন্ট প্রিভিউ পপআপ */}
        {selectedReceipt && (
          <div
            onClick={() => setSelectedReceipt(null)}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 backdrop-blur-md p-3 font-hind animate-in fade-in"
          >
            <div
              id="printable-receipt-card"
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[360px] rounded-3xl bg-white p-5 shadow-2xl border border-emerald-300 text-slate-800"
            >
              <div className="text-center pb-3 border-b border-dashed border-emerald-200">
                <div className="flex items-center justify-between no-print mb-1">
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    অফিসিয়াল কপি
                  </span>
                  <button
                    onClick={() => setSelectedReceipt(null)}
                    className="h-7 w-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="h-10 w-10 mx-auto rounded-2xl bg-[#E7F6ED] text-[#008955] flex items-center justify-center mb-1 shadow-2xs">
                  <ShieldCheck size={24} />
                </div>
                <h2 className="text-sm font-black text-slate-900 leading-snug text-center">মাদ্রাসায়ে ইসলামিয়া দারুল উলুম, কোম্পানিগঞ্জ।</h2>
                <p className="text-[10px] text-[#008955] font-bold tracking-wide mt-0.5">
                  শিক্ষক হাদিয়া ও বেতন পরিশোধ ভাউচার
                </p>
                <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                  ভাউচার নং: {selectedReceipt.id}
                </p>
              </div>

              <div className="py-3 space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">ওস্তাদের নাম:</span>
                    <span className="font-bold text-slate-900">
                      {staffList.find((s) => s.id === selectedReceipt.teacherId)?.fullName ||
                        selectedTeacherForPage?.fullName ||
                        'মাওলানা আব্দুর রহমান'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">পদবী:</span>
                    <span className="font-bold text-[#008955]">
                      {staffList.find((s) => s.id === selectedReceipt.teacherId)?.designation ||
                        selectedTeacherForPage?.designation ||
                        'হিফজুল কুরআন শিক্ষক'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">হাদিয়ার মাস:</span>
                    <span className="font-bold text-slate-800">{selectedReceipt.month}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">পরিশোধের তারিখ:</span>
                    <span className="font-mono font-bold text-slate-800">{selectedReceipt.paymentDate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">পরিশোধের সময়:</span>
                    <span className="font-bold text-slate-800">{selectedReceipt.paymentTime || 'সকাল ১০:৩০ মিনিট'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">পেমেন্ট মাধ্যম:</span>
                    <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      {selectedReceipt.paymentMethod}
                    </span>
                  </div>
                </div>

                {selectedReceipt.note && (
                  <div className="pt-2 border-t border-slate-100 text-[10px]">
                    <span className="text-slate-400 block mb-0.5 font-semibold">মন্তব্য/নোট:</span>
                    <p className="bg-slate-50 p-2 rounded-lg text-slate-700 border border-slate-100 leading-relaxed">
                      {selectedReceipt.note}
                    </p>
                  </div>
                )}

                <div className="my-2.5 p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-[#E7F6ED] border border-emerald-300 text-center">
                  <span className="text-[10px] font-bold text-[#008955] block">পরিশোধিত হাদিয়ার পরিমাণ</span>
                  <p className="text-2xl font-black text-[#008955] font-sans mt-0.5">
                    ৳ {selectedReceipt.amount.toLocaleString('en-US')}
                  </p>
                  <span className="text-[9px] font-bold text-slate-500">স্ট্যাটাস: পরিশোধ সম্পন্ন (PAID)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-200">
                <div className="flex justify-between items-end pb-3 text-[9px] text-slate-400">
                  <div className="text-center">
                    <div className="w-20 border-b border-slate-300 mb-1"></div>
                    <span>মুহতামিম স্বাক্ষর</span>
                  </div>
                  <div className="text-center">
                    <div className="w-20 border-b border-slate-300 mb-1"></div>
                    <span>হিসাবরক্ষক</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 no-print">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 py-2.5 rounded-xl bg-[#008955] hover:bg-[#007548] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <Printer size={15} />
                    <span>প্রিন্ট করুন</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedReceipt(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition active:scale-95"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* হাদিয়া প্রদানের পপআপ ফর্ম */}
        {isSalaryModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 font-hind animate-in fade-in no-print">
            <div className="relative w-full max-w-[340px] rounded-3xl bg-white p-5 shadow-2xl border border-[#DFECE5]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-[#E7F6ED] text-[#008955] flex items-center justify-center">
                    <CircleDollarSign size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">হাদিয়া / বেতন প্রদান</h3>
                    <p className="text-[10px] text-[#008955] font-medium">রসিদ ও খতিয়ান তৈরি করুন</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSalaryModalOpen(false)}
                  className="h-7 w-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"
                >
                  <X size={15} />
                </button>
              </div>

              {salaryError && (
                <div className="mt-2 rounded-xl bg-rose-50 border border-rose-100 p-2 text-[11px] font-semibold text-rose-600">
                  ⚠️ {salaryError}
                </div>
              )}

              <form onSubmit={handlePaySalary} className="mt-3 space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-0.5">নির্বাচিত ওস্তাদ</label>
                  {targetTeacherForForm ? (
                    <div className="p-2 bg-[#E7F6ED] rounded-xl border border-[#CDE9DC] flex items-center justify-between">
                      <span className="text-xs font-bold text-[#008955]">{targetTeacherForForm.fullName}</span>
                      <span className="text-[10px] font-medium text-slate-500">{targetTeacherForForm.designation}</span>
                    </div>
                  ) : (
                    <select
                      value={salaryForm.teacherId}
                      onChange={(e) => {
                        const t = staffList.find((s) => s.id === e.target.value);
                        setSalaryForm({
                          ...salaryForm,
                          teacherId: e.target.value,
                          amount: Number(t?.monthlySalary || salaryForm.amount),
                        });
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-[#F7FBF9] px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                      required
                    >
                      <option value="">ওস্তাদ নির্বাচন করুন</option>
                      {staffList.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.fullName} ({t.designation})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-0.5">হাদিয়ার মাস</label>
                    <input
                      type="month"
                      value={salaryForm.month}
                      onChange={(e) => setSalaryForm({ ...salaryForm, month: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-[#F7FBF9] px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none font-sans"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-0.5">টাকার পরিমাণ *</label>
                    <input
                      type="number"
                      value={salaryForm.amount}
                      onChange={(e) => setSalaryForm({ ...salaryForm, amount: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-200 bg-[#F7FBF9] px-3 py-1.5 text-xs font-black text-[#008955] focus:outline-none font-sans"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-0.5">প্রদানের তারিখ</label>
                    <input
                      type="date"
                      value={salaryForm.paymentDate}
                      onChange={(e) => setSalaryForm({ ...salaryForm, paymentDate: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-[#F7FBF9] px-2 py-1.5 text-xs font-medium text-slate-800 focus:outline-none font-sans"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-0.5">পেমেন্ট মাধ্যম</label>
                    <select
                      value={salaryForm.paymentMethod}
                      onChange={(e) => setSalaryForm({ ...salaryForm, paymentMethod: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-[#F7FBF9] px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="নগদ ক্যাশ">নগদ ক্যাশ</option>
                      <option value="বিকাশ (bKash)">বিকাশ (bKash)</option>
                      <option value="নগদ (Nagad)">নগদ (Nagad)</option>
                      <option value="ব্যাংক ট্রান্সফার">ব্যাংক ট্রান্সফার</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-0.5">মন্তব্য (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    placeholder="যেমন: মাসিক হাদিয়া পরিশোধ করা হয়েছে"
                    value={salaryForm.note}
                    onChange={(e) => setSalaryForm({ ...salaryForm, note: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-[#F7FBF9] px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSalarySubmitting}
                    className="w-full py-2.5 rounded-xl bg-[#008955] hover:bg-[#007548] text-white text-xs font-bold shadow-xs active:scale-95 transition disabled:opacity-50"
                  >
                    {isSalarySubmitting ? 'সেভ হচ্ছে...' : 'হাদিয়া নিশ্চিত করুন'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* শিক্ষক ফর্ম মোডাল */}
        <TeacherFormModal
          isOpen={isTeacherModalOpen}
          onClose={() => {
            setIsTeacherModalOpen(false);
            setEditingStaff(null);
          }}
          onSave={handleSaveStaff}
          initialData={editingStaff}
        />

      </div>
    </div>
  );
}