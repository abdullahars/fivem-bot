const { Events } = require('discord.js');
const { MemberInviteRecord } = require('../database/models/MemberInviteRecord');

const VANITY_LABEL_JOIN = 'ÖZEL URL!';
const VANITY_LABEL_LEAVE = 'Sunucu Özel URL';

/** @type {Map<string, { invites: Map<string, object>, vanityUses: number }>} */
const inviteCache = new Map();

async function refreshInviteCache(guild) {
  const map = new Map();
  let vanityUses = 0;

  try {
    const invites = await guild.invites.fetch();
    for (const inv of invites.values()) {
      map.set(inv.code, {
        uses: inv.uses ?? 0,
        inviterId: inv.inviter?.id || null,
        inviterTag: inv.inviter?.tag || null,
        inviterName: inv.inviter?.username || inv.inviter?.globalName || null,
      });
    }
  } catch {
    // Davetleri görme izni yok
  }

  try {
    const vanity = await guild.fetchVanityData();
    if (vanity) vanityUses = vanity.uses ?? 0;
  } catch {
    // Özel URL yok veya izin yok
  }

  inviteCache.set(guild.id, { invites: map, vanityUses });
}

async function detectUsedInvite(guild) {
  const prev = inviteCache.get(guild.id);

  try {
    const newInvites = await guild.invites.fetch();
    for (const invite of newInvites.values()) {
      const old = prev?.invites?.get(invite.code);
      const newUses = invite.uses ?? 0;
      if (old != null && newUses > old.uses) {
        const result = {
          source: 'invite',
          inviterId: invite.inviter?.id || null,
          inviterTag: invite.inviter?.tag || null,
          inviterName: invite.inviter?.username || invite.inviter?.globalName || 'Bilinmiyor',
          inviteCode: invite.code,
          inviteUses: newUses,
        };
        await refreshInviteCache(guild);
        return result;
      }
    }
  } catch {
    // fetch başarısız
  }

  try {
    const vanity = await guild.fetchVanityData();
    if (vanity) {
      const oldVanity = prev?.vanityUses ?? 0;
      const newVanity = vanity.uses ?? 0;
      if (newVanity > oldVanity) {
        const result = {
          source: 'vanity',
          inviterId: null,
          inviterTag: null,
          inviterName: VANITY_LABEL_JOIN,
          inviteCode: vanity.code || 'vanity',
          inviteUses: newVanity,
        };
        await refreshInviteCache(guild);
        return result;
      }
    }
  } catch {
    // vanity yok
  }

  await refreshInviteCache(guild);
  return {
    source: 'unknown',
    inviterId: null,
    inviterTag: null,
    inviterName: 'Bilinmiyor',
    inviteCode: null,
    inviteUses: 0,
  };
}

async function recordMemberJoinInvite(member) {
  if (!member?.guild || member.user?.bot) return null;

  const invite = await detectUsedInvite(member.guild);
  const displayName = member.displayName || member.user.username;
  const memberCount = member.guild.memberCount;

  await MemberInviteRecord.create({
    guildId: member.guild.id,
    userId: member.id,
    userTag: member.user.tag,
    displayName,
    inviterId: invite.inviterId,
    inviterTag: invite.inviterTag,
    inviterName: invite.inviterName,
    inviteCode: invite.inviteCode,
    inviteUses: invite.inviteUses,
    memberCount,
    source: invite.source,
  }).catch((err) => {
    console.warn('[InviteRecord]', err.message);
  });

  return { ...invite, memberCount, displayName };
}

async function getJoinInviteRecord(guildId, userId) {
  return MemberInviteRecord.findOne({ guildId, userId }).sort({ createdAt: -1 }).lean();
}

async function getInviteStatsForUser(guild, userId) {
  const joinRecord = await getJoinInviteRecord(guild.id, userId);

  let invitesMade = 0;
  let inviteCodes = 0;
  try {
    const invites = await guild.invites.fetch();
    for (const inv of invites.values()) {
      if (inv.inviter?.id === userId) {
        invitesMade += inv.uses ?? 0;
        inviteCodes += 1;
      }
    }
  } catch {
    // izin yok
  }

  const invitedCount = await MemberInviteRecord.countDocuments({
    guildId: guild.id,
    inviterId: userId,
  });

  return {
    joinRecord,
    invitesMade,
    inviteCodes,
    invitedCount,
  };
}

function formatInviterLabel(record, forLeave = false) {
  if (!record) return 'Bilinmiyor';
  if (record.source === 'vanity') {
    return forLeave ? VANITY_LABEL_LEAVE : VANITY_LABEL_JOIN;
  }
  if (record.inviterName) return record.inviterName;
  if (record.inviterTag) return record.inviterTag;
  return 'Bilinmiyor';
}

function registerInviteTracking(client) {
  client.on(Events.InviteCreate, (invite) => {
    if (!invite.guild) return;
    refreshInviteCache(invite.guild).catch(() => {});
  });

  client.on(Events.InviteDelete, (invite) => {
    if (!invite.guild) return;
    refreshInviteCache(invite.guild).catch(() => {});
  });
}

async function initInviteCache(client) {
  for (const guild of client.guilds.cache.values()) {
    await refreshInviteCache(guild).catch(() => {});
  }
}

module.exports = {
  registerInviteTracking,
  initInviteCache,
  refreshInviteCache,
  recordMemberJoinInvite,
  getJoinInviteRecord,
  getInviteStatsForUser,
  formatInviterLabel,
  VANITY_LABEL_JOIN,
  VANITY_LABEL_LEAVE,
};
