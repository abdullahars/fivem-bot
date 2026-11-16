/**
 * /kurulum ile açılan log kanalları — sadece bunlar isimle bulunur.
 * Diğer kanallar config.js → ids.channels içinden ID ile okunur.
 */
module.exports = {
  categoryName: 'bot-log',

  /** Kurulumda oluşturulacak kanallar */
  channels: {
    blacklistLog: { name: 'blacklist-log', label: 'Blacklist log', private: true },
    destekLog: { name: 'destek-log', label: 'Destek log', private: true },
    cezaLog: { name: 'ceza-log', label: 'Ceza log', private: true },
    ekipTicketLog: { name: 'ekip-ticket-log', label: 'Ekip ticket log', private: true },
    ekipLog: { name: 'ekip-log', label: 'Ekip log', private: true },
    voiceLog: { name: 'voice-log', label: 'Ses log', private: true },
    messageLog: { name: 'message-log', label: 'Mesaj log', private: true },
    joinLeaveLog: { name: 'join-leave-log', label: 'Giriş / çıkış log', private: true },
    banLog: { name: 'ban-log', label: 'Ban log', private: true },
    roleLog: { name: 'role-log', label: 'Rol log', private: true },
    icIsimLog: { name: 'ic-isim-log', label: 'IC isim log', private: true },
    whitelistLog: { name: 'whitelist-log', label: 'Whitelist log', private: true },
    ticketLog: { name: 'ticket-log', label: 'Ticket log', private: true },
    gunlukLog: { name: 'gunluk-log', label: 'Günlük özet log', private: true },
    komutLog: { name: 'komut-log', label: 'Komut kullanım log', private: true },
    streamerLog: { name: 'streamer-log', label: 'Streamer yayın log', private: true },
    meslekLog: { name: 'meslek-log', label: 'Meslek log', private: true },
    mazaretLog: { name: 'mazaret-log', label: 'Mazaret log', private: true },
    puanLog: { name: 'puan-log', label: 'Kayıt puan log', private: true },
  },
};

/** İsme göre çözülecek config anahtarları */
module.exports.kurulumKeys = Object.keys(module.exports.channels);
