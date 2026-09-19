'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Wallet,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Calendar,
  X,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { localDb } from '@/db/localDb';
import type { Student } from '@/types/database.types';

export interface FeeRecord {
  id: string;
  studentId: string;
  amount: number;
  month: string;
  feeType: string;
  paymentDate: string;
  paymentMethod: string;
  receiptNo: string;
  note?: string;
  createdAt?: string;
}

interface StudentFeeTabProps {
  student: Student;
}

export function StudentFeeTab({ student }: StudentFeeTabProps) {
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedReceipt, setSelectedReceipt] = useState<FeeRecord | null>(null);
  const [fetchedMonthlyFee, setFetchedMonthlyFee] = useState<number | null>(null);

  const currentMonthISO = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const studentDisplayId = useMemo(
    () => student?.admissionNo || student?.id || (student as any)?.identifier || 'N/A',
    [student]
  );

  // ১. ডায়নামিক নির্ধারিত মাসিক ফি নির্ধারণ (প্রোফাইল -> ডাটাবেস -> পেমেন্ট হিস্ট্রি ফলব্যাক)
  const monthlyFeeAmount = useMemo(() => {
    const rawFee =
      (student as any)?.monthlyFee ??
      (student as any)?.monthly_fee ??
      (student as any)?.fee;

    if (rawFee && Number(rawFee) > 0) {
      return Number(rawFee);
    }
    if (fetchedMonthlyFee && fetchedMonthlyFee > 0) {
      return fetchedMonthlyFee;
    }
    // যদি প্রোফাইলে ০ থাকে কিন্তু পূর্বের কোনো মাসিক বেতনের রেকর্ড থাকে
    const previousMonthlyPayment = feeRecords.find(
      (f) =>
        f.feeType?.includes('বেতন') ||
        f.feeType?.includes('মাসিক') ||
        f.month?.includes('২০')
    );
    if (previousMonthlyPayment && previousMonthlyPayment.amount > 0) {
      return previousMonthlyPayment.amount;
    }

    return 0;
  }, [student, fetchedMonthlyFee, feeRecords]);

  useEffect(() => {
    const fetchFeeHistory = async () => {
      try {
        setIsLoading(true);

        const candidateIds = Array.from(
          new Set(
            [
              String(student?.id || '').trim(),
              String(student?.admissionNo || '').trim(),
              String((student as any)?.identifier || '').trim(),
              String(student?.rollNo || '').trim(),
            ].filter(Boolean)
          )
        );

        if (candidateIds.length === 0) {
          setFeeRecords([]);
          setIsLoading(false);
          return;
        }

        // শিক্ষার্থীদের ডাটাবেজ টেবিল থেকে সরাসরি মাসিক ফি ফেচ করার চেষ্টা
        try {
          const { data: stdData } = await supabase
            .from('students')
            .select('monthly_fee, monthlyFee, fee')
            .or(`id.in.(${candidateIds.map((id) => `"${id}"`).join(',')}),admission_no.in.(${candidateIds.map((id) => `"${id}"`).join(',')})`)
            .maybeSingle();

          if (stdData) {
            const fee = stdData.monthly_fee ?? stdData.monthlyFee ?? stdData.fee;
            if (fee) setFetchedMonthlyFee(Number(fee));
          }
        } catch (e) {
          // ইগনোর ফলব্যাক
        }

        let records: FeeRecord[] = [];

        // ২. সুপাবেস student_fees টেবিল থেকে ডাটা ফেচ
        try {
          const { data, error } = await supabase
            .from('student_fees')
            .select('*')
            .in('student_id', candidateIds)
            .order('created_at', { ascending: false });

          if (error) {
            console.warn('Fee fetch error:', error.message);
          } else if (data && data.length > 0) {
            records = data.map((f: any) => ({
              id: String(f.id),
              studentId: String(f.student_id || student.id),
              amount: Number(f.amount || 0),
              month: f.month || 'চলতি মাস',
              feeType:
                f.fee_type ||
                f.feeType ||
                f.type ||
                f.fee_category ||
                (f.note?.includes('ভর্তি') ? 'ভর্তি ফি' : 'মাসিক বেতন'),
              paymentDate: f.paid_at
                ? f.paid_at.split('T')[0]
                : f.created_at
                ? f.created_at.split('T')[0]
                : new Date().toISOString().split('T')[0],
              paymentMethod:
                f.payment_method === 'cash' ? 'নগদ ক্যাশ' : f.payment_method || 'নগদ ক্যাশ',
              receiptNo: f.receipt_no || `REC-${String(f.id).slice(-6)}`,
              note: f.note || f.notes || f.remarks || '',
              createdAt: f.created_at || f.paid_at,
            }));
          }
        } catch (e: any) {
          console.warn('Network error (student_fees):', e?.message || e);
        }

        // ৩. লোকাল IndexedDB ব্যাকআপ থেকে লোড (যদি সুপাবেস অফলাইন থাকে)
        if (records.length === 0) {
          try {
            const localPayments = await localDb.feePayments.toArray();
            records = localPayments
              .filter((p) => candidateIds.includes(String(p.studentId).trim()))
              .map((p: any) => ({
                id: p.id,
                studentId: p.studentId,
                amount: Number(p.amount || 0),
                month: p.month || 'চলতি মাস',
                feeType: p.feeType || p.feeCategory || 'মাসিক বেতন',
                paymentDate: p.paymentDate || new Date().toISOString().split('T')[0],
                paymentMethod: p.paymentMethod === 'cash' ? 'নগদ ক্যাশ' : p.paymentMethod || 'নগদ ক্যাশ',
                receiptNo: p.receiptNo || `REC-${p.id.slice(-6)}`,
                note: p.feeTypeId || p.notes || '',
                createdAt: p.createdAt,
              }));
          } catch (e) {
            console.warn('Local Fee Fetch Warning:', e);
          }
        }

        setFeeRecords(records);
      } catch (err) {
        console.warn('Fee Fetch Error:', err);
        setFeeRecords([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeeHistory();
  }, [student]);

  // চলতি মাসের ফি পরিশোধিত কিনা যাচাই
  const isCurrentMonthPaid = useMemo(() => {
    if (feeRecords.length === 0) return false;
    const currentMonthNum = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear().toString();

    return feeRecords.some((f) => {
      const mStr = String(f.month || '').toLowerCase();
      const pDate = String(f.paymentDate || '');

      return (
        pDate.startsWith(currentMonthISO) ||
        mStr.includes(currentMonthISO) ||
        (mStr.includes(currentYear) && mStr.includes(String(currentMonthNum))) ||
        mStr.includes('সেপ্টেম্বর')
      );
    });
  }, [feeRecords, currentMonthISO]);

  return (
    <div className="space-y-3.5 pb-24 font-['Noto_Sans_Bengali',sans-serif] animate-in fade-in duration-200">
      {/* ১. নির্ধারিত মাসিক ফি কার্ড */}
      <div className="relative rounded-3xl bg-gradient-to-tr from-[#008955] via-[#007a4c] to-[#04633e] p-5 text-white shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-200 flex items-center gap-1.5">
              <Wallet size={14} />
              <span>নির্ধারিত মাসিক ফি</span>
            </span>
            <p className="text-3xl font-black font-sans tracking-tight mt-1">
              ৳ {monthlyFeeAmount > 0 ? monthlyFeeAmount.toLocaleString('en-US') : '০'}
            </p>
          </div>

          {isCurrentMonthPaid ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 border border-emerald-300/40 px-3 py-1 text-xs font-bold text-emerald-100 shadow-2xs">
              <CheckCircle2 size={13} className="text-emerald-300" />
              <span>পরিশোধিত</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 border border-amber-300/40 px-3 py-1 text-xs font-bold text-amber-200 shadow-2xs">
              <AlertCircle size={13} className="text-amber-300" />
              <span>বকেয়া রয়েছে</span>
            </span>
          )}
        </div>

        <div className="mt-3.5 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-emerald-100">
          <span>চলতি মাস: {currentMonthISO}</span>
          <span className="font-bold text-white bg-black/20 px-2 py-0.5 rounded-md font-sans">
            আইডি: {studentDisplayId}
          </span>
        </div>
      </div>

      {/* ২. ফি পরিষদের ইতিহাস ও রসিদ তালিকা */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <FileText size={15} className="text-[#008955]" />
            <span>ফি পরিষদের ইতিহাস ও রসিদ</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-sans">
            মোট {feeRecords.length} টি রেকর্ড
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-3 border-[#008955] border-t-transparent"></div>
            <p className="mt-2 text-xs font-medium text-slate-400">ফি বিবরণ লোড হচ্ছে...</p>
          </div>
        ) : feeRecords.length > 0 ? (
          feeRecords.map((rec) => (
            <div
              key={rec.id}
              onClick={() => setSelectedReceipt(rec)}
              className="bg-white border border-[#DFECE5] rounded-2xl p-3.5 shadow-2xs hover:border-[#008955] active:scale-[0.99] transition cursor-pointer space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#E7F6ED] text-[#008955] border border-[#CDE9DC] flex items-center justify-center shrink-0">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        {rec.feeType}
                      </h4>
                      <span className="text-[10px] bg-emerald-50 text-[#008955] font-semibold px-1.5 py-0.5 rounded border border-emerald-100">
                        {rec.month}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-sans mt-1 flex items-center gap-1">
                      <Calendar size={11} className="text-[#008955]" />
                      <span>{rec.paymentDate}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-[#008955] font-sans block">
                    ৳ {rec.amount.toLocaleString('en-US')}
                  </span>
                  <span className="inline-block mt-0.5 rounded-md bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 uppercase">
                    {rec.paymentMethod}
                  </span>
                </div>
              </div>

              {rec.note ? (
                <div className="bg-slate-50 rounded-xl px-2.5 py-1 text-[10px] text-slate-600 border border-slate-100 truncate">
                  <span className="font-bold text-[#008955]">নোট:</span> {rec.note}
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-[#DFECE5] bg-white p-8 text-center shadow-2xs">
            <Receipt size={28} className="mx-auto text-slate-300" />
            <p className="mt-2 text-xs font-bold text-slate-700">কোনো ফি রেকর্ড পাওয়া যায়নি</p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              অফিস থেকে ফি এন্ট্রি দেওয়া হলে এখানে স্বয়ংক্রিয়ভাবে রসিদ দৃশ্যমান হবে।
            </p>
          </div>
        )}
      </div>

      {/* ৩. অফিশিয়াল মানি রসিদ ভাউচার মোডাল */}
      {selectedReceipt && (
        <div
          onClick={() => setSelectedReceipt(null)}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 font-['Noto_Sans_Bengali',sans-serif] animate-in fade-in"
        >
          <div
            id="student-printable-receipt"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[360px] rounded-3xl bg-white p-5 shadow-2xl border border-emerald-300 text-slate-800"
          >
            {/* হেডার */}
            <div className="text-center pb-3 border-b border-dashed border-emerald-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  অভিভাবক কপি
                </span>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="h-7 w-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="h-10 w-10 mx-auto rounded-2xl bg-[#E7F6ED] text-[#008955] flex items-center justify-center mb-1">
                <ShieldCheck size={24} />
              </div>
              <h2 className="text-sm font-black text-slate-900 leading-snug text-center">মাদ্রাসায়ে ইসলামিয়া দারুল উলুম, কোম্পানিগঞ্জ।</h2>
              <p className="text-[10px] text-[#008955] font-bold mt-0.5">মানি রসিদ ও আদায় ভাউচার</p>
              <p className="text-[9px] text-slate-400 font-mono mt-0.5">রসিদ নং: {selectedReceipt.receiptNo}</p>
            </div>

            {/* রসিদ কন্টেন্ট */}
            <div className="py-3 space-y-2.5 text-xs">
              {/* শিক্ষার্থী তথ্য ও ফি এর ধরণ */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">শিক্ষার্থীর নাম:</span>
                  <span className="font-bold text-slate-900">{student?.fullNameBangla || student?.fullName}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">আইডি ও শ্রেণি:</span>
                  <span className="font-bold text-[#008955]">
                    {studentDisplayId} • {student?.className || 'সাধারণ'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-200/70">
                  <span className="text-slate-500">ফি এর ধরণ:</span>
                  <span className="font-bold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded text-[11px]">
                    {selectedReceipt.feeType}
                  </span>
                </div>
              </div>

              {/* মাস, তারিখ ও পেমেন্ট মাধ্যম */}
              <div className="space-y-1.5 pt-0.5 text-[11px] px-0.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">মাস:</span>
                  <span className="font-bold text-slate-800">{selectedReceipt.month}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">পরিশোধের তারিখ:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedReceipt.paymentDate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">পেমেন্ট মাধ্যম:</span>
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    {selectedReceipt.paymentMethod}
                  </span>
                </div>
                {selectedReceipt.note && (
                  <div className="flex justify-between items-center pt-0.5">
                    <span className="text-slate-500">মন্তব্য / নোট:</span>
                    <span className="font-medium text-slate-700">{selectedReceipt.note}</span>
                  </div>
                )}
              </div>

              {/* টাকার পরিমাণ বক্স */}
              <div className="my-2 p-3 rounded-2xl bg-[#E7F6ED] border border-emerald-200 text-center">
                <span className="text-[10px] font-bold text-[#008955] block">পরিশোধিত টাকার পরিমাণ</span>
                <p className="text-2xl font-black text-[#008955] font-sans mt-0.5">
                  ৳ {selectedReceipt.amount.toLocaleString('en-US')}
                </p>
                <span className="text-[9px] font-bold text-emerald-700">স্ট্যাটাস: পেইড (PAID)</span>
              </div>
            </div>

            {/* ফুটার সাইন ও ক্লোজ বাটন */}
            <div className="pt-2 border-t border-dashed border-slate-200">
              <div className="flex justify-between items-end pb-3 text-[9px] text-slate-400">
                <div className="text-center">
                  <div className="w-16 border-b border-slate-300 mb-1"></div>
                  <span>অভিভাবক</span>
                </div>
                <div className="text-center">
                  <div className="w-20 border-b border-slate-300 mb-1"></div>
                  <span>আদায়কারী হিসাবরক্ষক</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}