const COMMANDS = require('../constants/commands');
const MESSAGES = require('../constants/messages');
const { isStaff, isUstYonetim, isBanhammer, isBotCommand } = require('../utils/permissions');
const STAFF_TOP = require('../constants/staffTop');
const statCmd = require('../commands/stat');
const changelogCmd = require('../commands/changelog');
const silCmd = require('../commands/sil');
const sayCmd = require('../commands/say');
const oylamaCmd = require('../commands/oylama');
const kilitCmd = require('../commands/kilit');
const cekilisCmd = require('../commands/cekilis');
const streamerCmd = require('../commands/streamer');
const meslekCmd = require('../commands/meslek');
const {
  handleChangelogAuthorsSelect,
  handleChangelogOpen,
  handleChangelogModal,
} = require('../services/changelogService');
const CHANGELOG = require('../constants/changelog');
const OYL = require('../constants/oylama');
const { handleOylamaVote } = require('../services/oylamaService');
const CEK = require('../constants/cekilis');
const { handleCekilisJoin, handleCekilisList } = require('../services/cekilisService');
const whitelistCmd = require('../commands/whitelist');
const kayitsizCmd = require('../commands/kayitsiz');
const rolsuzCmd = require('../commands/rolsuz');
const topStatCmd = require('../commands/top-stat');
const topluSusturCmd = require('../commands/toplu-sustur');
const topluSusturAcCmd = require('../commands/toplu-sustur-ac');
const rollogCmd = require('../commands/rollog');
const islemlerCmd = require('../commands/islemler');
const { handleIslemlerNav } = require('../services/islemlerService');
const rolbilgiCmd = require('../commands/rolbilgi');
const rolCmd = require('../commands/rol');
const banCmd = require('../commands/ban');
const unbanCmd = require('../commands/unban');
const banBilgiCmd = require('../commands/ban-bilgi');
const staffTopCmd = require('../commands/staff-top');
const kullaniciBilgiCmd = require('../commands/kullanici-bilgi');
const aktifCmd = require('../commands/aktif');
const bakimCmd = require('../commands/bakim');
const restartCmd = require('../commands/restart');
const ipCmd = require('../commands/ip');
const avatarCmd = require('../commands/avatar');
const bannerCmd = require('../commands/banner');
const ysayCmd = require('../commands/ysay');
const ekipCmd = require('../commands/ekip');
const ekiplerCmd = require('../commands/ekipler');
const topluRolCmd = require('../commands/toplu-rol');
const cezaEkleCmd = require('../commands/ceza-ekle');
const sicilCmd = require('../commands/sicil');
const destekCmd = require('../commands/destek');
const blacklistCmd = require('../commands/blacklist');
const unblacklistCmd = require('../commands/unblacklist');
const blacklistBilgiCmd = require('../commands/blacklist-bilgi');
const ticketKapatCmd = require('../commands/ticket-kapat');
const ticketIsimDegistirCmd = require('../commands/ticket-isim-degistir');
const ticketDevretCmd = require('../commands/ticket-devret');
const yetkiBaslatCmd = require('../commands/yetki-baslat');
const { handleYetkiBaslatButton } = require('../services/yetkiBaslatService');
const kurulumCmd = require('../commands/kurulum');
const { handleKurulumSelect } = require('../services/kurulumService');
const configCmd = require('../commands/config');
const {
  handleConfigInteraction,
  isConfigInteraction,
} = require('../services/configPanelService');
const verilerCmd = require('../commands/veriler');
const {
  handleVerilerInteraction,
  isVerilerInteraction,
} = require('../services/verilerPanelService');
const coinCmd = require('../commands/coin');
const coinDukkaniCmd = require('../commands/coin-dukkani');
const coinDuzenleCmd = require('../commands/coin-duzenle');
const {
  handleShopBuy,
  isCoinShopInteraction,
} = require('../services/coinPanelService');
const {
  handleCoinManageInteraction,
  isCoinManageInteraction,
} = require('../services/coinManageService');
const lbCmd = require('../commands/lb');
const profilCmd = require('../commands/profil');
const haftaRaporuCmd = require('../commands/hafta-raporu');
const {
  isRankSuggestionButton,
  handleRankSuggestionButton,
} = require('../services/performanceReportService');
const blrollerCmd = require('../commands/blroller');
const {
  handleBlRolInteraction,
  isBlRolInteraction,
} = require('../services/blRolPanelService');
const toplantiCmd = require('../commands/toplanti');
const { handleMeetingFinishButton } = require('../services/meetingAttendanceService');
const TOP = require('../constants/toplanti');
const mazaretCmd = require('../commands/mazaret');
const {
  handleMazaretToplantiButton,
  handleMazaretToplantiModal,
  handleMazaretApprove,
  handleMazaretRejectButton,
  handleMazaretRejectModal,
} = require('../services/mazaretService');
const MAZ = require('../constants/mazaret');
const helpCmd = require('../commands/help');
const neredeCmd = require('../commands/nerede');
const { getRoleBlockedMessage } = require('../services/blRolService');
const contextWhitelistEkleCmd = require('../commands/context-whitelist-ekle');
const contextRolEkleCmd = require('../commands/context-rol-ekle');
const contextRolAlCmd = require('../commands/context-rol-al');
const ticketService = require('../services/ticketService');
const { handleCall } = require('../services/mulakatService');
const {
  handleEkipButton,
  addMember,
  banFromEkip,
  handleReferansButton,
  handleReferansModal,
  isReferansButton,
  isReferansModal,
} = require('../services/ekipService');
const {
  handleBilgiButton,
  handleBilgiBossSelect,
  handleBilgiYardimSelect,
  handleEkiplerEditButton,
  handleWarnAddButton,
  handleWarnAddModal,
  handleWarnRemoveButton,
  handleWarnRemoveModal,
} = require('../services/ekipManageService');
const {
  handleWhitelistApproval,
  handleWhitelistRejection,
} = require('../services/whitelistService');
const ekipTicketService = require('../services/ekipTicketService');
const MULAKAT = require('../constants/mulakat');
const EKIP = require('../constants/ekip');
const MESLEK = require('../constants/meslek');
const {
  handleMeslekButton,
  handleMeslekStringSelect,
  handleMeslekUserSelect,
  handleMeslekRoleSelect,
} = require('../services/meslekService');
const { handleRolbilgiButton } = require('../services/rolbilgiService');
const { handleBanBilgiUnban } = require('../services/banService');
const { handleStatTab } = require('../services/statPanelService');
const { handleStaffTopRefresh, handleStaffTopMyStats, handleStaffTopGap, REFRESH_ID, MY_STATS_ID, GAP_ID } = require('../services/staffTopService');
const { handleKullaniciButton } = require('../services/kullaniciBilgiService');
const { handleIcIsimButton, handleIcIsimRejectModal } = require('../services/icIsimService');
const IC_ISIM = require('../constants/icIsim');
const WL = require('../constants/whitelist');
const KP = require('../constants/kayitPuan');
const { handleKayitPuanButton } = require('../services/kayitPuanService');
const {
  handleWhitelistRejectModal,
} = require('../services/whitelistService');
const { ephemeralPayload } = require('../utils/interaction');
const { logCommandUsage } = require('../services/commandLogService');
const HELP = require('../constants/help');
const { handleHelpCategoryButton } = require('../services/helpService');
const KURULUM = require('../constants/kurulum');

