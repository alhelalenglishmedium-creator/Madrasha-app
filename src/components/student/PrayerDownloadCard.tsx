'use client';

import React, { useState } from 'react';
import { Download, Database, CheckCircle2, Loader2 } from 'lucide-react';

export function PrayerDownloadCard() {
  const [downloading, setDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);

  // আপনার সুপাবেস স্টোরেজ পাবলিক ইউআরএল
  const DB_FILE_URL = 'https://pupleaopydtjqlcplaha.supabase.co/storage/v1/object/public/prayer%20time/prayer_time.db';

  const handleDownload = async () => {
    try {
      setDownloading(true);

      // সরাসরি ইউআরএল থেকে ব্লব (Blob) আকারে ফেচ করে ডাউনলোড ট্রিগার
      const res = await fetch(DB_FILE_URL);
      if (!res.ok) throw new Error('ফাইল ডাউনলোড ব্যর্থ হয়েছে');
      
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'prayer_time.db';
      document.body.appendChild(link);
      link.click();
      
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(link);

      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 4000);
    } catch (err) {
      console.error('ডাউনলোড সমস্যা:', err);
      // ফলব্যাক হিসেবে সরাসরি লিংক ওপেন
      window.open(DB_FILE_URL, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-emerald-200/80 p-3.5 shadow-xs flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#E7F6ED] text-[#008955] border border-emerald-200 flex items-center justify-center shrink-0">
          <Database size={20} />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-900 leading-tight">
            নামাজের সময়সূচি ডাটাবেজ
          </h4>
          <p className="text-[10px] text-slate-500 font-sans mt-0.5">
            prayer_time.db (Supabase স্টোরেজ)
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="px-3.5 py-2 rounded-xl bg-[#008955] hover:bg-[#007548] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-60"
      >
        {downloading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>ডাউনলোড হচ্ছে...</span>
          </>
        ) : downloadDone ? (
          <>
            <CheckCircle2 size={14} className="text-emerald-200" />
            <span>সম্পন্ন হয়েছে</span>
          </>
        ) : (
          <>
            <Download size={14} />
            <span>ডাউনলোড করুন</span>
          </>
        )}
      </button>
    </div>
  );
}