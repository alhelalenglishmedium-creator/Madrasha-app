'use client';

import React, { useMemo } from 'react';
import {
  QrCode,
  LogOut,
  Droplet,
  Building2,
  Wallet,
  ShieldCheck,
  Phone,
  User,
} from 'lucide-react';
import type { Student } from '@/types/database.types';

interface StudentProfileProps {
  student: Student;
  onLogout?: () => void;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ student, onLogout }) => {
  const [photoError, setPhotoError] = React.useState<boolean>(false);

  // নামের শুরুতে 'মুহাম্মাদ' নিশ্চিত করার লজিক
  const formattedName = useMemo(() => {
    const raw = student.fullNameBangla || student.fullName || 'আব্দুল্লাহ মাহমুদ';
    return raw.startsWith('মুহাম্মাদ') || raw.startsWith('মোহাম্মদ') ? raw : `মুহাম্মাদ ${raw}`;
  }, [student]);

  // ফটো অ্যাভাটার বা আদ্যক্ষর
  const avatarLetter = useMemo(() => {
    return (student.fullNameBangla || student.fullName || 'আ')
      .replace(/^মুহাম্মাদ\s+/i, '')
      .replace(/^মোহাম্মদ\s+/i, '')
      .charAt(0) || 'আ';
  }, [student]);

  const studentPhoto = student.photoUrl || (student as any).photo_url;

  return (
    <div className="space-y-3.5 pb-2 font-['Noto_Sans_Bengali',sans-serif]">
      
      {/* সেকশন হেডার */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-sm font-bold text-slate-900">ডিজিটাল স্মার্ট আইডি ও প্রোফাইল</h2>
          <p className="text-[10px] text-slate-500">শিক্ষার্থীর অফিশিয়াল পরিচিতিপত্র</p>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300/60 shadow-2xs">
          <ShieldCheck className="w-3 h-3 text-emerald-600" /> ভেরিফাইড
        </span>
      </div>

      {/* ================= ১. ডিজিটাল স্মার্ট আইডি কার্ড ================= */}
      <div className="relative overflow-hidden rounded-[26px] bg-white border border-slate-200/80 shadow-md shadow-emerald-950/5 p-4 space-y-3.5">
        
        {/* কার্ড ব্যাকগ্রাউন্ড সফট গ্লো */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 via-teal-500/5 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />

        {/* কার্ড হেডার (মাদ্রাসার নাম ডুপ্লিকেট না করে শুধু স্মার্ট কার্ড হেডার) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#008955] text-white flex items-center justify-center font-bold text-[10px] shadow-xs">
              DU
            </div>
            <span className="text-[11px] font-extrabold text-[#008955] tracking-wider uppercase">
              STUDENT SMART CARD
            </span>
          </div>
          <span className="text-[9.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-full">
            সক্রিয় ২০২৬
          </span>
        </div>

        {/* শিক্ষার্থী ছবি ও প্রধান তথ্য */}
        <div className="flex items-center gap-3.5">
          {/* ফটো স্লট (ছবি থাকলে ছবি, না থাকলে সুন্দর অবতার) */}
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-400 p-0.5 shadow-md shadow-emerald-600/15 shrink-0 overflow-hidden">
            {studentPhoto && !photoError ? (
              <img
                src={studentPhoto}
                alt={formattedName}
                className="w-full h-full object-cover rounded-[14px]"
                onError={() => setPhotoError(true)}
              />
            ) : (
              <div className="w-full h-full bg-[#E7F6ED] rounded-[14px] flex items-center justify-center text-2xl font-black text-[#008955]">
                {avatarLetter}
              </div>
            )}
          </div>

          <div className="space-y-1 text-xs flex-1 min-w-0">
            <h4 className="text-[13.5px] font-extrabold text-slate-900 leading-snug truncate">
              {formattedName}
            </h4>
            
            {/* কোনো অতিরিক্ত ADM আইডি নেই, সরাসরি সিরিয়াল নম্বর */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="font-bold text-[11px] text-[#008955] bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/60 inline-block">
                সিরিয়াল: {student.rollNo || '০১'}
              </span>
            </div>
            
            <p className="text-[11px] text-slate-600 font-medium truncate pt-0.5">
              বিভাগ: <span className="font-bold text-slate-800">{student.className || 'হিফজুল কুরআন'}</span>
            </p>
            
            <p className="text-[10px] text-slate-400">
              সেশন: ২০২৬ শিক্ষাবর্ষ
            </p>
          </div>
        </div>

        {/* কার্ড ফুটার ও কিউআর কোড */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <div className="space-y-0.5">
            <p className="text-slate-500 flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" /> অভিভাবক: <span className="font-bold text-slate-700">{student.fatherName || 'মাওলানা আব্দুর রহমান'}</span>
            </p>
            <p className="text-slate-500 flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-400" /> ফোন: <span className="font-bold font-sans text-slate-700">{student.phone || '01712-345678'}</span>
            </p>
          </div>

          <div className="h-10 w-10 bg-slate-50 border border-slate-200 rounded-xl p-1.5 flex items-center justify-center shadow-2xs">
            <QrCode className="w-full h-full text-slate-800" />
          </div>
        </div>

      </div>

      {/* ================= ২. ব্যক্তিগত ও প্রাতিষ্ঠানিক তথ্য (৩টি কার্ড ও অভিভাবক মোবাইল) ================= */}
      <div className="space-y-2.5">
        <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider px-1">
          ব্যক্তিগত ও প্রাতিষ্ঠানিক তথ্য
        </p>

        {/* একাধিক অভিভাবকের মোবাইল নম্বরসমূহ */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-[#008955]" />
              <span>অভিভাবকের যোগাযোগ নম্বরসমূহ</span>
            </span>
            <span className="text-[9.5px] font-bold text-[#008955] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              জরুরি যোগাযোগ
            </span>
          </div>

          {student.guardianContacts && student.guardianContacts.length > 0 ? (
            <div className="space-y-2 pt-0.5">
              {student.guardianContacts.map((contact, idx) => (
                <div key={idx} className="flex items-center justify-between bg-[#F7FBF9] px-3 py-2 rounded-xl border border-[#E1EDE6]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#008955] bg-[#E7F6ED] border border-[#BBE3D3] px-2 py-0.5 rounded-md">
                      {contact.title || 'অভিভাবক'}
                    </span>
                    <span className="font-bold font-sans text-slate-800 text-xs">{contact.phone}</span>
                  </div>
                  {contact.phone ? (
                    <a
                      href={`tel:${contact.phone}`}
                      className="text-[10px] font-bold text-[#008955] bg-white px-2.5 py-1 rounded-lg border border-[#BBE3D3] hover:bg-[#E7F6ED] transition flex items-center gap-1 shadow-2xs"
                    >
                      <Phone size={10} />
                      <span>কল দিন</span>
                    </a>
                  ) : (
                    <span className="text-[10px] text-slate-400">নম্বর নেই</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-between bg-[#F7FBF9] px-3 py-2 rounded-xl border border-[#E1EDE6]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#008955] bg-[#E7F6ED] border border-[#BBE3D3] px-2 py-0.5 rounded-md">
                  অভিভাবক
                </span>
                <span className="font-bold font-sans text-slate-800 text-xs">{student.phone || 'তথ্য নেই'}</span>
              </div>
              {student.phone && (
                <a
                  href={`tel:${student.phone}`}
                  className="text-[10px] font-bold text-[#008955] bg-white px-2.5 py-1 rounded-lg border border-[#BBE3D3] hover:bg-[#E7F6ED] transition flex items-center gap-1 shadow-2xs"
                >
                  <Phone size={10} />
                  <span>কল দিন</span>
                </a>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2.5">
          
          {/* ১. মাসিক ফি কার্ড (প্রধান হাইলাইট ও বড় কার্ড) */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50/70 to-white rounded-2xl border border-emerald-200/80 p-3.5 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#008955] to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10.5px] text-emerald-800 block font-bold">নির্ধারিত মাসিক ফি</span>
                <span className="text-[11px] text-slate-500 font-medium">খোরাকি ও সাধারণ বেতন</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-lg font-black text-[#008955] font-sans block">
                ৳ {Number(student.monthlyFee || 1500).toLocaleString('en-US')}
              </span>
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.2 rounded-md">
                নিয়মিত
              </span>
            </div>
          </div>

          {/* ২ ও ৩. পাশাপাশি ২টি ছোট কার্ড (রক্তের গ্রুপ ও কক্ষ নং) */}
          <div className="grid grid-cols-2 gap-2.5">
            
            {/* রক্তের গ্রুপ */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs flex items-center gap-2.5">
              <div className="h-8.5 w-8.5 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
                <Droplet className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-medium">রক্তের গ্রুপ</span>
                <span className="font-bold text-slate-900 text-xs truncate block">{student.bloodGroup || 'O+'}</span>
              </div>
            </div>

            {/* ছাত্রাবাস সিট ও কক্ষ নং */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs flex items-center gap-2.5">
              <div className="h-8.5 w-8.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-medium">ছাত্রাবাস সিট</span>
                <span className="font-bold text-slate-900 text-xs truncate block">কক্ষ নং: ২০৪ (মুকিম)</span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* ================= ৩. মার্জিত লগআউট বাটন ================= */}
      <button
        type="button"
        onClick={() => onLogout?.()}
        className="w-full py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shadow-2xs mt-3"
      >
        <LogOut className="w-4 h-4" /> অ্যাকাউন্ট থেকে লগআউট
      </button>

    </div>
  );
};