const SLASH_COMMAND_HANDLERS = {
  [COMMANDS.stat.name]: statCmd,
  [COMMANDS.changelog.name]: changelogCmd,
  [COMMANDS.sil.name]: silCmd,
  [COMMANDS.say.name]: sayCmd,
  [COMMANDS.kilit.name]: kilitCmd,
  [COMMANDS.cekilis.name]: cekilisCmd,
  [COMMANDS.streamer.name]: streamerCmd,
  [COMMANDS.meslek.name]: meslekCmd,
  [COMMANDS.oylama.name]: oylamaCmd,
  [COMMANDS.topStat.name]: topStatCmd,
  [COMMANDS.whitelist.name]: whitelistCmd,
  [COMMANDS.kayitsiz.name]: kayitsizCmd,
  [COMMANDS.rolsuz.name]: rolsuzCmd,
  [COMMANDS.topluSustur.name]: topluSusturCmd,
  [COMMANDS.topluSusturAc.name]: topluSusturAcCmd,
  [COMMANDS.rollog.name]: rollogCmd,
  [COMMANDS.islemler.name]: islemlerCmd,
  [COMMANDS.rolbilgi.name]: rolbilgiCmd,
  [COMMANDS.rol.name]: rolCmd,
  [COMMANDS.ban.name]: banCmd,
  [COMMANDS.unban.name]: unbanCmd,
  [COMMANDS.banBilgi.name]: banBilgiCmd,
  [COMMANDS.staffTop.name]: staffTopCmd,
  [COMMANDS.yetkiBaslat.name]: yetkiBaslatCmd,
  [COMMANDS.kullaniciBilgi.name]: kullaniciBilgiCmd,
  [COMMANDS.aktif.name]: aktifCmd,
  [COMMANDS.bakim.name]: bakimCmd,
  [COMMANDS.restart.name]: restartCmd,
  [COMMANDS.ip.name]: ipCmd,
  [COMMANDS.avatar.name]: avatarCmd,
  [COMMANDS.banner.name]: bannerCmd,
  [COMMANDS.ysay.name]: ysayCmd,
  [COMMANDS.ekip.name]: ekipCmd,
  [COMMANDS.ekipler.name]: ekiplerCmd,
  [COMMANDS.topluRol.name]: topluRolCmd,
  [COMMANDS.cezaEkle.name]: cezaEkleCmd,
  [COMMANDS.sicil.name]: sicilCmd,
  [COMMANDS.destek.name]: destekCmd,
  [COMMANDS.blacklist.name]: blacklistCmd,
  [COMMANDS.unblacklist.name]: unblacklistCmd,
  [COMMANDS.blacklistBilgi.name]: blacklistBilgiCmd,
  [COMMANDS.ticketKapat.name]: ticketKapatCmd,
  [COMMANDS.ticketIsimDegistir.name]: ticketIsimDegistirCmd,
  [COMMANDS.ticketDevret.name]: ticketDevretCmd,
  [COMMANDS.kurulum.name]: kurulumCmd,
  [COMMANDS.config.name]: configCmd,
  [COMMANDS.veriler.name]: verilerCmd,
  [COMMANDS.coin.name]: coinCmd,
  [COMMANDS.coinDukkani.name]: coinDukkaniCmd,
  [COMMANDS.coinDuzenle.name]: coinDuzenleCmd,
  [COMMANDS.lb.name]: lbCmd,
  [COMMANDS.profil.name]: profilCmd,
  [COMMANDS.haftaRaporu.name]: haftaRaporuCmd,
  [COMMANDS.blroller.name]: blrollerCmd,
  [COMMANDS.toplanti.name]: toplantiCmd,
  [COMMANDS.nerede.name]: neredeCmd,
  [COMMANDS.mazaret.name]: mazaretCmd,
  [COMMANDS.help.name]: helpCmd,
};

