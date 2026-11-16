const { REST, Routes, SlashCommandBuilder, ContextMenuCommandBuilder, ApplicationCommandType, PermissionFlagsBits, ChannelType } = require('discord.js');
const COMMANDS = require('../constants/commands');
const WL = require('../constants/whitelist');
const ROL = require('../constants/rol');
const BAN = require('../constants/ban');
const KB = require('../constants/kullaniciBilgi');
const SS = require('../constants/serverStatus');
const CEZA = require('../constants/ceza');
const DESTEK = require('../constants/destek');
const BLACKLIST = require('../constants/blacklist');
const UM = require('../constants/userMedia');
const EKIP = require('../constants/ekip');
const MESLEK = require('../constants/meslek');
const TCMD = require('../constants/ticketCommands');
const MAZ = require('../constants/mazaret');

function buildCommands() {
  const slashCommands = [
    new SlashCommandBuilder()
      .setName(COMMANDS.ticketKapat.name)
      .setDescription(COMMANDS.ticketKapat.description),
    new SlashCommandBuilder()
      .setName(COMMANDS.ticketIsimDegistir.name)
      .setDescription(COMMANDS.ticketIsimDegistir.description)
      .addStringOption((opt) =>
        opt
          .setName(TCMD.isimDegistir.optionName.name)
          .setDescription(TCMD.isimDegistir.optionName.description)
          .setRequired(true)
          .setMaxLength(100)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.ticketDevret.name)
      .setDescription(COMMANDS.ticketDevret.description)
      .addUserOption((opt) =>
        opt
          .setName(TCMD.devret.optionStaff.name)
          .setDescription(TCMD.devret.optionStaff.description)
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.changelog.name)
      .setDescription(COMMANDS.changelog.description),
    new SlashCommandBuilder()
      .setName(COMMANDS.sil.name)
      .setDescription(COMMANDS.sil.description)
      .addIntegerOption((opt) =>
        opt
          .setName(COMMANDS.sil.optionAmount.name)
          .setDescription(COMMANDS.sil.optionAmount.description)
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(500)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.say.name)
      .setDescription(COMMANDS.say.description),
    new SlashCommandBuilder()
      .setName(COMMANDS.kilit.name)
      .setDescription(COMMANDS.kilit.description),
    new SlashCommandBuilder()
      .setName(COMMANDS.streamer.name)
      .setDescription(COMMANDS.streamer.description)
      .addStringOption((opt) =>
        opt
          .setName(COMMANDS.streamer.optionYayinLinki.name)
          .setDescription(COMMANDS.streamer.optionYayinLinki.description)
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.cekilis.name)
      .setDescription(COMMANDS.cekilis.description)
      .addStringOption((opt) =>
        opt
          .setName(COMMANDS.cekilis.optionAciklama.name)
          .setDescription(COMMANDS.cekilis.optionAciklama.description)
          .setRequired(true)
          .setMaxLength(1000)
      )
      .addIntegerOption((opt) =>
        opt
          .setName(COMMANDS.cekilis.optionKazanan.name)
          .setDescription(COMMANDS.cekilis.optionKazanan.description)
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(25)
      )
      .addIntegerOption((opt) =>
        opt
          .setName(COMMANDS.cekilis.optionSure.name)
          .setDescription(COMMANDS.cekilis.optionSure.description)
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(10080)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.oylama.name)
      .setDescription(COMMANDS.oylama.description)
      .addStringOption((opt) =>
        opt
          .setName(COMMANDS.oylama.optionAciklama.name)
          .setDescription(COMMANDS.oylama.optionAciklama.description)
          .setRequired(true)
          .setMaxLength(1000)
      )
      .addIntegerOption((opt) =>
        opt
          .setName(COMMANDS.oylama.optionSure.name)
          .setDescription(COMMANDS.oylama.optionSure.description)
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(10080)
      )
      .addStringOption((opt) =>
        opt
          .setName(COMMANDS.oylama.optionButon1.name)
          .setDescription(COMMANDS.oylama.optionButon1.description)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(80)
      )
      .addStringOption((opt) =>
        opt
          .setName(COMMANDS.oylama.optionButon2.name)
          .setDescription(COMMANDS.oylama.optionButon2.description)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(80)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.stat.name)
      .setDescription(COMMANDS.stat.description)
      .addUserOption((opt) =>
        opt
          .setName(COMMANDS.stat.optionUser.name)
          .setDescription(COMMANDS.stat.optionUser.description)
          .setRequired(false)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.topStat.name)
      .setDescription(COMMANDS.topStat.description),
    new SlashCommandBuilder()
      .setName(COMMANDS.whitelist.name)
      .setDescription(COMMANDS.whitelist.description)
      .addUserOption((opt) =>
        opt
          .setName(WL.options.user.name)
          .setDescription(WL.options.user.description)
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName(WL.options.steam.name).setDescription(WL.options.steam.description)
      )
      .addStringOption((opt) =>
        opt.setName(WL.options.hex.name).setDescription(WL.options.hex.description)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.kayitsiz.name)
      .setDescription(COMMANDS.kayitsiz.description)
      .addUserOption((opt) =>
        opt
          .setName(COMMANDS.kayitsiz.optionUser.name)
          .setDescription(COMMANDS.kayitsiz.optionUser.description)
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.rolsuz.name)
      .setDescription(COMMANDS.rolsuz.description)
      .addSubcommand((sub) =>
        sub
          .setName(COMMANDS.rolsuz.sub.ver.name)
          .setDescription(COMMANDS.rolsuz.sub.ver.description)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.topluSustur.name)
      .setDescription(COMMANDS.topluSustur.description),
    new SlashCommandBuilder()
      .setName(COMMANDS.topluSusturAc.name)
      .setDescription(COMMANDS.topluSusturAc.description),
    new SlashCommandBuilder()
      .setName(COMMANDS.rollog.name)
      .setDescription(COMMANDS.rollog.description)
      .addUserOption((opt) =>
        opt
          .setName(COMMANDS.rollog.optionUser.name)
          .setDescription(COMMANDS.rollog.optionUser.description)
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.islemler.name)
      .setDescription(COMMANDS.islemler.description)
      .addUserOption((opt) =>
        opt
          .setName(COMMANDS.islemler.optionUser.name)
          .setDescription(COMMANDS.islemler.optionUser.description)
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.rolbilgi.name)
      .setDescription(COMMANDS.rolbilgi.description)
      .addRoleOption((opt) =>
        opt
          .setName(COMMANDS.rolbilgi.optionRole.name)
          .setDescription(COMMANDS.rolbilgi.optionRole.description)
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.rol.name)
      .setDescription(COMMANDS.rol.description)
      .addSubcommand((sub) =>
        sub
          .setName(COMMANDS.rol.sub.ver.name)
          .setDescription(COMMANDS.rol.sub.ver.description)
          .addUserOption((opt) =>
            opt
              .setName(ROL.options.user.name)
              .setDescription(ROL.options.user.description)
              .setRequired(true)
          )
          .addRoleOption((opt) =>
            opt
              .setName(ROL.options.role.name)
              .setDescription(ROL.options.role.description)
              .setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName(COMMANDS.rol.sub.al.name)
          .setDescription(COMMANDS.rol.sub.al.description)
          .addUserOption((opt) =>
            opt
              .setName(ROL.options.user.name)
              .setDescription(ROL.options.user.description)
              .setRequired(true)
          )
          .addRoleOption((opt) =>
            opt
              .setName(ROL.options.role.name)
              .setDescription(ROL.options.role.description)
              .setRequired(true)
          )
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.ban.name)
      .setDescription(COMMANDS.ban.description)
      .addUserOption((opt) =>
        opt
          .setName(BAN.options.user.name)
          .setDescription(BAN.options.user.description)
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName(BAN.options.reason.name)
          .setDescription(BAN.options.reason.description)
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.unban.name)
      .setDescription(COMMANDS.unban.description)
      .addUserOption((opt) =>
        opt.setName(BAN.options.user.name).setDescription('Ban kaldırılacak kullanıcı')
      )
      .addStringOption((opt) =>
        opt.setName(BAN.options.id.name).setDescription('Discord kullanıcı ID')
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.staffTop.name)
      .setDescription(COMMANDS.staffTop.description),
    new SlashCommandBuilder()
      .setName(COMMANDS.yetkiBaslat.name)
      .setDescription(COMMANDS.yetkiBaslat.description)
      .addUserOption((opt) =>
        opt
          .setName(COMMANDS.yetkiBaslat.optionUser.name)
          .setDescription(COMMANDS.yetkiBaslat.optionUser.description)
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.kullaniciBilgi.name)
      .setDescription(COMMANDS.kullaniciBilgi.description)
      .addUserOption((opt) =>
        opt.setName(KB.options.user.name).setDescription(KB.options.user.description)
      )
      .addStringOption((opt) =>
        opt.setName(KB.options.id.name).setDescription(KB.options.id.description)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.nerede.name)
      .setDescription(COMMANDS.nerede.description)
      .addUserOption((opt) =>
        opt
          .setName(COMMANDS.nerede.optionUser.name)
          .setDescription(COMMANDS.nerede.optionUser.description)
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.banBilgi.name)
      .setDescription(COMMANDS.banBilgi.description)
      .addUserOption((opt) =>
        opt.setName(BAN.options.user.name).setDescription('Ban bilgisine bakılacak kullanıcı')
      )
      .addStringOption((opt) =>
        opt.setName(BAN.options.id.name).setDescription('Discord kullanıcı ID')
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.aktif.name)
      .setDescription(COMMANDS.aktif.description),
    new SlashCommandBuilder()
      .setName(COMMANDS.bakim.name)
      .setDescription(COMMANDS.bakim.description)
      .addStringOption((opt) =>
        opt
          .setName(SS.options.sebep.name)
          .setDescription(SS.options.sebep.description)
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName(SS.options.acilis.name)
          .setDescription(SS.options.acilis.description)
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.restart.name)
      .setDescription(COMMANDS.restart.description)
      .addStringOption((opt) =>
        opt
          .setName(SS.options.saat.name)
          .setDescription(SS.options.saat.description)
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.ip.name)
      .setDescription(COMMANDS.ip.description),
    new SlashCommandBuilder()
      .setName(COMMANDS.avatar.name)
      .setDescription(COMMANDS.avatar.description)
      .addUserOption((opt) =>
        opt
          .setName(UM.avatar.optionUser.name)
          .setDescription(UM.avatar.optionUser.description)
          .setRequired(false)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.banner.name)
      .setDescription(COMMANDS.banner.description)
      .addUserOption((opt) =>
        opt
          .setName(UM.banner.optionUser.name)
          .setDescription(UM.banner.optionUser.description)
          .setRequired(false)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.ysay.name)
      .setDescription(COMMANDS.ysay.description),
    new SlashCommandBuilder()
      .setName(MESLEK.slash.name)
      .setDescription(MESLEK.slash.description),
    new SlashCommandBuilder()
      .setName(EKIP.slash.name)
      .setDescription(COMMANDS.ekip.description)
      .addSubcommand((sub) =>
        sub
          .setName(EKIP.slash.sub.olustur.name)
          .setDescription(EKIP.slash.sub.olustur.description)
          .addStringOption((opt) =>
            opt
              .setName(EKIP.command.optionName)
              .setDescription('Ekip adı')
              .setRequired(true)
          )
          .addUserOption((opt) =>
            opt
              .setName(EKIP.command.optionOwner)
              .setDescription('Ekip sahibi')
              .setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName(EKIP.slash.sub.kapat.name)
          .setDescription(EKIP.slash.sub.kapat.description)
          .addStringOption((opt) =>
            opt
              .setName(EKIP.slash.options.ekip.name)
              .setDescription(EKIP.slash.options.ekip.description)
              .setRequired(true)
          )
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.ekipler.name)
      .setDescription(COMMANDS.ekipler.description)
      .addStringOption((opt) =>
        opt
          .setName(EKIP.ekipler.optionIsim.name)
          .setDescription(EKIP.ekipler.optionIsim.description)
          .setRequired(false)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.topluRol.name)
      .setDescription(COMMANDS.topluRol.description)
      .addSubcommand((sub) =>
        sub
          .setName(COMMANDS.topluRol.sub.ver.name)
          .setDescription(COMMANDS.topluRol.sub.ver.description)
          .addRoleOption((opt) =>
            opt.setName('rol').setDescription('Verilecek rol').setRequired(true)
          )
          .addStringOption((opt) =>
            opt
              .setName('kullanicilar')
              .setDescription('Kullanıcıları etiketleyin (@kişi1 @kişi2 @kişi3)')
              .setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName(COMMANDS.topluRol.sub.al.name)
          .setDescription(COMMANDS.topluRol.sub.al.description)
          .addRoleOption((opt) =>
            opt.setName('rol').setDescription('Alınacak rol').setRequired(true)
          )
          .addStringOption((opt) =>
            opt
              .setName('kullanicilar')
              .setDescription('Kullanıcıları etiketleyin (@kişi1 @kişi2 @kişi3)')
              .setRequired(true)
          )
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.cezaEkle.name)
      .setDescription(COMMANDS.cezaEkle.description)
      .addUserOption((opt) =>
        opt
          .setName(COMMANDS.cezaEkle.optionUser.name)
          .setDescription(COMMANDS.cezaEkle.optionUser.description)
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName(COMMANDS.cezaEkle.optionReason.name)
          .setDescription(COMMANDS.cezaEkle.optionReason.description)
          .setRequired(true)
      )
      .addIntegerOption((opt) =>
        opt
          .setName('carpan')
          .setDescription('Ceza çarpanı (örn: 15 için 15x ceza)')
          .setMinValue(1)
          .setMaxValue(100)
          .setRequired(false)
      )
      .addIntegerOption((opt) =>
        opt
          .setName('gun')
          .setDescription('Kaç gün ceza (0 = süresiz)')
          .setMinValue(0)
          .setMaxValue(365)
          .setRequired(false)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.sicil.name)
      .setDescription(COMMANDS.sicil.description)
      .addUserOption((opt) =>
        opt
          .setName(COMMANDS.sicil.optionUser.name)
          .setDescription(COMMANDS.sicil.optionUser.description)
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.destek.name)
      .setDescription(COMMANDS.destek.description)
      .addStringOption((opt) =>
        opt
          .setName(DESTEK.options.receivers.name)
          .setDescription(DESTEK.options.receivers.description)
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName(DESTEK.options.providers.name)
          .setDescription(DESTEK.options.providers.description)
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName(DESTEK.options.description.name)
          .setDescription(DESTEK.options.description.description)
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName(DESTEK.options.penalized.name)
          .setDescription(DESTEK.options.penalized.description)
          .setRequired(false)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.mazaret.name)
      .setDescription(COMMANDS.mazaret.description)
      .addStringOption((opt) =>
        opt
          .setName(MAZ.command.optionSebep.name)
          .setDescription(MAZ.command.optionSebep.description)
          .setRequired(true)
          .setMaxLength(1000)
      )
      .addStringOption((opt) =>
        opt
          .setName(MAZ.command.optionBitis.name)
          .setDescription(MAZ.command.optionBitis.description)
          .setRequired(true)
          .setMaxLength(32)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.blacklist.name)
      .setDescription(COMMANDS.blacklist.description)
      .addUserOption((opt) =>
        opt
          .setName(COMMANDS.blacklist.optionUser.name)
          .setDescription(COMMANDS.blacklist.optionUser.description)
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName(COMMANDS.blacklist.optionReason.name)
          .setDescription(COMMANDS.blacklist.optionReason.description)
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.unblacklist.name)
      .setDescription(COMMANDS.unblacklist.description)
      .addUserOption((opt) =>
        opt
          .setName(BLACKLIST.options.user.name)
          .setDescription(BLACKLIST.options.user.description)
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.blacklistBilgi.name)
      .setDescription(COMMANDS.blacklistBilgi.description)
      .addUserOption((opt) =>
        opt
          .setName(BLACKLIST.options.user.name)
          .setDescription(BLACKLIST.options.user.description)
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.kurulum.name)
      .setDescription(COMMANDS.kurulum.description),
    new SlashCommandBuilder()
      .setName(COMMANDS.config.name)
      .setDescription(COMMANDS.config.description),
    new SlashCommandBuilder()
      .setName(COMMANDS.veriler.name)
      .setDescription(COMMANDS.veriler.description),
    new SlashCommandBuilder()
      .setName(COMMANDS.coin.name)
      .setDescription(COMMANDS.coin.description),
    new SlashCommandBuilder()
      .setName(COMMANDS.coinDukkani.name)
      .setDescription(COMMANDS.coinDukkani.description),
    new SlashCommandBuilder()
      .setName(COMMANDS.coinDuzenle.name)
      .setDescription(COMMANDS.coinDuzenle.description),
    new SlashCommandBuilder()
      .setName(COMMANDS.lb.name)
      .setDescription(COMMANDS.lb.description),
    new SlashCommandBuilder()
      .setName(COMMANDS.profil.name)
      .setDescription(COMMANDS.profil.description)
      .addUserOption((opt) =>
        opt
          .setName(COMMANDS.profil.optionUser.name)
          .setDescription(COMMANDS.profil.optionUser.description)
          .setRequired(true)
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.haftaRaporu.name)
      .setDescription(COMMANDS.haftaRaporu.description),
    new SlashCommandBuilder()
      .setName(COMMANDS.blroller.name)
      .setDescription(COMMANDS.blroller.description),
    new SlashCommandBuilder()
      .setName(COMMANDS.toplanti.name)
      .setDescription(COMMANDS.toplanti.description)
      .addSubcommand((sub) =>
        sub
          .setName(COMMANDS.toplanti.sub.olustur.name)
          .setDescription(COMMANDS.toplanti.sub.olustur.description)
          .addChannelOption((opt) =>
            opt
              .setName(COMMANDS.toplanti.options.kanal.name)
              .setDescription(COMMANDS.toplanti.options.kanal.description)
              .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
              .setRequired(true)
          )
          .addStringOption((opt) =>
            opt
              .setName(COMMANDS.toplanti.options.tarih.name)
              .setDescription(COMMANDS.toplanti.options.tarih.description)
              .setRequired(true)
          )
          .addStringOption((opt) =>
            opt
              .setName(COMMANDS.toplanti.options.baslik.name)
              .setDescription(COMMANDS.toplanti.options.baslik.description)
              .setRequired(false)
              .setMaxLength(100)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName(COMMANDS.toplanti.sub.liste.name)
          .setDescription(COMMANDS.toplanti.sub.liste.description)
      )
      .addSubcommand((sub) =>
        sub
          .setName(COMMANDS.toplanti.sub.sil.name)
          .setDescription(COMMANDS.toplanti.sub.sil.description)
          .addIntegerOption((opt) =>
            opt
              .setName(COMMANDS.toplanti.options.id.name)
              .setDescription(COMMANDS.toplanti.options.id.description)
              .setRequired(true)
              .setMinValue(1)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName(COMMANDS.toplanti.sub.yoklama.name)
          .setDescription(COMMANDS.toplanti.sub.yoklama.description)
          .addIntegerOption((opt) =>
            opt
              .setName(COMMANDS.toplanti.options.id.name)
              .setDescription(COMMANDS.toplanti.options.id.description)
              .setRequired(true)
              .setMinValue(1)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName(COMMANDS.toplanti.sub.bittir.name)
          .setDescription(COMMANDS.toplanti.sub.bittir.description)
          .addIntegerOption((opt) =>
            opt
              .setName(COMMANDS.toplanti.options.id.name)
              .setDescription(COMMANDS.toplanti.options.id.description)
              .setRequired(true)
              .setMinValue(1)
          )
      ),
    new SlashCommandBuilder()
      .setName(COMMANDS.help.name)
      .setDescription(COMMANDS.help.description),
  ];

  const contextMenuCommands = [
    new ContextMenuCommandBuilder()
      .setName(COMMANDS.contextMenus.whitelistEkle.name)
      .setType(ApplicationCommandType.User),
    new ContextMenuCommandBuilder()
      .setName(COMMANDS.contextMenus.rolEkle.name)
      .setType(ApplicationCommandType.User),
    new ContextMenuCommandBuilder()
      .setName(COMMANDS.contextMenus.rolAl.name)
      .setType(ApplicationCommandType.User),
  ];

  return [...slashCommands, ...contextMenuCommands].map((c) => c.toJSON());
}

async function deployCommands({ token, clientId, guildId }) {
  const commands = buildCommands();
  const rest = new REST({ version: '10' }).setToken(token);

  // Global komutları temizle — eski sürümler listede çift görünmesin
  await rest.put(Routes.applicationCommands(clientId), { body: [] });

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
    return { scope: 'guild', guildId, count: commands.length, clearedGlobal: true };
  }

  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  return { scope: 'global', count: commands.length, clearedGlobal: true };
}

module.exports = { buildCommands, deployCommands };
