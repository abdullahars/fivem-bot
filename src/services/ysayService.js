const { getIds, getYsaySettings } = require('../config/loadConfig');
const { formatTemplate } = require('../utils/format');
const { getRoleMembers } = require('../utils/roleMembers');
const YSAY = require('../constants/ysay');

const MENTION_LIMIT = 1800;

async function getStaffNotInVoice(guild) {
  const ids = getIds();
  const staffRoleId = ids.staffRoleId;
  if (!staffRoleId || staffRoleId.includes('ROL_ID')) {
    return { error: YSAY.noStaffRole };
  }

  const role = guild.roles.cache.get(staffRoleId);
  if (!role) {
    return { error: YSAY.roleNotFound };
  }

  const absent = getRoleMembers(guild, staffRoleId).filter((m) => !m.voice?.channelId);

  return { absent, staffRoleId };
}

function buildMentionContent(absent, staffRoleId) {
  if (absent.length === 0) {
    return { empty: true };
  }

  const userIds = absent.map((m) => m.id);
  let mentions = absent.map((m) => m.toString()).join(' ');

  if (mentions.length > MENTION_LIMIT) {
    mentions = `<@&${staffRoleId}> — *${absent.length} yetkili (liste çok uzun)*`;
    return {
      content: mentions,
      allowedMentions: { roles: [staffRoleId], users: [] },
      count: absent.length,
    };
  }

  return {
    content: mentions,
    allowedMentions: { users: userIds },
    count: absent.length,
  };
}

async function buildYsayMessage(guild) {
  const result = await getStaffNotInVoice(guild);
  if (result.error) return { error: result.error };
  if (result.absent.length === 0) return { empty: true, text: YSAY.empty };

  const { content, allowedMentions, count } = buildMentionContent(
    result.absent,
    result.staffRoleId
  );
  const settings = getYsaySettings();
  const template = settings.message || YSAY.message;

  const text = formatTemplate(template, {
    mentions: content,
    count: String(count),
  });

  return { text, allowedMentions, count, absent: result.absent };
}

async function sendDmsToAbsent(absent, guildName) {
  const settings = getYsaySettings();
  const template = settings.dmMessage || YSAY.dmMessage;
  const dmText = formatTemplate(template, { guild: guildName });

  let dmSent = 0;
  let dmFail = 0;

  for (const member of absent) {
    try {
      await member.send(dmText);
      dmSent += 1;
    } catch {
      dmFail += 1;
    }
  }

  return { dmSent, dmFail };
}

module.exports = { buildYsayMessage, getStaffNotInVoice, sendDmsToAbsent };
