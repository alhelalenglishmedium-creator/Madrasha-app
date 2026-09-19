'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  GraduationCap,
  Users,
  ArrowRight,
  ArrowLeft,
  Loader2,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// ১. সিস্টেমে অন্তর্ভুক্ত ৩টি শিক্ষা প্রতিষ্ঠান
const INSTITUTIONS = [
  {
    id: 'darul_ulum',
    name: 'মাদ্রাসায়ে ইসলামিয়া দারুল উলুম, কোম্পানিগঞ্জ।',
    tagline: 'কওমি ও হিফজুল কুরআন শাখা',
  },
  {
    id: 'al_helal',
    name: 'আল হেলাল ইংলিশ মিডিয়াম ইসলামিক স্কুল',
    tagline: 'ইংলিশ ভার্সন ও কম্বাইন্ড শিক্ষা',
  },
  {
    id: 'ayesha_siddika',
    name: 'আয়েশা সিদ্দিকা মহিলা কওমি মাদ্রাসা',
    tagline: 'মহিলা কওমি ও হিফজ শাখা',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { user, loginWithGoogle, updateUserRole, logout, isLoading } = useAuth();

  // অনবোর্ডিং ফ্লো স্টেট ম্যানেজমেন্ট (Step 1 -> Step 2 -> Step 3)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedInstitution, setSelectedInstitution] = useState<typeof INSTITUTIONS[0] | null>(null);

  // লোগো লোড এরর হ্যান্ডলিং স্টেট
  const [logoError1, setLogoError1] = useState(false);
  const [logoError2, setLogoError2] = useState(false);

  // রোল ও ইনপুট স্টেট
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher'>('student');
  const [teacherName, setTeacherName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // পৃষ্ঠা লোড হলে পূর্বে সংরক্ষিত প্রতিষ্ঠান ও ইউজার সেশন চেক
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedInst = localStorage.getItem('selected_institution');
      if (savedInst) {
        try {
          const parsed = JSON.parse(savedInst);
          if (parsed && parsed.name) {
            setSelectedInstitution(parsed);
          }
        } catch (e) {}
      }
    }
  }, []);

  // ইউজার সাইন ইন অবস্থায় থাকলে উপযুক্ত ধাপে রিডাইরেক্ট
  useEffect(() => {
    if (!isLoading) {
      if (user && user.role) {
        router.replace('/dashboard');
      } else if (user && !user.role) {
        // গুগল দিয়ে সাইন ইন সফল কিন্তু রোল নির্ধারিত হয়নি -> সরাসরি স্ক্রিন ৩
        setCurrentStep(3);
      }
    }
  }, [user, isLoading, router]);

  // স্ক্রিন ১: প্রতিষ্ঠান নির্বাচন হ্যান্ডলার
  const handleSelectInstitution = (inst: typeof INSTITUTIONS[0]) => {
    setSelectedInstitution(inst);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selected_institution', JSON.stringify(inst));
    }
    setErrorMessage('');
    setCurrentStep(2); // স্বয়ংক্রিয়ভাবে স্ক্রিন ২-এ রূপান্তর
  };

  // স্ক্রিন ৩: রোল ও তথ্য জমা দেওয়া হ্যান্ডলার
  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = identifier.trim();

    if (!rawInput) {
      setErrorMessage('আপনার ইউআইডিটি সঠিক নয়! সঠিক তথ্য দিন অথবা অ্যাডমিনের সাথে যোগাযোগ করুন।');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await updateUserRole(selectedRole, rawInput);
      if (res && res.success) {
        router.replace('/dashboard');
      } else {
        setErrorMessage(
          res?.message || 'আপনার ইউআইডিটি সঠিক নয়! সঠিক তথ্য দিন অথবা অ্যাডমিনের সাথে যোগাযোগ করুন।'
        );
      }
    } catch (err) {
      setErrorMessage('আপনার ইউআইডিটি সঠিক নয়! সঠিক তথ্য দিন অথবা অ্যাডমিনের সাথে যোগাযোগ করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  // লোডিং স্পিনার (সেশন ভেরিফিকেশনের সময় ফ্লিকারিং বন্ধ রাখতে)
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-4 text-slate-900 font-hind">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#064e3b] border-t-transparent" />
          <p className="text-xs font-bold text-[#064e3b]">সেশন যাচাই করা হচ্ছে...</p>
        </div>
      </div>
    );
  }

  // যদি ইউজার অলরেডি ড্যাশবোর্ডে নেভিগেট হচ্ছে
  if (user && user.role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-4 text-slate-900 font-hind">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#064e3b] border-t-transparent" />
          <p className="text-xs font-bold text-[#064e3b]">ড্যাশবোর্ডে রিডাইরেক্ট করা হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f1f5f9] p-4 text-slate-900 antialiased font-hind selection:bg-[#064e3b] selection:text-white">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">

        {/* [স্থান ১] অ্যাপ মূল ব্র্যান্ডিং ও টপ হেডার লোগো */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#064e3b] text-white shadow-md p-1.5 border border-emerald-100/50 overflow-hidden">
            {!logoError1 ? (
              <img
                src="/logo.png"
                alt="Institute Logo"
                className="w-full h-full object-contain rounded-xl"
                onError={() => setLogoError1(true)}
              />
            ) : (
              <ShieldCheck size={32} />
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">
              {selectedInstitution ? selectedInstitution.name : 'স্মার্ট অ্যাকাডেমিক পোর্টাল'}
            </h1>
            <p className="text-xs text-emerald-800 font-medium mt-0.5">
              মাদ্রাসা ও শিক্ষা প্রতিষ্ঠান পরিচালন ব্যবস্থা
            </p>
          </div>
        </div>

        {/* =========================================================
            স্ক্রিন ১: ইনস্টিটিউট সিলেকশন (ওয়েলকাম স্ক্রিন)
           ========================================================= */}
        {currentStep === 1 && (
          <div className="space-y-4 pt-1 animate-in fade-in duration-200">
            {/* [স্থান ২] ইনফো ব্যানার সাব-লোগো */}
            <div className="rounded-2xl bg-emerald-50/60 border border-emerald-100 p-3.5 text-center">
              <div className="mx-auto h-10 w-10 mb-1 flex items-center justify-center rounded-xl bg-white p-1 border border-emerald-100 shadow-2xs overflow-hidden">
                {!logoError2 ? (
                  <img
                    src="/logo.png"
                    alt="Institute Logo"
                    className="w-full h-full object-contain rounded-lg"
                    onError={() => setLogoError2(true)}
                  />
                ) : (
                  <Building2 className="h-5 w-5 text-[#064e3b]" />
                )}
              </div>
              <p className="text-xs font-bold text-[#064e3b]">ইনস্টিটিউট নির্বাচন করুন</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                এগিয়ে যেতে নিচে আপনার শিক্ষা প্রতিষ্ঠান বেছে নিন
              </p>
            </div>

            {/* প্রতিষ্ঠান কার্ডসমূহ */}
            <div className="space-y-2.5">
              {INSTITUTIONS.map((inst) => {
                const isSelected = selectedInstitution?.id === inst.id;

                return (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => handleSelectInstitution(inst)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-[#064e3b] bg-emerald-50/50 ring-2 ring-[#064e3b]/20 shadow-xs'
                        : 'border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <h2 className="text-xs font-bold text-slate-900 leading-tight truncate">
                        {inst.name}
                      </h2>
                      <p className="text-[10.5px] text-slate-500 font-medium">
                        {inst.tagline}
                      </p>
                    </div>

                    <div
                      className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[#064e3b] text-white'
                          : 'bg-slate-200/80 text-slate-500'
                      }`}
                    >
                      <ArrowRight size={16} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================
            স্ক্রিন ২: গুগল / জিমেইল অথেনটিকেশন স্ক্রিন
           ========================================================= */}
        {currentStep === 2 && !user && (
          <div className="space-y-5 pt-1 animate-in fade-in duration-200">
            {/* ব্যাক বাটন ও প্রতিষ্ঠান সামারি */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>প্রতিষ্ঠান পরিবর্তন</span>
              </button>

              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                ধাপ ২ / ৩
              </span>
            </div>

            <div className="rounded-2xl bg-emerald-50/60 border border-emerald-100 p-4 text-center space-y-1">
              <div className="mx-auto h-12 w-12 mb-1 flex items-center justify-center rounded-xl bg-white p-1 border border-emerald-100 shadow-2xs overflow-hidden">
                {!logoError2 ? (
                  <img
                    src="/logo.png"
                    alt="Institute Logo"
                    className="w-full h-full object-contain rounded-lg"
                    onError={() => setLogoError2(true)}
                  />
                ) : (
                  <Building2 className="h-6 w-6 text-[#064e3b]" />
                )}
              </div>
              <p className="text-xs font-bold text-[#064e3b]">
                {selectedInstitution?.name}
              </p>
              <p className="text-[11px] text-slate-600 font-medium">
                এগিয়ে যেতে আপনার জিমেইল অ্যাকাউন্ট নির্বাচন করুন
              </p>
            </div>

            {/* স্ট্যান্ডার্ড ফ্ল্যাট জিমেইল আইকন যুক্ত বাটন */}
            <button
              type="button"
              onClick={loginWithGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-3.5 px-4 text-sm font-bold text-slate-700 shadow-xs transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] cursor-pointer"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Gmail</span>
            </button>
          </div>
        )}

        {/* =========================================================
            স্ক্রিন ৩: রোল সিলেকশন ও ভ্যালিডেশন স্ক্রিন (Conditional Logic)
           ========================================================= */}
        {user && !user.role && (
          <div className="space-y-5 pt-1 animate-in fade-in duration-200">
            <div className="text-center space-y-1">
              <p className="text-xs font-bold text-[#064e3b]">
                স্বাগতম, {user.name}!
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                আপনার পরিচয় ও ভূমিকা নিশ্চিত করুন
              </p>
            </div>

            <form onSubmit={handleRoleSubmit} className="space-y-4">

              {/* ১. ভূমিকা নির্বাচন (শিক্ষার্থী বনাম শিক্ষক) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  আপনার ভূমিকা নির্বাচন করুন:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('student');
                      setErrorMessage('');
                    }}
                    className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-3.5 transition-all active:scale-95 cursor-pointer ${
                      selectedRole === 'student'
                        ? 'border-[#064e3b] bg-emerald-50/40 ring-2 ring-[#064e3b]/20 text-[#064e3b] shadow-xs'
                        : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        selectedRole === 'student'
                          ? 'bg-[#064e3b] text-white'
                          : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div className="text-center">
                      <span className="block text-xs font-bold">শিক্ষার্থী (Student)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('teacher');
                      setErrorMessage('');
                    }}
                    className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-3.5 transition-all active:scale-95 cursor-pointer ${
                      selectedRole === 'teacher'
                        ? 'border-[#064e3b] bg-emerald-50/40 ring-2 ring-[#064e3b]/20 text-[#064e3b] shadow-xs'
                        : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        selectedRole === 'teacher'
                          ? 'bg-[#064e3b] text-white'
                          : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="text-center">
                      <span className="block text-xs font-bold">শিক্ষক (Teacher)</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* ২. ডায়নামিক ইনপুট ফিল্ড (কন্ডিশনাল লজিক) */}
              {selectedRole === 'student' ? (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-xs font-bold text-slate-700">
                    ইউআইডি (UID) লিখুন:
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="যেমন: STU-101 বা ১০১"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-[#064e3b] focus:bg-white focus:outline-none transition shadow-2xs font-sans"
                    autoFocus
                    required
                  />
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      শিক্ষকের আইডি / UID লিখুন:
                    </label>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="যেমন: TEA-101 বা ৪৭৬"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-[#064e3b] focus:bg-white focus:outline-none transition shadow-2xs font-sans"
                      autoFocus
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      শিক্ষকের পূর্ণ নাম লিখুন (ঐচ্ছিক):
                    </label>
                    <input
                      type="text"
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                      placeholder="যেমন: মাওলানা আব্দুল্লাহ"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#064e3b] focus:bg-white focus:outline-none transition shadow-2xs"
                    />
                  </div>
                </div>
              )}

              {/* ৩. এরর মেসেজ প্রদর্শনী */}
              {errorMessage && (
                <div className="rounded-xl bg-rose-50 border border-[#fecdd3] p-3 text-center text-xs font-semibold text-rose-600 animate-in fade-in">
                  {errorMessage}
                </div>
              )}

              {/* ৪. সাবমিট বাটন */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#064e3b] hover:bg-[#003829] py-3 text-sm font-bold text-white transition-all active:scale-98 shadow-md disabled:opacity-70 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>যাচাই করা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <span>লগইন করুন</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* ৫. একাউন্ট পরিবর্তন */}
            <div className="pt-2 border-t border-slate-100 flex justify-center">
              <button
                type="button"
                onClick={logout}
                className="text-xs text-slate-500 hover:text-rose-600 font-bold flex items-center gap-1.5 transition cursor-pointer py-1"
              >
                <LogOut className="h-3.5 w-3.5 text-rose-500" />
                <span>অন্য জিমেইল দিয়ে সাইন ইন করুন</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
