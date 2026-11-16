const TZ = 'Europe/Istanbul';

function getIstanbulDateKey(date = new Date()) {
  return date.toLocaleDateString('en-CA', { timeZone: TZ });
}

function getIstanbulTimeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return { hour, minute };
}

/** dateKey: YYYY-MM-DD (İstanbul günü) */
function getIstanbulDayBounds(dateKey) {
  const start = new Date(`${dateKey}T00:00:00+03:00`);
  const end = new Date(start.getTime() + 86400000);
  return { start, end };
}

function getYesterdayDateKey(fromDate = new Date()) {
  const todayKey = getIstanbulDateKey(fromDate);
  const start = new Date(`${todayKey}T00:00:00+03:00`);
  return getIstanbulDateKey(new Date(start.getTime() - 3600000));
}

function msUntilNextIstanbulMidnight(fromDate = new Date()) {
  const todayKey = getIstanbulDateKey(fromDate);
  const nextMidnight = new Date(`${todayKey}T00:00:00+03:00`);
  nextMidnight.setTime(nextMidnight.getTime() + 86400000);
  return Math.max(1000, nextMidnight.getTime() - fromDate.getTime() + 1500);
}

function formatReportDateLabel(dateKey) {
  const [y, m, d] = dateKey.split('-');
  return `${d}.${m}.${y}`;
}

module.exports = {
  TZ,
  getIstanbulDateKey,
  getIstanbulTimeParts,
  getIstanbulDayBounds,
  getYesterdayDateKey,
  msUntilNextIstanbulMidnight,
  formatReportDateLabel,
};