function runWithCommandLog(interaction, handler) {
  logCommandUsage(interaction).catch((err) => {
    console.warn('[KomutLog]', err?.message || err);
  });
  return handler.execute(interaction);
}

async function handleInteraction(interaction) {
  // Context Menu Commands
  if (interaction.isUserContextMenuCommand()) {
    const COMMANDS = require('../constants/commands');
    const contextMenus = COMMANDS.contextMenus;
    
    if (interaction.commandName === contextMenus.whitelistEkle.name) {
      return runWithCommandLog(interaction, contextWhitelistEkleCmd);
    }
    if (interaction.commandName === contextMenus.rolEkle.name) {
      return runWithCommandLog(interaction, contextRolEkleCmd);
    }
    if (interaction.commandName === contextMenus.rolAl.name) {
      return runWithCommandLog(interaction, contextRolAlCmd);
    }
  }

  if (interaction.isChatInputCommand()) {
    const handler = SLASH_COMMAND_HANDLERS[interaction.commandName];
    if (handler) return runWithCommandLog(interaction, handler);
    return;
  }

  if (
    (interaction.isMessageComponent() || interaction.isModalSubmit()) &&
    isConfigInteraction(interaction.customId)
  ) {
    return handleConfigInteraction(interaction);
  }

  if (interaction.isMessageComponent() && isBlRolInteraction(interaction.customId)) {
    return handleBlRolInteraction(interaction);
  }

  if (
    interaction.isMessageComponent() &&
    isVerilerInteraction(interaction.customId)
  ) {
    return handleVerilerInteraction(interaction);
  }

  if (
    (interaction.isMessageComponent() || interaction.isModalSubmit()) &&
    isCoinManageInteraction(interaction.customId)
  ) {
    return handleCoinManageInteraction(interaction);
  }

  if (
    interaction.isStringSelectMenu() &&
    isCoinShopInteraction(interaction.customId)
  ) {
    return handleShopBuy(interaction);
  }

  if (interaction.isModalSubmit()) {
    if (isReferansModal(interaction.customId)) {
      return handleReferansModal(interaction);
    }
    if (interaction.customId.startsWith(EKIP.bilgiUi.warnAddModalPrefix)) {
      return handleWarnAddModal(interaction);
    }
    if (interaction.customId.startsWith(EKIP.bilgiUi.warnRemoveModalPrefix)) {
      return handleWarnRemoveModal(interaction);
    }
    if (interaction.customId === CHANGELOG.buttons.modal) {
      if (!isUstYonetim(interaction.member)) {
        return interaction.reply(
          ephemeralPayload({ content: CHANGELOG.messages.noPermission })
        );
      }
      return handleChangelogModal(interaction);
    }
    if (interaction.customId.startsWith(IC_ISIM.buttons.rejectModalPrefix)) {
      return handleIcIsimRejectModal(interaction);
    }
    if (interaction.customId.startsWith(WL.buttons.rejectModalPrefix)) {
      if (!isStaff(interaction.member)) {
        return interaction.reply(ephemeralPayload({ content: MESSAGES.noPermission }));
      }
      return handleWhitelistRejectModal(interaction);
    }
    if (interaction.customId.startsWith(MAZ.modal.submitToplantiPrefix)) {
      return handleMazaretToplantiModal(interaction);
    }
    if (interaction.customId.startsWith(MAZ.modal.rejectModalPrefix)) {
      return handleMazaretRejectModal(interaction);
    }
  }

  if (interaction.isButton()) {
    const id = interaction.customId;

    if (isReferansButton(id)) {
      return handleReferansButton(interaction);
    }

    if (isRankSuggestionButton(id)) {
      return handleRankSuggestionButton(interaction);
    }

    if (id.startsWith(KP.buttons.ratePrefix)) {
      return handleKayitPuanButton(interaction);
    }

    if (id.startsWith(IC_ISIM.buttons.approvePrefix)) {
      return handleIcIsimButton(interaction, 'approve');
    }

    if (id.startsWith(IC_ISIM.buttons.rejectPrefix)) {
      return handleIcIsimButton(interaction, 'reject');
    }

    if (id.startsWith(WL.buttons.approvePrefix)) {
      if (!isStaff(interaction.member)) {
        return interaction.reply(ephemeralPayload({ content: MESSAGES.noPermission }));
      }
      return handleWhitelistApproval(interaction);
    }

    if (id.startsWith(WL.buttons.rejectPrefix)) {
      if (!isStaff(interaction.member)) {
        return interaction.reply(ephemeralPayload({ content: MESSAGES.noPermission }));
      }
      return handleWhitelistRejection(interaction);
    }

    if (id.startsWith('rolbilgi:')) {
      return handleRolbilgiButton(interaction);
    }

    if (id.startsWith('banbilgi:')) {
      return handleBanBilgiUnban(interaction);
    }

    if (id.startsWith('kullanici:')) {
      if (!isStaff(interaction.member)) {
        return interaction.reply(ephemeralPayload({ content: MESSAGES.noPermission }));
      }
      return handleKullaniciButton(interaction);
    }

    if (id.startsWith('islemler:nav:')) {
      if (!isBotCommand(interaction.member)) {
        return interaction.reply(ephemeralPayload({ content: MESSAGES.noBotCommand }));
      }
      return handleIslemlerNav(interaction);
    }

    if (id === REFRESH_ID) {
      if (!isUstYonetim(interaction.member)) {
        return interaction.reply(ephemeralPayload({ content: STAFF_TOP.noPermissionRefresh }));
      }
      await interaction.deferUpdate();
      return handleStaffTopRefresh(interaction);
    }

    if (id === MY_STATS_ID) {
      if (!isStaff(interaction.member)) {
        return interaction.reply(ephemeralPayload({ content: STAFF_TOP.noPermission }));
      }
      return handleStaffTopMyStats(interaction);
    }

    if (id === GAP_ID) {
      if (!isStaff(interaction.member)) {
        return interaction.reply(ephemeralPayload({ content: STAFF_TOP.noPermission }));
      }
      return handleStaffTopGap(interaction);
    }

    if (id.startsWith('yetkibaslat:select:')) {
      return handleYetkiBaslatButton(interaction);
    }

    if (
      id.startsWith(TOP.bittir.buttons.absentPrefix) ||
      id.startsWith(TOP.bittir.buttons.participantsPrefix) ||
      id.startsWith(TOP.bittir.buttons.mazaretPrefix)
    ) {
      return handleMeetingFinishButton(interaction);
    }

    if (id.startsWith(MAZ.buttons.toplantiOpenPrefix)) {
      return handleMazaretToplantiButton(interaction);
    }

    if (id.startsWith(MAZ.buttons.approvePrefix)) {
      return handleMazaretApprove(interaction);
    }

    if (id.startsWith(MAZ.buttons.rejectPrefix)) {
      return handleMazaretRejectButton(interaction);
    }

    if (id.startsWith(HELP.buttonPrefix)) {
      return handleHelpCategoryButton(interaction);
    }

    if (id.startsWith('stat:tab:')) {
      if (!isStaff(interaction.member)) {
        return interaction.reply(ephemeralPayload({ content: MESSAGES.noPermission }));
      }
      return handleStatTab(interaction);
    }

    if (id === CHANGELOG.buttons.openModal) {
      if (!isUstYonetim(interaction.member)) {
        return interaction.reply(
          ephemeralPayload({ content: CHANGELOG.messages.noPermission })
        );
      }
      return handleChangelogOpen(interaction);
    }

    if (id.startsWith(OYL.buttons.option1Prefix)) {
      return handleOylamaVote(interaction, 'option1');
    }

    if (id.startsWith(OYL.buttons.option2Prefix)) {
      return handleOylamaVote(interaction, 'option2');
    }

    if (id.startsWith(CEK.buttons.joinPrefix)) {
      return handleCekilisJoin(interaction);
    }

    if (id.startsWith(CEK.buttons.listPrefix)) {
      return handleCekilisList(interaction);
    }

    if (id === MULAKAT.buttons.call) {
      return handleCall(interaction);
    }

    if (id === MESLEK.buttons.add || id === MESLEK.buttons.remove) {
      return handleMeslekButton(interaction);
    }

    if (id.startsWith(EKIP.bilgiUi.ekiplerEditBtnPrefix)) {
      return handleEkiplerEditButton(interaction);
    }

    if (id.startsWith(EKIP.bilgiUi.warnAddBtnPrefix)) {
      return handleWarnAddButton(interaction);
    }

    if (id.startsWith(EKIP.bilgiUi.warnRemoveBtnPrefix)) {
      return handleWarnRemoveButton(interaction);
    }

    if (
      id.startsWith(EKIP.bilgiUi.bossBtnPrefix) ||
      id.startsWith(EKIP.bilgiUi.idToplaBtnPrefix) ||
      id.startsWith(EKIP.bilgiUi.islemBtnPrefix) ||
      id.startsWith(EKIP.bilgiUi.islemMoreBtnPrefix) ||
      id.startsWith(EKIP.bilgiUi.islemBackBtnPrefix)
    ) {
      return handleBilgiButton(interaction);
    }

    if (
      id.startsWith(EKIP.buttons.closePrefix) ||
      id.startsWith(EKIP.buttons.addMemberPrefix) ||
      id.startsWith(EKIP.buttons.banPrefix)
    ) {
      return handleEkipButton(interaction);
    }

    if (id.startsWith('ticket_open_')) {
      return ticketService.createTicket(interaction, id.replace('ticket_open_', ''));
    }

    if (id.startsWith('ekip_ticket_open_')) {
      return ekipTicketService.createEkipTicket(interaction, id.replace('ekip_ticket_open_', ''));
    }

    if (id.startsWith('ticket_')) {
      if (!isStaff(interaction.member)) {
        return interaction.reply(ephemeralPayload({ content: MESSAGES.noPermission }));
      }

      switch (id) {
        case 'ticket_claim':
          return ticketService.claimTicket(interaction);
        case 'ticket_close':
          return ticketService.closeTicket(interaction);
        case 'ticket_transfer':
          return ticketService.showTransferMenu(interaction);
        case 'ticket_add_member':
          return ticketService.showAddMemberMenu(interaction);
      }
    }

    if (id.startsWith('ekip_ticket_')) {
      if (!isStaff(interaction.member)) {
        return interaction.reply(ephemeralPayload({ content: MESSAGES.noPermission }));
      }

      switch (id) {
        case 'ekip_ticket_claim':
          return ekipTicketService.claimEkipTicket(interaction);
        case 'ekip_ticket_close':
          return ekipTicketService.closeEkipTicket(interaction);
        case 'ekip_ticket_transfer':
          return ekipTicketService.showTransferMenu(interaction);
        case 'ekip_ticket_add':
          return ekipTicketService.showAddMemberMenu(interaction);
      }
    }
  }

  if (interaction.isUserSelectMenu()) {
    if (interaction.customId === CHANGELOG.selects.authors) {
      if (!isUstYonetim(interaction.member)) {
        return interaction.update({
          content: CHANGELOG.messages.noPermission,
          components: [],
        });
      }
      return handleChangelogAuthorsSelect(interaction);
    }

    const selectedId = interaction.values[0];

    if (interaction.customId === 'ticket_transfer_select') {
      if (!isStaff(interaction.member)) {
        return interaction.update({ content: MESSAGES.noPermission, components: [] });
      }
      return ticketService.transferTicket(interaction, selectedId);
    }

    if (interaction.customId === 'ticket_add_member_select') {
      if (!isStaff(interaction.member)) {
        return interaction.update({ content: MESSAGES.noPermission, components: [] });
      }
      return ticketService.addMemberToTicket(interaction, selectedId);
    }

    if (interaction.customId === 'ekip_ticket_transfer_select') {
      if (!isStaff(interaction.member)) {
        return interaction.update({ content: MESSAGES.noPermission, components: [] });
      }
      return ekipTicketService.transferEkipTicket(interaction, selectedId);
    }

    if (interaction.customId === 'ekip_ticket_add_member_select') {
      if (!isStaff(interaction.member)) {
        return interaction.update({ content: MESSAGES.noPermission, components: [] });
      }
      return ekipTicketService.addMemberToEkipTicket(interaction, selectedId);
    }

    if (interaction.customId.startsWith(EKIP.buttons.addSelectPrefix)) {
      if (!isStaff(interaction.member)) {
        return interaction.update({ content: MESSAGES.noPermission, components: [] });
      }
      const ekipId = interaction.customId.slice(EKIP.buttons.addSelectPrefix.length);
      return addMember(interaction, ekipId, selectedId);
    }

    if (interaction.customId.startsWith(EKIP.buttons.banSelectPrefix)) {
      if (!isBanhammer(interaction.member)) {
        return interaction.update({ content: EKIP.messages.noPermission, components: [] });
      }
      const ekipId = interaction.customId.slice(EKIP.buttons.banSelectPrefix.length);
      return banFromEkip(interaction, ekipId, selectedId);
    }

    if (interaction.customId.startsWith(EKIP.bilgiUi.bossSelectPrefix)) {
      return handleBilgiBossSelect(interaction);
    }

    if (interaction.customId === MESLEK.select.kullaniciPick) {
      return handleMeslekUserSelect(interaction);
    }
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === KURULUM.select.customId) {
      return handleKurulumSelect(interaction);
    }

    if (interaction.customId.startsWith(EKIP.bilgiUi.yardimSelectPrefix)) {
      return handleBilgiYardimSelect(interaction);
    }

    if (
      interaction.customId === MESLEK.select.addType ||
      interaction.customId === MESLEK.select.ekipPick ||
      interaction.customId === MESLEK.select.removePick
    ) {
      return handleMeslekStringSelect(interaction);
    }
  }

  if (interaction.isRoleSelectMenu()) {
    const selectedRoleId = interaction.values[0];
    const customId = interaction.customId;

    if (
      customId.startsWith(MESLEK.select.ekipRolePrefix) ||
      customId.startsWith(MESLEK.select.kullaniciRolePrefix)
    ) {
      return handleMeslekRoleSelect(interaction);
    }

    if (customId.startsWith('context_rol_ekle:')) {
      const userId = customId.split(':')[1];
      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      const role = interaction.guild.roles.cache.get(selectedRoleId);

      if (!member || !role) {
        return interaction.update({ content: '❌ Kullanıcı veya rol bulunamadı.', components: [] });
      }

      const blockedGive = await getRoleBlockedMessage(
        interaction.guild.id,
        role,
        interaction.member
      );
      if (blockedGive) {
        return interaction.update({ content: blockedGive, components: [] });
      }

      if (member.roles.cache.has(selectedRoleId)) {
        return interaction.update({ content: `❌ ${member.toString()} zaten ${role.toString()} rolüne sahip.`, components: [] });
      }

      await member.roles.add(role).catch(() => {});
      return interaction.update({ content: `✅ ${member.toString()} kullanıcısına ${role.toString()} rolü verildi.`, components: [] });
    }

    if (customId.startsWith('context_rol_al:')) {
      const userId = customId.split(':')[1];
      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      const role = interaction.guild.roles.cache.get(selectedRoleId);

      if (!member || !role) {
        return interaction.update({ content: '❌ Kullanıcı veya rol bulunamadı.', components: [] });
      }

      const blockedRemove = await getRoleBlockedMessage(
        interaction.guild.id,
        role,
        interaction.member
      );
      if (blockedRemove) {
        return interaction.update({ content: blockedRemove, components: [] });
      }

      if (!member.roles.cache.has(selectedRoleId)) {
        return interaction.update({ content: `❌ ${member.toString()} zaten ${role.toString()} rolüne sahip değil.`, components: [] });
      }

      await member.roles.remove(role).catch(() => {});
      return interaction.update({ content: `✅ ${member.toString()} kullanıcısından ${role.toString()} rolü alındı.`, components: [] });
    }
  }
}

module.exports = { handleInteraction };
