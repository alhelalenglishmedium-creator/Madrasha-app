'use client';

import React, { useState, useEffect } from 'react';
import { X, Receipt, CheckCircle, Search, Sparkles, UserCheck, AlertCircle } from 'lucide-react';
import type { Student, PaymentMethod } from '@/types/database.types';

interface FeeCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: Student | null;
  studentsList?: Student[];
  onSavePayment: (paymentData: {
    studentId: string;
    amount: number;
    feeTypeId: string;
    month: string;
    paymentDate: string;
    paymentMethod: PaymentMethod;
    notes?: string;
  }) => Promise<void>;
}

export function FeeCollectionModal({
  isOpen,
  onClose,
  student,
  studentsList = [],
  onSavePayment,
}: FeeCollectionModalProps) {
  const [searchUid, setSearchUid] = useState('');
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [amount, setAmount] = useState<number>(1000);
  const [feeType, setFeeType] = useState('মাসিক বেতন');
  const [month, setMonth] = useState('সেপ্টেম্বর ২০২৬');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchError, setSearchError] = useState('');

  // মডাল ওপেন হলে অথবা সরাসরি স্টুডেন্ট কার্ড থেকে আসলে ডাটা ইনিশিয়ালাইজ করা
  useEffect(() => {
    if (student) {
      setActiveStudent(student);
      setSearchUid(student.rollNo || student.id || '');
      setAmount(student.monthlyFee || 1000);
    } else {
      setActiveStudent(null);
      setSearchUid('');
      setAmount(1000);
    }
    setErrorMessage('');
    setSearchError('');
  }, [student, isOpen]);

  // ইউআইডি (UID) বা রোল দিয়ে শিক্ষার্থী খোঁজা
  const handleSearchStudent = () => {
    setSearchError('');
    if (!searchUid.trim()) {
      setSearchError('অনুগ্রহ করে ইউআইডি বা রোল নম্বর লিখুন!');
      return;
    }

    const query = searchUid.trim().toLowerCase();
    const cleanQuery = query.replace(/[^a-zA-Z0-9]/g, '');

    const found = studentsList.find((s) => {
      const stdUid = (s.admissionNo || s.id || '').toLowerCase();
      const stdUidClean = stdUid.replace(/[^a-zA-Z0-9]/g, '');
      const roll = (s.rollNo || '').toString().toLowerCase();
      const phone = (s.phone || '').trim();

      return (
        stdUid === query ||
        stdUidClean === cleanQuery ||
        stdUid.includes(query) ||
        roll === query ||
        phone.includes(query)
      );
    });

    if (found) {
      setActiveStudent(found);
      setAmount(found.monthlyFee || 1000);
      setSearchError('');
    } else {
      setActiveStudent(null);
      setSearchError('এই ইউআইডি/রোলে কোনো শিক্ষার্থী পাওয়া যায়নি!');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) {
      setErrorMessage('অনুগ্রহ করে সঠিক ইউআইডি দিয়ে শিক্ষার্থী নির্বাচন নিশ্চিত করুন!');
      return;
    }
    if (!amount || amount <= 0) {
      setErrorMessage('সঠিক টাকার পরিমাণ প্রদান করুন!');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await onSavePayment({
        studentId: activeStudent.id,
        amount: Number(amount),
        feeTypeId: feeType,
        month,
        paymentDate,
        paymentMethod,
        notes,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'ফি সংগ্রহ সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[32px] bg-[#F7FBF9] p-5 sm:p-6 shadow-2xl border border-[#DFECE5] no-scrollbar">
        
        {/* হেডার */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#E7F0EB]">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[#008955] text-white flex items-center justify-center shadow-xs">
              <Receipt size={22} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1F2937]">ফি আদায় ও রসিদ তৈরি</h2>
              <p className="text-[11px] text-[#008955] font-medium">ইউআইডি দিয়ে সরাসরি ফি জমা করুন</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white border border-[#E5EFEA] flex items-center justify-center text-[#6B7280] hover:text-[#1F2937] hover:bg-[#F3F4F6] transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* এরর মেসেজ */}
        {errorMessage && (
          <div className="mt-3.5 rounded-2xl bg-rose-50 border border-rose-100 p-3 text-xs font-semibold text-rose-600">
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          
          {/* ১. ইউআইডি দিন (UID Search Field) */}
          {!student && (
            <div>
              <label className="text-[11px] font-bold text-[#374151] block mb-1 px-1">
                শিক্ষার্থীর ইউআইডি / আইডি / রোল দিন *
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="যেমন: UID-2026-01 বা ০১"
                    value={searchUid}
                    onChange={(e) => setSearchUid(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchStudent();
                      }
                    }}
                    className="w-full rounded-2xl border border-[#D9E7E0] bg-white px-3.5 py-2.5 text-xs font-bold text-[#1F2937] placeholder-[#9CA3AF] focus:border-[#008955] focus:outline-none shadow-2xs font-sans"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearchStudent}
                  className="h-10 px-4 rounded-2xl bg-[#008955] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-[#007347] active:scale-95 transition shrink-0"
                >
                  <Search size={14} />
                  <span>খুঁজুন</span>
                </button>
              </div>

              {searchError && (
                <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 mt-1.5 px-1">
                  <AlertCircle size={12} />
                  <span>{searchError}</span>
                </p>
              )}
            </div>
          )}

          {/* ২. খুঁজে পাওয়া শিক্ষার্থীর ইনফো কার্ড */}
          {activeStudent ? (
            <div className="rounded-[22px] bg-white border border-[#BBE3D3] p-3.5 flex items-center justify-between shadow-2xs animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-[#008955] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 font-sans">
                  {activeStudent.fullNameBangla?.charAt(0) || activeStudent.fullName?.charAt(0) || 'ছা'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="inline-flex items-center gap-1 bg-[#FEF3C7] text-[#92400E] text-[9px] font-bold px-2 py-0.5 rounded-full font-sans">
                      <Sparkles size={9} />
                      <span>UID: {activeStudent.admissionNo || activeStudent.id}</span>
                    </span>
                    <span className="text-[10px] text-[#008955] font-semibold bg-[#E7F6ED] px-1.5 py-0.5 rounded">
                      {activeStudent.className} বিভাগ
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#1F2937] leading-tight">
                    {activeStudent.fullNameBangla || activeStudent.fullName} (রোল: {activeStudent.rollNo || '০'})
                  </h4>
                  <p className="text-[10px] text-[#6B7280] mt-0.5">
                    পিতা: {activeStudent.fatherName || 'তথ্য নেই'} • ফোন: {activeStudent.phone || 'নেই'}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[9px] text-[#9CA3AF] block font-medium">নির্ধারিত ফি</span>
                <span className="text-xs font-black text-[#008955] font-sans">{activeStudent.monthlyFee || 0} ৳</span>
              </div>
            </div>
          ) : !student && (
            <div className="rounded-2xl border border-dashed border-[#DFECE5] p-3 text-center bg-[#F9FBFA]">
              <p className="text-[11px] text-[#9CA3AF]">
                ইউআইডি লিখে <strong className="text-[#008955]">Enter</strong> চাপুন বা খুঁজুন বাটনে ক্লিক করুন
              </p>
            </div>
          )}

          {/* ৩. ফি এর ধরণ (খাত) ও মাস */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-[#374151] block mb-1 px-1">
                ফি এর খাত *
              </label>
              <select
                value={feeType}
                onChange={(e) => setFeeType(e.target.value)}
                className="w-full rounded-2xl border border-[#D9E7E0] bg-white px-3 py-2 text-xs font-bold text-[#1F2937] focus:border-[#008955] focus:outline-none shadow-2xs cursor-pointer"
              >
                <option value="মাসিক বেতন">মাসিক বেতন</option>
                <option value="ভর্তি ফি">ভর্তি ফি</option>
                <option value="খাবার/বোর্ডিং ফি">খাবার/বোর্ডিং ফি</option>
                <option value="পরীক্ষা ফি">পরীক্ষা ফি</option>
                <option value="বই/কিতাব ফি">বই/কিতাব ফি</option>
                <option value="অন্যান্য">অন্যান্য</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#374151] block mb-1 px-1">
                মাস / সেশন
              </label>
              <input
                type="text"
                placeholder="যেমন: সেপ্টেম্বর ২০২৬"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full rounded-2xl border border-[#D9E7E0] bg-white px-3 py-2 text-xs font-medium text-[#1F2937] focus:border-[#008955] focus:outline-none shadow-2xs"
              />
            </div>
          </div>

          {/* ৪. টাকার পরিমাণ ও তারিখ */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-[#374151] block mb-1 px-1">
                টাকার পরিমাণ *
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full rounded-2xl border border-[#D9E7E0] bg-white px-3.5 py-2 text-sm font-black text-[#008955] focus:border-[#008955] focus:outline-none shadow-2xs"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#374151] block mb-1 px-1">
                জমার তারিখ *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-2xl border border-[#D9E7E0] bg-white px-3 py-2 text-xs font-medium text-[#1F2937] focus:border-[#008955] focus:outline-none shadow-2xs cursor-pointer"
                required
              />
            </div>
          </div>

          {/* ৫. পেমেন্ট মাধ্যম */}
          <div>
            <label className="text-[11px] font-bold text-[#374151] block mb-1.5 px-1">
              পেমেন্ট মাধ্যম *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'cash', label: 'নগদ' },
                { id: 'bkash', label: 'বিকাশ' },
                { id: 'nagad', label: 'নগদ অ্যাপ' },
                { id: 'bank', label: 'ব্যাংক' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                  className={`rounded-xl py-2 text-center text-xs font-bold transition-all ${
                    paymentMethod === m.id
                      ? 'bg-[#008955] text-white shadow-xs'
                      : 'bg-white border border-[#D9E7E0] text-[#4B5563] hover:bg-[#EDF4F0]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* ৬. মন্তব্য */}
          <div>
            <label className="text-[11px] font-bold text-[#374151] block mb-1 px-1">
              মন্তব্য / রসিদ নোট (ঐচ্ছিক)
            </label>
            <input
              type="text"
              placeholder="যেমন: অভিভাবক নিজে এসে জমা দিয়েছেন"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-2xl border border-[#D9E7E0] bg-white px-3.5 py-2 text-xs font-medium text-[#1F2937] focus:border-[#008955] focus:outline-none shadow-2xs"
            />
          </div>

          {/* অ্যাকশন বাটন */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E7F0EB]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-[#D9E7E0] bg-white px-4 py-2 text-xs font-bold text-[#6B7280] hover:bg-[#F3F4F6] active:scale-95 transition"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !activeStudent}
              className="flex items-center gap-1.5 rounded-2xl bg-[#008955] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#007347] active:scale-95 transition disabled:opacity-50"
            >
              <CheckCircle size={15} />
              <span>{isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'টাকা গ্রহণ করুন'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}