function micLabel(state) {
  if (!state) return '—';
  if (state.serverMute) return 'Kapalı (Sunucu susturması)';
  if (state.selfMute) return 'Kapalı (Kendi susturması)';
  return 'Açık';
}

function deafLabel(state) {
  if (!state) return '—';
  if (state.serverDeaf) return 'Kapalı (Sunucu sağırlaştırması)';
  if (state.selfDeaf) return 'Kapalı (Kendi sağırlaştırması)';
  return 'Açık';
}

function cameraLabel(state) {
  if (!state) return '—';
  return state.selfVideo ? 'Açık' : 'Kapalı';
}

function streamLabel(state) {
  if (!state) return '—';
  return state.streaming ? 'Açık' : 'Kapalı';
}

function voicePresenceLabel(member) {
  const channel = member?.voice?.channel;
  if (!channel) return '❌ Seste değil';
  return `✅ Seste — ${channel.toString()}`;
}

module.exports = {
  micLabel,
  deafLabel,
  cameraLabel,
  streamLabel,
  voicePresenceLabel,
};
