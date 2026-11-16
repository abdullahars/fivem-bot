const { formatTemplate } = require('../utils/format');
const EKIP = require('../constants/ekip');

const MAX_LOGS = 100;
const UI = EKIP.bilgiUi;

function getActionLogs(ekip) {
  return Array.isArray(ekip.actionLogs) ? ekip.actionLogs : [];
}

async function appendEkipAction(ekip, { byId, byTag, text }) {
  if (!ekip || !byId || !text) return;
  const logs = getActionLogs(ekip);
  logs.push({
    byId,
    byTag: byTag || '',
    text,
    at: new Date().toISOString(),
  });
  ekip.actionLogs = logs.length > MAX_LOGS ? logs.slice(-MAX_LOGS) : logs;
  await ekip.save();
}

function formatActionDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
}

function formatActionLogsText(ekip, limit) {
  const logs = [...getActionLogs(ekip)].reverse().slice(0, limit);
  if (!logs.length) return UI.islemEmpty;

  return logs
    .map((log, index) =>
      formatTemplate(UI.islemLine, {
        no: index + 1,
        user: `<@${log.byId}>`,
        date: formatActionDate(log.at),
        text: log.text,
      })
    )
    .join('\n\n');
}

module.exports = {
  getActionLogs,
  appendEkipAction,
  formatActionLogsText,
};
