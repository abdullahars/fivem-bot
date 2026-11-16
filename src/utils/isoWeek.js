const { getIstanbulDateKey } = require('./istanbulTime');

/** "YYYY-MM-DD" → UTC takvim günü (öğlen, tz kaymasını önlemek için) */
function dateKeyToUtcNoon(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

/** Bir takvim gününün haftanın günü (0=Pazar, 1=Pazartesi … 6=Cumartesi) */
function weekdayOfDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** ISO 8601 hafta numarası + hafta-yılı (ör. {year:2026, week:26}) */
function isoWeekParts(dateKey) {
  const d = dateKeyToUtcNoon(dateKey);
  const dayNum = (d.getUTCDay() + 6) % 7; // Pazartesi=0
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // o haftanın Perşembesi
  const firstThursday = d.getTime();
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const yearStartDayNum = (yearStart.getUTCDay() + 6) % 7;
  yearStart.setUTCDate(yearStart.getUTCDate() - yearStartDayNum + 3);
  const week = 1 + Math.round((firstThursday - yearStart.getTime()) / (7 * 86400000));
  return { year: d.getUTCFullYear(), week };
}

/** Bir instant (Date) için İstanbul gününe göre ISO hafta anahtarı: "2026-W26" */
function getIstanbulWeekKey(date = new Date()) {
  const dateKey = getIstanbulDateKey(date);
  const { year, week } = isoWeekParts(dateKey);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** "2026-W26" → o ISO haftanın Pazartesi gününün "YYYY-MM-DD" anahtarı */
function isoWeekMondayKey(weekKey) {
  const [yearRaw, weekRaw] = weekKey.split('-W');
  const year = Number(yearRaw);
  const week = Number(weekRaw);

  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7; // Pazartesi=0
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day);
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);

  const y = monday.getUTCFullYear();
  const m = String(monday.getUTCMonth() + 1).padStart(2, '0');
  const d = String(monday.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "YYYY-MM-DD" gününe gün ekleyip yeni anahtar döner (İstanbul gün sayımı) */
function addDaysToDateKey(dateKey, days) {
  const base = new Date(`${dateKey}T12:00:00+03:00`);
  base.setTime(base.getTime() + days * 86400000);
  return getIstanbulDateKey(base);
}

/**
 * Bir ISO hafta anahtarı için:
 *  - start/end: log filtreleme için Date instant'ları (Pazartesi 00:00 → ertesi Pazartesi 00:00, İstanbul)
 *  - dayKeys: o haftanın 7 İstanbul gün anahtarı (aktivite toplamları için)
 */
function getIstanbulWeekBounds(weekKey) {
  const mondayKey = isoWeekMondayKey(weekKey);
  const start = new Date(`${mondayKey}T00:00:00+03:00`);
  const end = new Date(start.getTime() + 7 * 86400000);
  const dayKeys = [];
  for (let i = 0; i < 7; i += 1) {
    dayKeys.push(addDaysToDateKey(mondayKey, i));
  }
  return { mondayKey, start, end, dayKeys };
}

/** Verilen haftadan önceki ISO hafta anahtarı */
function getPreviousWeekKey(weekKey) {
  const mondayKey = isoWeekMondayKey(weekKey);
  const prevDate = new Date(`${mondayKey}T12:00:00+03:00`);
  prevDate.setTime(prevDate.getTime() - 7 * 86400000);
  return getIstanbulWeekKey(prevDate);
}

/** Şu anki haftadan geriye doğru n hafta anahtarı (yeni→eski sırada) */
function getRecentWeekKeys(count, fromDate = new Date()) {
  const keys = [];
  let key = getIstanbulWeekKey(fromDate);
  for (let i = 0; i < count; i += 1) {
    keys.push(key);
    key = getPreviousWeekKey(key);
  }
  return keys;
}

/** Sonraki Pazartesi 09:00 (İstanbul) için ms cinsinden bekleme süresi */
function msUntilNextIstanbulWeeklyReport(fromDate = new Date(), hour = 9) {
  for (let i = 0; i <= 8; i += 1) {
    const probe = new Date(fromDate.getTime() + i * 86400000);
    const key = getIstanbulDateKey(probe);
    if (weekdayOfDateKey(key) === 1) {
      const target = new Date(`${key}T${String(hour).padStart(2, '0')}:00:00+03:00`).getTime();
      if (target > fromDate.getTime() + 1000) {
        return target - fromDate.getTime();
      }
    }
  }
  return 7 * 86400000;
}

function formatWeekLabel(weekKey) {
  const { mondayKey } = getIstanbulWeekBounds(weekKey);
  const sundayKey = addDaysToDateKey(mondayKey, 6);
  const fmt = (k) => {
    const [y, m, d] = k.split('-');
    return `${d}.${m}.${y}`;
  };
  return `${fmt(mondayKey)} – ${fmt(sundayKey)} (${weekKey})`;
}

module.exports = {
  getIstanbulWeekKey,
  getIstanbulWeekBounds,
  getPreviousWeekKey,
  getRecentWeekKeys,
  msUntilNextIstanbulWeeklyReport,
  formatWeekLabel,
  weekdayOfDateKey,
};
