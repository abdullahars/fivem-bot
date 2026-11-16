const { getConfig } = require('../config/loadConfig');
const { baseEmbed } = require('./embedBuilder');

function buildStaffStatEmbed(user, data) {
  const config = getConfig();

  return baseEmbed()
    .setAuthor({
      name: user.username,
      iconURL: user.displayAvatarURL({ size: 64 }),
    })
    .setTitle('📊 Personel İstatistikleri')
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: '📌 Durum', value: data.statusLine, inline: false },
      { name: '🏆 Genel Sıra', value: `\`${data.rank}. sıra\``, inline: true },
      { name: '🎫 Kapatılan', value: `**${data.totalClosed}**`, inline: true },
      { name: '✋ İlgilenilen', value: `**${data.totalClaimed}**`, inline: true },
      {
        name: '📅 Ticket (Bugün / Hafta / Ay)',
        value: `${data.todayClosed} / ${data.weekClosed} / ${data.monthClosed}`,
        inline: false,
      },
      {
        name: '📂 Ticket Kategorileri',
        value: `🎭 ${data.cat.ic} · 💬 ${data.cat.ooc} · 🛡️ ${data.cat.ac}`,
        inline: false,
      },
      {
        name: '✅ Whitelist Verilen',
        value: `Toplam **${data.totalWlVer}** · Bugün ${data.todayWlVer}`,
        inline: true,
      },
      {
        name: '🎭 IC İsim (Onay / Red)',
        value: `Toplam **${data.totalIcOnay}** / **${data.totalIcRed}** · Bugün ${data.todayIcOnay} / ${data.todayIcRed}`,
        inline: true,
      },
      {
        name: '⏱️ Performans',
        value: `İlgilenme: ${data.avgClaim}\nKapatma: ${data.avgClose}`,
        inline: false,
      }
    )
    .setFooter({ text: config.bot.footer });
}

module.exports = { buildStaffStatEmbed };
