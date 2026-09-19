import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';

export interface CalculatedPrayerData {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
  tahajjudEnd: Date;
  ishraq: Date;
  chasht: Date;
  forbiddenSunriseEnd: Date;
  forbiddenMiddayStart: Date;
  forbiddenSunsetStart: Date;
  currentPrayer: string;
  nextPrayer: string;
  nextPrayerTime: Date;
  remainingSeconds: number;
}

export const DEFAULT_COORDINATES = {
  latitude: 23.8103,
  longitude: 90.4125,
  name: 'ঢাকা (ডিফল্ট)',
};

export const BANGLADESH_DISTRICTS: { [name: string]: { latitude: number; longitude: number } } = {
  'ঢাকা': { latitude: 23.8103, longitude: 90.4125 },
  'চট্টগ্রাম': { latitude: 22.3569, longitude: 91.7832 },
  'সিলেট': { latitude: 24.8949, longitude: 91.8687 },
  'রাজশাহী': { latitude: 24.3745, longitude: 88.6042 },
  'খুলনা': { latitude: 22.8456, longitude: 89.5403 },
  'বরিশাল': { latitude: 22.7010, longitude: 90.3535 },
  'রংপুর': { latitude: 25.7439, longitude: 89.2752 },
  'ময়মনসিংহ': { latitude: 24.7471, longitude: 90.4203 },
  'কুমিল্লা': { latitude: 23.4607, longitude: 91.1809 },
};

export const BANGLA_NUMS: { [key: string]: string } = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
};

export function toBengaliNumber(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '--';
  return String(val).replace(/[0-9]/g, (w) => BANGLA_NUMS[w] || w);
}

// undefined এরর থেকে রক্ষার জন্য নাল-সেফ ফাংশন
export function formatTimeBengali(date: Date | undefined | null): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '--:--';
  }
  let hours = date.getHours();
  const minutes = date.getMinutes();
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
  return toBengaliNumber(`${formattedHours}:${formattedMinutes}`);
}

export function formatCountdownBengali(totalSeconds: number | undefined | null): string {
  if (!totalSeconds || totalSeconds <= 0) return '০০:০০:০০';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hStr = hours < 10 ? `0${hours}` : `${hours}`;
  const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const sStr = seconds < 10 ? `0${seconds}` : `${seconds}`;

  return toBengaliNumber(`${hStr}:${mStr}:${sStr}`);
}

export function calculateOfflinePrayerTimes(
  lat: number,
  lng: number,
  inputDate: Date = new Date()
): CalculatedPrayerData {
  const safeLat = typeof lat === 'number' && !isNaN(lat) ? lat : DEFAULT_COORDINATES.latitude;
  const safeLng = typeof lng === 'number' && !isNaN(lng) ? lng : DEFAULT_COORDINATES.longitude;
  const targetDate = inputDate instanceof Date && !isNaN(inputDate.getTime()) ? inputDate : new Date();

  const coordinates = new Coordinates(safeLat, safeLng);
  const params = CalculationMethod.Karachi();
  params.madhab = Madhab.Hanafi;

  const pt = new PrayerTimes(coordinates, targetDate, params);

  const fajr = pt.fajr || new Date(targetDate.setHours(4, 30, 0, 0));
  const sunrise = pt.sunrise || new Date(targetDate.setHours(5, 45, 0, 0));
  const dhuhr = pt.dhuhr || new Date(targetDate.setHours(12, 0, 0, 0));
  const asr = pt.asr || new Date(targetDate.setHours(16, 20, 0, 0));
  const maghrib = pt.maghrib || new Date(targetDate.setHours(18, 15, 0, 0));
  const isha = pt.isha || new Date(targetDate.setHours(19, 30, 0, 0));

  const tahajjudEnd = new Date(fajr.getTime());
  const ishraq = new Date(sunrise.getTime() + 15 * 60 * 1000);
  const chasht = new Date(sunrise.getTime() + 45 * 60 * 1000);

  const forbiddenSunriseEnd = new Date(sunrise.getTime() + 15 * 60 * 1000);
  const forbiddenMiddayStart = new Date(dhuhr.getTime() - 10 * 60 * 1000);
  const forbiddenSunsetStart = new Date(maghrib.getTime() - 15 * 60 * 1000);

  const now = new Date();
  let currentPrayerName = 'ইশা';
  let nextPrayerName = 'ফজর';
  let nextPrayerTarget = new Date(fajr.getTime());

  if (now < fajr) {
    currentPrayerName = 'তাহাজ্জুদ / শেষ রাত';
    nextPrayerName = 'ফজর';
    nextPrayerTarget = fajr;
  } else if (now < sunrise) {
    currentPrayerName = 'ফজর';
    nextPrayerName = 'সূর্যোদয়';
    nextPrayerTarget = sunrise;
  } else if (now < dhuhr) {
    currentPrayerName = 'ইশরাক / চাশত';
    nextPrayerName = 'যোহর';
    nextPrayerTarget = dhuhr;
  } else if (now < asr) {
    currentPrayerName = 'যোহর';
    nextPrayerName = 'আসর';
    nextPrayerTarget = asr;
  } else if (now < maghrib) {
    currentPrayerName = 'আসর';
    nextPrayerName = 'মাগরিব';
    nextPrayerTarget = maghrib;
  } else if (now < isha) {
    currentPrayerName = 'মাগরিব';
    nextPrayerName = 'ইশা';
    nextPrayerTarget = isha;
  } else {
    currentPrayerName = 'ইশা';
    nextPrayerName = 'ফজর';
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowPt = new PrayerTimes(coordinates, tomorrow, params);
    nextPrayerTarget = tomorrowPt.fajr || new Date(tomorrow.setHours(4, 30, 0, 0));
  }

  const diffMs = nextPrayerTarget.getTime() - now.getTime();
  const remainingSeconds = Math.max(0, Math.floor(diffMs / 1000));

  return {
    fajr,
    sunrise,
    dhuhr,
    asr,
    maghrib,
    isha,
    tahajjudEnd,
    ishraq,
    chasht,
    forbiddenSunriseEnd,
    forbiddenMiddayStart,
    forbiddenSunsetStart,
    currentPrayer: currentPrayerName,
    nextPrayer: nextPrayerName,
    nextPrayerTime: nextPrayerTarget,
    remainingSeconds,
  };
}