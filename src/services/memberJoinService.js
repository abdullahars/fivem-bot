const { getIds, getKayitsizSettings } = require('../config/loadConfig');
const { logJoin } = require('./loggingService');
const { recordMemberJoinInvite } = require('./inviteService');

function isPlaceholderRole(id) {
  return !id || id.includes('ROL_ID') || id.includes('_ID');
}

async function autoAssignKayitsizOnJoin(member) {
  const { autoOnJoin } = getKayitsizSettings();
  if (!autoOnJoin) return;

  const ids = getIds();
  if (isPlaceholderRole(ids.kayitsizRoleId)) return;

  if (member.user.bot) return;
  if (!isPlaceholderRole(ids.whitelistRoleId) && member.roles.cache.has(ids.whitelistRoleId)) {
    return;
  }
  if (member.roles.cache.has(ids.kayitsizRoleId)) return;

  const me = member.guild.members.me;
  if (!me?.permissions.has('ManageRoles')) return;

  const kayitsizRole = member.guild.roles.cache.get(ids.kayitsizRoleId);
  if (!kayitsizRole || kayitsizRole.position >= me.roles.highest.position) return;

  try {
    await member.roles.add(ids.kayitsizRoleId, 'Otomatik kayıtsız (sunucuya giriş)');
    console.log(`[Kayıtsız] Otomatik verildi: ${member.user.tag}`);
  } catch (err) {
    console.warn('[Kayıtsız] Otomatik rol verilemedi:', err.message);
  }
}

function registerGuildMemberRemove(client) {
  const { Events } = require('discord.js');
  const { logLeave } = require('./loggingService');
  const { endSession } = require('./voiceTrackingService');

  client.on(Events.GuildMemberRemove, (member) => {
    endSession(member.guild.id, member.id, null, null).catch(() => {});
    logLeave(member).catch((err) => {
      console.error('[MemberLeave]', err.message || err);
    });
  });
}

function registerGuildMemberAdd(client) {
  const { Events } = require('discord.js');
  const { handleMemberJoin: handleBlacklistJoin } = require('./blacklistService');
  
  client.on(Events.GuildMemberAdd, async (member) => {
    // Önce blacklist kontrolü yap
    try {
      await handleBlacklistJoin(member);
    } catch (err) {
      console.error('[Blacklist Join]', err.message || err);
    }
    
    // Sonra kayıtsız rolü ver
    autoAssignKayitsizOnJoin(member).catch((err) => {
      console.error('[MemberJoin]', err.message || err);
    });
    
    // Log kaydet
    recordMemberJoinInvite(member)
      .then((inviteInfo) => logJoin(member, inviteInfo))
      .catch((err) => {
        console.error('[MemberJoin Log]', err.message || err);
      });
  });
}

module.exports = {
  autoAssignKayitsizOnJoin,
  registerGuildMemberAdd,
  registerGuildMemberRemove,
};
