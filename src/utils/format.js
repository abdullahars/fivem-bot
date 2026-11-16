function formatTemplate(template, vars = {}) {
  if (template == null) return '';
  return String(template).replace(/\{(\w+)\}/g, (_, key) => {
    if (vars[key] === undefined || vars[key] === null) return '—';
    return String(vars[key]);
  });
}

function formatDuration(ms) {
  if (!ms || ms < 0) return '0 saniye';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} gün ${hours % 24} saat`;
  if (hours > 0) return `${hours} saat ${minutes % 60} dk`;
  if (minutes > 0) return `${minutes} dk ${seconds % 60} sn`;
  return `${seconds} saniye`;
}

function getPeriodKeys() {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const week = `${now.getFullYear()}-W${Math.ceil(
    ((now - new Date(now.getFullYear(), 0, 1)) / 86400000 + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7
  )}`;
  const month = now.toISOString().slice(0, 7);
  return { day, week, month };
}

module.exports = { formatTemplate, formatDuration, getPeriodKeys };
