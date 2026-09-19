'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  UserCheck,
  Camera,
  Trash2,
  User,
  Loader2,
  Award,
  Sparkles,
  IdCard,
} from 'lucide-react';
import type { Staff, StaffRole } from '@/types/database.types';
import { supabase } from '@/lib/supabaseClient';

interface TeacherFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; teacher_uid?: string }) => Promise<void>;
  onDelete?: (staffId: string) => Promise<void>;
  initialData?: Staff | null;
}

const DEFAULT_CLASSES = ['প্লে', 'নার্সারি', 'হিফজ', 'নাজেরা', 'নূরানী', 'কিতাবখানা'];

export function TeacherFormModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
}: TeacherFormModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [classList, setClassList] = useState<string[]>(DEFAULT_CLASSES);
  const [teacherUid, setTeacherUid] = useState<string>('');
  const [formData, setFormData] = useState({
    fullName: '',
    designation: '',
    role: 'teacher' as StaffRole,
    assignedClass: '',
    isClassTeacher: false,
    phone: '',
    email: '',
    joiningDate: new Date().toISOString().split('T')[0],
    monthlySalary: 12000,
    photoUrl: '',
    status: 'active' as const,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const generateAutoUid = () => {
    const randomSerial = Math.floor(100 + Math.random() * 900);
    return `T-${randomSerial}`;
  };

  useEffect(() => {
    const savedClasses = localStorage.getItem('madrasa_custom_classes');
    if (savedClasses) {
      try {
        const parsed = JSON.parse(savedClasses);
        if (Array.isArray(parsed)) {
          const merged = Array.from(new Set([...DEFAULT_CLASSES, ...parsed]));
          setClassList(merged);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    if (initialData) {
      const isCT = !!(initialData as any).isClassTeacher;
      const existingUid = (initialData as any).teacher_uid || initialData.id || generateAutoUid();
      setTeacherUid(existingUid);
      setFormData({
        fullName: initialData.fullName || '',
        designation: initialData.designation || '',
        role: initialData.role || 'teacher',
        assignedClass: isCT ? ((initialData as any).assignedClass || classList[0] || 'হিফজ') : '',
        isClassTeacher: isCT,
        phone: initialData.phone || '',
        email: initialData.email || '',
        joiningDate: (initialData as any).joiningDate || new Date().toISOString().split('T')[0],
        monthlySalary: initialData.monthlySalary || 0,
        photoUrl: (initialData as any).photoUrl || '',
        status: (initialData.status as any) || 'active',
      });
    } else {
      setTeacherUid(generateAutoUid());
      setFormData({
        fullName: '',
        designation: '',
        role: 'teacher',
        assignedClass: '',
        isClassTeacher: false,
        phone: '',
        email: '',
        joiningDate: new Date().toISOString().split('T')[0],
        monthlySalary: 12000,
        photoUrl: '',
        status: 'active',
      });
    }
    setErrorMessage('');
  }, [initialData, isOpen, classList]);

  if (!isOpen) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setErrorMessage('ছবির সাইজ সর্বোচ্চ ৩ মেগাবাইট হতে পারবে!');
      return;
    }

    try {
      setIsUploadingPhoto(true);
      setErrorMessage('');

      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `stf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${fileExt}`;
      const filePath = `teachers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('madrasha')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('madrasha')
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          setFormData((prev) => ({
            ...prev,
            photoUrl: publicUrlData.publicUrl,
          }));
        }
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData((prev) => ({
            ...prev,
            photoUrl: reader.result as string,
          }));
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.warn('ছবি আপলোড সতর্কতা:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          photoUrl: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      setErrorMessage('সম্মানিত ওস্তাদের নাম প্রদান করুন!');
      return;
    }
    if (!formData.designation.trim()) {
      setErrorMessage('পদবী প্রদান করুন!');
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMessage('মোবাইল নম্বর প্রদান করুন!');
      return;
    }

    const finalUid = teacherUid.trim() || generateAutoUid();

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      await onSave({
        ...formData,
        id: finalUid,
        teacher_uid: finalUid,
        assignedClass: formData.isClassTeacher ? formData.assignedClass : '',
        monthlySalary: Number(formData.monthlySalary) || 0,
      } as any);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'তথ্য সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id || !onDelete) return;
    const confirmed = window.confirm(
      `আপনি কি নিশ্চিত যে "${initialData.fullName}"-এর সকল তথ্য স্থায়ীভাবে মুছে ফেলতে চান?`
    );
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await onDelete(initialData.id);
      onClose();
    } catch (err: any) {
      setErrorMessage('শিক্ষক মুছতে ত্রুটি হয়েছে।');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-3 sm:p-4 font-hind animate-in fade-in duration-200">
      <div className="relative max-h-[90vh] w-full max-w-[380px] flex flex-col rounded-[28px] bg-[#F7FBF9] shadow-2xl border border-[#DFECE5] overflow-hidden">
        
        {/* হেডার */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#E7F0EB] bg-[#F7FBF9]">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#008955] text-white flex items-center justify-center shadow-xs">
              <UserCheck size={18} />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[#1F2937] leading-tight">
                {initialData ? 'শিক্ষকের তথ্য পরিবর্তন' : 'নতুন শিক্ষক নিবন্ধন'}
              </h2>
              <p className="text-[10px] text-[#008955] font-medium">স্মার্ট UID ও হালনাগাদ তথ্য</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-full bg-white border border-[#E5EFEA] flex items-center justify-center text-[#6B7280] hover:text-[#1F2937] hover:bg-[#F3F4F6] transition active:scale-95 shadow-2xs"
          >
            <X size={15} />
          </button>
        </div>

        {/* এরর মেসেজ */}
        {errorMessage && (
          <div className="mx-4 mt-2 rounded-xl bg-rose-50 border border-rose-100 p-2 text-[11px] font-semibold text-rose-600">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* ফর্ম এরিয়া */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
          
          {/* ফটো আপলোড */}
          <div className="flex flex-col items-center justify-center p-2.5 bg-white border border-[#D9E7E0] rounded-2xl shadow-2xs">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl rounded-tr-3xl rounded-bl-3xl bg-gradient-to-tr from-[#E7F6ED] to-[#FEF3C7] border-2 border-white shadow-xs overflow-hidden flex items-center justify-center">
                {isUploadingPhoto ? (
                  <Loader2 size={24} className="text-[#008955] animate-spin" />
                ) : formData.photoUrl ? (
                  <img
                    src={formData.photoUrl}
                    alt="Teacher"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={30} className="text-[#008955]/60" />
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-lg bg-[#008955] text-white flex items-center justify-center shadow-md hover:bg-[#007548] active:scale-90 transition border border-white"
                title="ছবি বাছাই করুন"
              >
                <Camera size={13} />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            <div className="mt-1.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="text-[11px] font-bold text-[#008955] hover:underline"
              >
                {isUploadingPhoto
                  ? 'ছবি আপলোড হচ্ছে...'
                  : formData.photoUrl
                  ? 'ছবি পরিবর্তন'
                  : 'ছবি আপলোড করুন (Choose Photo)'}
              </button>
              {formData.photoUrl && !isUploadingPhoto && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, photoUrl: '' }))}
                  className="text-[10px] font-bold text-rose-500 hover:underline"
                >
                  মুছুন
                </button>
              )}
            </div>
          </div>

          {/* শিক্ষক UID (স্মার্ট আইডি) */}
          <div className="bg-white border border-[#D9E7E0] p-2.5 rounded-2xl shadow-2xs space-y-1">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-bold text-[#374151] flex items-center gap-1">
                <IdCard size={13} className="text-[#008955]" />
                <span>শিক্ষক UID (স্মার্ট আইডি) *</span>
              </label>
              <span className="text-[9px] text-[#008955] font-semibold">লগইন ও প্রোফাইল আইডি</span>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="যেমন: 101, T-101, 476 বা আপনার মনমতো ভ্যালু"
                value={teacherUid}
                onChange={(e) => setTeacherUid(e.target.value)}
                className="flex-1 rounded-xl border border-[#BBE3D3] bg-[#E7F6ED] px-3 py-1.5 text-xs font-black font-sans text-[#008955] focus:border-[#008955] focus:bg-white focus:outline-none transition shadow-2xs"
                required
              />
              <button
                type="button"
                onClick={() => setTeacherUid(generateAutoUid())}
                className="px-2.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-[11px] font-bold flex items-center gap-1 transition active:scale-95 shrink-0"
                title="অটো সিরিয়াল তৈরি করুন"
              >
                <Sparkles size={12} />
                <span>অটো</span>
              </button>
            </div>
          </div>

          {/* পূর্ণ নাম */}
          <div>
            <label className="text-[10px] font-bold text-[#374151] block mb-0.5 px-1">
              শিক্ষক / স্টাফের পূর্ণ নাম *
            </label>
            <input
              type="text"
              placeholder="যেমন: মোঃ জাফর খান"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full rounded-xl border border-[#D9E7E0] bg-white px-3 py-1.5 text-xs font-semibold text-[#1F2937] focus:border-[#008955] focus:outline-none shadow-2xs"
              required
            />
          </div>

          {/* পদবী ও দায়িত্বের ধরন */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-[#374151] block mb-0.5 px-1">
                পদবী (ম্যানুয়ালি লিখুন) *
              </label>
              <input
                type="text"
                placeholder="যেমন: হিফজ শিক্ষক"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full rounded-xl border border-[#D9E7E0] bg-white px-3 py-1.5 text-xs font-semibold text-[#1F2937] focus:border-[#008955] focus:outline-none shadow-2xs"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#374151] block mb-0.5 px-1">
                দায়িত্বের ধরণ (Role) *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as StaffRole })}
                className="w-full rounded-xl border border-[#D9E7E0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1F2937] focus:border-[#008955] focus:outline-none shadow-2xs cursor-pointer"
              >
                <option value="teacher">শিক্ষক (Teacher)</option>
                <option value="admin">প্রশাসক (Admin)</option>
                <option value="staff">স্টাফ (Staff)</option>
              </select>
            </div>
          </div>

          {/* শ্রেণি শিক্ষক টগল */}
          <div className="p-2.5 bg-white border border-[#D9E7E0] rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Award size={15} className="text-amber-500" />
                <span className="text-[11px] font-bold text-slate-800">তিনি কি কোনো শ্রেণি শিক্ষক?</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isClassTeacher}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData({
                      ...formData,
                      isClassTeacher: checked,
                      assignedClass: checked ? (formData.assignedClass || classList[0] || 'প্লে') : '',
                    });
                  }}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#008955]"></div>
              </label>
            </div>

            {formData.isClassTeacher && (
              <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-2 animate-in fade-in">
                <span className="text-[10px] font-bold text-slate-600 shrink-0">দায়িত্বপ্রাপ্ত শ্রেণি নির্বাচন করুন:</span>
                <select
                  value={formData.assignedClass}
                  onChange={(e) => setFormData({ ...formData, assignedClass: e.target.value })}
                  className="flex-1 rounded-xl border border-[#BBE3D3] bg-[#E7F6ED] px-2.5 py-1 text-xs font-bold text-[#008955] focus:outline-none cursor-pointer"
                >
                  {classList.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls} বিভাগ
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* মোবাইল নম্বর ও ইমেইল */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-[#374151] block mb-0.5 px-1">
                মোবাইল নম্বর *
              </label>
              <input
                type="tel"
                placeholder="017xxxxxxxx"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-xl border border-[#D9E7E0] bg-white px-3 py-1.5 text-xs font-semibold text-[#1F2937] focus:border-[#008955] focus:outline-none shadow-2xs font-sans"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#374151] block mb-0.5 px-1">
                ইমেইল (ঐচ্ছিক)
              </label>
              <input
                type="email"
                placeholder="teacher@mail.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-xl border border-[#D9E7E0] bg-white px-3 py-1.5 text-xs font-medium text-[#1F2937] focus:border-[#008955] focus:outline-none shadow-2xs font-sans"
              />
            </div>
          </div>

          {/* যোগদানের তারিখ ও হাদিয়া */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-[#374151] block mb-0.5 px-1">
                যোগদানের তারিখ
              </label>
              <input
                type="date"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full rounded-xl border border-[#D9E7E0] bg-white px-2 py-1.5 text-xs font-medium text-[#1F2937] focus:border-[#008955] focus:outline-none shadow-2xs font-sans"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#374151] block mb-0.5 px-1">
                মাসিক হাদিয়া (টাকা) *
              </label>
              <input
                type="number"
                placeholder="12000"
                value={formData.monthlySalary}
                onChange={(e) => setFormData({ ...formData, monthlySalary: Number(e.target.value) })}
                className="w-full rounded-xl border border-[#D9E7E0] bg-white px-3 py-1.5 text-xs font-black text-[#008955] focus:border-[#008955] focus:outline-none shadow-2xs font-sans"
                required
              />
            </div>
          </div>

          {/* ফুটার বাটন */}
          <div className="pt-2 flex items-center justify-between border-t border-[#E7F0EB]">
            {initialData && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className="flex items-center gap-1 rounded-xl bg-rose-50 border border-rose-200 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-100 active:scale-95 transition disabled:opacity-50"
              >
                <Trash2 size={13} />
                <span>{isDeleting ? 'মুছছে...' : 'শিক্ষক মুছুন'}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isDeleting}
                className="rounded-xl border border-[#D9E7E0] bg-white px-3 py-1.5 text-[11px] font-bold text-[#6B7280] hover:bg-[#F3F4F6] active:scale-95 transition"
              >
                বাতিল
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isUploadingPhoto || isDeleting}
                className="flex items-center gap-1 rounded-xl bg-[#008955] px-4 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-[#007347] active:scale-95 transition disabled:opacity-50"
              >
                <Save size={13} />
                <span>{isSubmitting ? 'সেভ হচ্ছে...' : 'সংরক্ষণ'}</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}