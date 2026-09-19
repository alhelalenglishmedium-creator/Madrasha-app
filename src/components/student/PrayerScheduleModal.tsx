'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Bell,
  BellRing,
  BellOff,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  ChevronDown,
  Info,
  ShieldCheck,
  Play,
  Pause,
  Volume2,
  CheckCircle2,
  Clock,
  Plus,
  Minus,
} from 'lucide-react';
import {
  calculateOfflinePrayerTimes,
  formatTimeBengali,
  formatCountdownBengali,
  toBengaliNumber,
  BANGLADESH_DISTRICTS,
  DEFAULT_COORDINATES,
  CalculatedPrayerData,
} from '@/lib/prayerCalculator';

interface PrayerScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AlarmConfig {
  enabled: boolean;
  timeString: string; // যেমন: "04:23"
}

/* বাংলা ক্যালেন্ডার অফলাইন ক্যালকুলেটর */
function getBanglaDateDetails(date: Date) {
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

  const banglaMonths = [
    'বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন',
    'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র',
  ];
  const seasons = ['গ্রীষ্মকাল', 'বর্ষাকাল', 'শরৎকাল', 'হেমন্তকাল', 'শীতকাল', 'বসন্তকাল'];

  let bYear = year - 593;
  let bMonthIndex = 0;
  let bDay = 1;

  if (month < 3 || (month === 3 && day < 14)) {
    bYear -= 1;
  }

  const daysInBanglaMonths = [
    31, 31, 31, 31, 31, 31,
    30, 30, 30, 30,
    isLeapYear ? 30 : 29,
    30,
  ];

  const baseDate = new Date(year, 3, 14);
  if (date < baseDate) {
    baseDate.setFullYear(year - 1);
  }

  const diffTime = date.getTime() - baseDate.getTime();
  let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  for (let i = 0; i < 12; i++) {
    if (diffDays < daysInBanglaMonths[i]) {
      bMonthIndex = i;
      bDay = diffDays + 1;
      break;
    }
    diffDays -= daysInBanglaMonths[i];
  }

  const seasonName = seasons[Math.floor(bMonthIndex / 2)];

  return {
    day: toBengaliNumber(bDay),
    month: banglaMonths[bMonthIndex],
    year: toBengaliNumber(bYear),
    season: seasonName,
    fullBanglaDate: `${toBengaliNumber(bDay)} ${banglaMonths[bMonthIndex]}, ${toBengaliNumber(bYear)} বঙ্গাব্দ`,
  };
}

export function PrayerScheduleModal({ isOpen, onClose }: PrayerScheduleModalProps) {
  const [coords, setCoords] = useState<{ lat: number; lng: number; isGps: boolean }>({
    lat: DEFAULT_COORDINATES.latitude,
    lng: DEFAULT_COORDINATES.longitude,
    isGps: false,
  });

  const [selectedDistrict, setSelectedDistrict] = useState<string>('ঢাকা');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [gpsError, setGpsError] = useState<string | null>(null);

  // ওয়াক্ত ভিত্তিক অ্যালার্ম স্টেট (শুরুতে সব অফ থাকবে)
  const [alarmSettings, setAlarmSettings] = useState<{ [prayerName: string]: AlarmConfig }>({});
  const [activeModalPrayer, setActiveModalPrayer] = useState<{ name: string; defaultTime: string } | null>(null);
  const [scheduledTime, setScheduledTime] = useState<string>('05:00');
  const [toastMessage, setToastMessage] = useState<string>('');

  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // লোকাল স্টোরেজ থেকে অ্যালার্ম ডাটা লোড
  useEffect(() => {
    try {
      const saved = localStorage.getItem('madrasa_prayer_alarms');
      if (saved) {
        setAlarmSettings(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveAlarmsToStorage = (updated: { [prayerName: string]: AlarmConfig }) => {
    setAlarmSettings(updated);
    try {
      localStorage.setItem('madrasa_prayer_alarms', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
  };

  // জিপিএস সংযোগ
  useEffect(() => {
    if (!isOpen) return;

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            isGps: true,
          });
          setGpsError(null);
        },
        () => {
          setGpsError('ডিভাইস জিপিএস বন্ধ। নির্ধারিত জেলা ব্যবহার হচ্ছে।');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    }
  }, [isOpen]);

  // প্রতি সেকেন্ডে সময় আপডেট ও অটো-আজান চেকার
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // বর্তমান সময়ের সাথে শিডিউলকৃত অ্যালার্ম মিললে আজান চালানো
      const currentHoursMinutes = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const currentSeconds = now.getSeconds();

      if (currentSeconds === 0) {
        Object.entries(alarmSettings).forEach(([prayer, config]) => {
          if (config.enabled && config.timeString === currentHoursMinutes) {
            playAzanAudio();
            showToast(`${prayer} নামাজের আজান শুরু হয়েছে!`);
          }
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, alarmSettings]);

  const handleDistrictChange = (districtName: string) => {
    setSelectedDistrict(districtName);
    const dCoord = BANGLADESH_DISTRICTS[districtName] || DEFAULT_COORDINATES;
    setCoords({
      lat: dCoord.latitude,
      lng: dCoord.longitude,
      isGps: false,
    });
  };

  const prayerData: CalculatedPrayerData = useMemo(() => {
    return calculateOfflinePrayerTimes(coords.lat, coords.lng, currentTime);
  }, [coords, currentTime]);

  const banglaDateInfo = useMemo(() => {
    return getBanglaDateDetails(currentTime);
  }, [currentTime]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // public/audio/azan.mp3 থেকে আজান চালানো
  const playAzanAudio = () => {
    if (audioRef.current) {
      audioRef.current.src = '/audio/azan.mp3';
      audioRef.current.play().then(() => {
        setIsPlayingPreview(true);
      }).catch((err) => {
        console.warn('অডিও প্লে ত্রুটি:', err);
      });
      audioRef.current.onended = () => setIsPlayingPreview(false);
    }
  };

  const stopAzanAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingPreview(false);
    }
  };

  // অ্যালার্ম বাটনে ক্লিক
  const handleOpenAlarmModal = (prayerName: string, timeDateObj: Date) => {
    const hours = String(timeDateObj.getHours()).padStart(2, '0');
    const minutes = String(timeDateObj.getMinutes()).padStart(2, '0');
    const defaultTimeStr = `${hours}:${minutes}`;

    const existing = alarmSettings[prayerName];
    setScheduledTime(existing?.timeString || defaultTimeStr);
    setActiveModalPrayer({ name: prayerName, defaultTime: defaultTimeStr });
  };

  // সময়ের পরিবর্তন (+ / - ৫ মিনিট)
  const handleAdjustMinutes = (minutesOffset: number) => {
    const [h, m] = scheduledTime.split(':').map(Number);
    const date = new Date();
    date.setHours(h);
    date.setMinutes(m + minutesOffset);

    const newH = String(date.getHours()).padStart(2, '0');
    const newM = String(date.getMinutes()).padStart(2, '0');
    setScheduledTime(`${newH}:${newM}`);
  };

  // অ্যালার্ম সক্রিয় (ON) করা
  const handleSaveAndTurnOn = () => {
    if (!activeModalPrayer) return;

    const updated = {
      ...alarmSettings,
      [activeModalPrayer.name]: {
        enabled: true,
        timeString: scheduledTime,
      },
    };
    saveAlarmsToStorage(updated);
    showToast(`${activeModalPrayer.name} নামাজের অ্যালার্ম সক্রিয় হয়েছে (${scheduledTime})`);
    setActiveModalPrayer(null);
    stopAzanAudio();
  };

  // অ্যালার্ম বন্ধ (OFF) করা
  const handleTurnOff = (prayerName: string) => {
    const current = alarmSettings[prayerName];
    const updated = {
      ...alarmSettings,
      [prayerName]: {
        enabled: false,
        timeString: current?.timeString || '05:00',
      },
    };
    saveAlarmsToStorage(updated);
    showToast(`${prayerName} নামাজের অ্যালার্ম বন্ধ করা হয়েছে`);
    if (activeModalPrayer) setActiveModalPrayer(null);
    stopAzanAudio();
  };

  if (!isOpen) return null;

  const monthNames = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
  ];
  const dateStrBengali = `${monthNames[currentTime.getMonth()]}-${toBengaliNumber(currentTime.getDate())}`;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-3 font-hind animate-in fade-in"
    >
      <audio ref={audioRef} className="hidden" preload="auto" />

      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[430px] bg-[#F4F6F8] h-[92vh] sm:h-[840px] rounded-t-[32px] sm:rounded-[36px] shadow-2xl overflow-hidden flex flex-col border border-white/20 animate-in slide-in-from-bottom-5 relative"
      >
        {/* টোস্ট মেসেজ */}
        {toastMessage && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-[#00573D] text-white text-[11px] font-bold px-4 py-2 rounded-full shadow-xl flex items-center gap-1.5 animate-in fade-in border border-emerald-400/40">
            <CheckCircle2 size={14} className="text-emerald-300" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ================= টপ বার ================= */}
        <div className="bg-white px-4 pt-3.5 pb-2.5 flex items-center justify-between border-b border-slate-200/80 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-8 px-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Calendar size={13} className="text-slate-500" />
              <span>{dateStrBengali}</span>
            </button>

            <div className="relative">
              <select
                value={coords.isGps ? 'gps' : selectedDistrict}
                onChange={(e) => {
                  if (e.target.value !== 'gps') {
                    handleDistrictChange(e.target.value);
                  }
                }}
                className="appearance-none h-8 pl-6 pr-7 rounded-full bg-[#E7F0EB] text-[#008955] text-xs font-bold border border-emerald-200/70 focus:outline-none cursor-pointer"
              >
                {coords.isGps && <option value="gps">GPS লোকেশন (সক্রিয়)</option>}
                {Object.keys(BANGLADESH_DISTRICTS).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <MapPin size={12} className="absolute left-2 top-2.5 text-[#008955] pointer-events-none" />
              <ChevronDown size={12} className="absolute right-2.5 top-2.5 text-[#008955] pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 flex items-center justify-center transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* GPS স্ট্যাটাস */}
        {gpsError && (
          <div className="bg-amber-50 border-b border-amber-200/80 px-3.5 py-1 text-[10px] text-amber-800 flex items-center gap-1.5">
            <Info size={12} className="shrink-0 text-amber-600" />
            <span className="truncate">{gpsError}</span>
          </div>
        )}

        {/* ================= স্ক্রলেবল কন্টেন্ট ================= */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-3.5 space-y-3">
          {/* হিজরি ও বাংলা তারিখ ব্যানার */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-900">
              <span>১৫ রবিউস সানি ১৪৪৮ হিজরি</span>
              <Moon size={14} className="text-emerald-700 fill-emerald-700" />
            </div>
            <div className="inline-flex items-center gap-1.5 bg-[#E7F6ED] border border-[#CDEEDE] text-[#008955] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              <span>{banglaDateInfo.fullBanglaDate}</span>
              <span className="text-[9.5px] opacity-75">• {banglaDateInfo.season}</span>
            </div>
            <p className="text-[10px] text-slate-400">
              {currentTime.toLocaleDateString('bn-BD', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* লাইভ কাউন্টডাউন কার্ড */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-2xs space-y-3.5">
            <div className="relative pt-2 pb-1 border-b border-slate-100">
              <div className="flex justify-between items-end text-center px-2">
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">সাহরি শেষ</span>
                  <span className="text-xs font-bold text-slate-800 font-sans mt-0.5 block">
                    {formatTimeBengali(prayerData.fajr)}
                  </span>
                  <span className="text-[9px] text-slate-400 flex items-center gap-0.5 justify-center mt-0.5">
                    <Sunrise size={10} /> {formatTimeBengali(prayerData.sunrise)}
                  </span>
                </div>

                <div className="flex flex-col items-center -mt-2">
                  <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-500 flex items-center justify-center mb-1">
                    <Sun size={17} className="animate-spin-slow" />
                  </div>
                  <span className="text-[9.5px] text-slate-400 font-medium">ইশরাক</span>
                  <span className="text-xs font-black text-slate-800 font-sans mt-0.5">
                    {formatTimeBengali(prayerData.ishraq)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">ইফতার</span>
                  <span className="text-xs font-bold text-slate-800 font-sans mt-0.5 block">
                    {formatTimeBengali((prayerData as any).magrib || prayerData.maghrib)}
                  </span>
                  <span className="text-[9px] text-slate-400 flex items-center gap-0.5 justify-center mt-0.5">
                    <Sunset size={10} /> {formatTimeBengali((prayerData as any).magrib || prayerData.maghrib)}
                  </span>
                </div>
              </div>
            </div>

            {/* প্রগ্রেস বার */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900">{prayerData.currentPrayer}</span>
                  <span className="text-[10px] text-slate-400 font-medium ml-1.5 font-sans">
                    পরবর্তী: {prayerData.nextPrayer} ({formatTimeBengali(prayerData.nextPrayerTime)})
                  </span>
                </div>
                <span className="text-xs font-bold font-sans text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {formatCountdownBengali(prayerData.remainingSeconds)}
                </span>
              </div>

              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000"
                  style={{
                    width: `${Math.min(100, Math.max(10, ((7200 - (prayerData.remainingSeconds % 7200)) / 7200) * 100))}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] pt-0.5">
                <span className="flex items-center gap-1 font-bold text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  ওয়াক্ত চলছে
                </span>
                <span className="text-slate-500 font-medium font-sans">
                  বাকি: {formatCountdownBengali(prayerData.remainingSeconds)}
                </span>
              </div>
            </div>
          </div>

          {/* ফরজ নামাজ ও কাস্টম অ্যালার্ম তালিকা */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-emerald-600 rounded-full" />
                <h4 className="text-xs font-bold text-slate-900">ফরজ নামাজ ও আজান অ্যালার্ম</h4>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <ShieldCheck size={11} className="text-emerald-700" />
                <span>হানাফী মাযহাব</span>
              </div>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {[
                { name: 'ফজর', dateObj: prayerData.fajr, start: formatTimeBengali(prayerData.fajr), end: formatTimeBengali(prayerData.sunrise), active: prayerData.currentPrayer === 'ফজর' },
                { name: 'যোহর', dateObj: prayerData.dhuhr, start: formatTimeBengali(prayerData.dhuhr), end: formatTimeBengali(prayerData.asr), active: prayerData.currentPrayer === 'যোহর' },
                { name: 'আসর', dateObj: prayerData.asr, start: formatTimeBengali(prayerData.asr), end: formatTimeBengali((prayerData as any).magrib || prayerData.maghrib), active: prayerData.currentPrayer === 'আসর' },
                { name: 'মাগরিব', dateObj: (prayerData as any).magrib || prayerData.maghrib, start: formatTimeBengali((prayerData as any).magrib || prayerData.maghrib), end: formatTimeBengali(prayerData.isha), active: prayerData.currentPrayer === 'মাগরিব' },
                { name: 'ইশা', dateObj: prayerData.isha, start: formatTimeBengali(prayerData.isha), end: formatTimeBengali(prayerData.fajr), active: prayerData.currentPrayer === 'ইশা' },
              ].map((salat, idx) => {
                const config = alarmSettings[salat.name];
                const isAlarmOn = Boolean(config && config.enabled);

                return (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${salat.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span className={`font-bold ${salat.active ? 'text-emerald-700' : 'text-slate-800'}`}>
                        {salat.name}
                      </span>
                      {salat.active && (
                        <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-md">
                          চলমান
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="font-sans font-bold text-slate-800 text-[11px] tracking-wide">
                        {salat.start} - {salat.end}
                      </span>

                      {/* অ্যালার্ম বোতাম (ক্লিক করলেই টাইম ও সুর সেটিং প্যানেল ওপেন হবে) */}
                      <button
                        type="button"
                        onClick={() => handleOpenAlarmModal(salat.name, salat.dateObj)}
                        className={`h-7.5 px-2 rounded-full flex items-center gap-1 transition active:scale-90 border ${
                          isAlarmOn
                            ? 'bg-emerald-50 text-[#008955] border-emerald-300 ring-2 ring-[#008955]/15'
                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600'
                        }`}
                        title="অ্যালার্ম নির্ধারণ করতে ক্লিক করুন"
                      >
                        {isAlarmOn ? (
                          <>
                            <BellRing size={13} className="text-[#008955]" />
                            <span className="text-[9px] font-black">{config.timeString}</span>
                          </>
                        ) : (
                          <>
                            <Bell size={13} />
                            <span className="text-[9px] font-bold text-slate-400">OFF</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* নফল নামাজ সেকশন */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-sky-500 rounded-full" />
                <h4 className="text-xs font-bold text-slate-900">নফল নামাজ</h4>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">অফলাইন ক্যালকুলেশন</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#F8FAFC] border border-slate-200/70 rounded-2xl p-2.5 text-center flex flex-col justify-between">
                <Moon size={16} className="mx-auto text-slate-600 my-1" />
                <span className="text-[11px] font-bold text-slate-800 block">তাহাজ্জুদ</span>
                <span className="text-[9.5px] font-sans text-slate-500 mt-1 block">
                  শেষ: {formatTimeBengali(prayerData.tahajjudEnd)}
                </span>
              </div>

              <div className="bg-[#F8FAFC] border border-slate-200/70 rounded-2xl p-2.5 text-center flex flex-col justify-between">
                <Sun size={16} className="mx-auto text-slate-600 my-1" />
                <span className="text-[11px] font-bold text-slate-800 block">ইশরাক</span>
                <span className="text-[9.5px] font-sans text-slate-500 mt-1 block">
                  শুরু: {formatTimeBengali(prayerData.ishraq)}
                </span>
              </div>

              <div className="bg-[#F8FAFC] border border-slate-200/70 rounded-2xl p-2.5 text-center flex flex-col justify-between">
                <Sunrise size={16} className="mx-auto text-slate-600 my-1" />
                <span className="text-[11px] font-bold text-slate-800 block">চাশত</span>
                <span className="text-[9.5px] font-sans text-slate-500 mt-1 block">
                  আগে: {formatTimeBengali(prayerData.dhuhr)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= ৩. অ্যালার্ম শিডিউল ও প্রিভিউ প্যানেল ================= */}
        {activeModalPrayer && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in">
            <div className="bg-white rounded-t-[36px] p-5 space-y-4 shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    {activeModalPrayer.name} নামাজের অ্যালার্ম শিডিউল
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    পছন্দমতো সময় নির্ধারণ করুন এবং আজান অডিও পরীক্ষা করুন
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModalPrayer(null);
                    stopAzanAudio();
                  }}
                  className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200"
                >
                  <X size={16} />
                </button>
              </div>

              {/* ১. সময় নির্ধারণ / কাস্টম শিডিউলার (+ / - ও ডিরেক্ট ইনপুট) */}
              <div className="bg-[#F8FAF9] border border-[#DFECE5] p-3.5 rounded-2xl space-y-2">
                <span className="text-[11px] font-bold text-[#0F2F24] block">অ্যালার্মের সময় নির্ধারণ করুন:</span>
                
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleAdjustMinutes(-5)}
                    className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95 shadow-2xs"
                    title="৫ মিনিট কমান"
                  >
                    <Minus size={15} />
                  </button>

                  <div className="relative">
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="text-lg font-black font-sans bg-white border border-emerald-300 rounded-xl px-4 py-1.5 text-center text-[#008955] focus:outline-none shadow-2xs"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdjustMinutes(5)}
                    className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95 shadow-2xs"
                    title="৫ মিনিট বাড়ান"
                  >
                    <Plus size={15} />
                  </button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setScheduledTime(activeModalPrayer.defaultTime)}
                    className="text-[10px] font-bold text-slate-400 hover:text-[#008955] underline"
                  >
                    ওয়াক্ত শুরুর মূল সময়ে সেট করুন ({activeModalPrayer.defaultTime})
                  </button>
                </div>
              </div>

              {/* ২. মক্কার আজান শুনুন */}
              <div className="p-3 bg-[#EFF8F3] border border-[#CDEEDE] rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[#008955] text-white flex items-center justify-center">
                    <Volume2 size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">মক্কার মিষ্টি আজান</h4>
                    <p className="text-[10px] text-slate-500">public/audio/azan.mp3</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={isPlayingPreview ? stopAzanAudio : playAzanAudio}
                  className="h-8 px-3 rounded-xl bg-white border border-emerald-300 text-[11px] font-bold text-[#008955] flex items-center gap-1 shadow-2xs active:scale-95"
                >
                  {isPlayingPreview ? <Pause size={12} /> : <Play size={12} />}
                  <span>{isPlayingPreview ? 'থামান' : 'শুনুন'}</span>
                </button>
              </div>

              {/* ৩. অ্যালার্ম অন এবং অফ বাটন */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveAndTurnOn}
                  className="w-full py-3 rounded-2xl bg-[#008955] hover:bg-[#007548] text-white text-xs font-black shadow-md active:scale-95 transition flex items-center justify-center gap-1.5"
                >
                  <BellRing size={15} />
                  <span>অ্যালার্ম সক্রিয় করুন ({scheduledTime})</span>
                </button>

                {alarmSettings[activeModalPrayer.name]?.enabled && (
                  <button
                    type="button"
                    onClick={() => handleTurnOff(activeModalPrayer.name)}
                    className="w-full py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition flex items-center justify-center gap-1.5"
                  >
                    <BellOff size={14} />
                    <span>অ্যালার্ম বন্ধ (OFF) রাখুন</span>
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

        {/* বটম বার */}
        <div className="p-3 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
            <ShieldCheck size={12} />
            <span>অফলাইন আজান ইঞ্জিন সক্রিয়</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#008955] text-white text-xs font-bold shadow-xs active:scale-95 transition"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
}