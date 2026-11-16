const { PermissionFlagsBits } = require('discord.js');
const { getModerationSettings } = require('../config/loadConfig');
const MOD = require('../constants/moderation');
const { formatTemplate } = require('../utils/format');
const { ephemeralPayload } = require('../utils/interaction');

function getVoiceChannelMembers(member) {
  const channel = member.voice?.channel;
  if (!channel) return { error: MOD.notInVoice };

  const targets = channel.members.filter((m) => !m.user.bot && m.id !== member.id);
  if (!targets.size) return { error: MOD.emptyChannel };

  return { channel, targets };
}

async function setMuteState(member, targets, mute) {
  const me = member.guild.members.me;
  if (!me.permissions.has(PermissionFlagsBits.MuteMembers)) {
    return { error: MOD.botNoPerm };
  }

  let success = 0;
  let failed = 0;

  for (const [, target] of targets) {
    try {
      if (target.voice?.channel) {
        await target.voice.setMute(mute, mute ? 'Toplu sustur' : 'Toplu sustur aç');
        success++;
      }
    } catch {
      failed++;
    }
  }

  return { success, failed };
}

async function bulkMute(interaction) {
  if (!getModerationSettings().enabled) {
    return interaction.reply(ephemeralPayload({ content: MOD.disabled }));
  }

  const result = getVoiceChannelMembers(interaction.member);
  if (result.error) {
    return interaction.reply(ephemeralPayload({ content: result.error }));
  }

  const muteResult = await setMuteState(interaction.member, result.targets, true);
  if (muteResult.error) {
    return interaction.reply(ephemeralPayload({ content: muteResult.error }));
  }

  let content = formatTemplate(MOD.muteSuccess, {
    channel: result.channel.name,
    count: muteResult.success,
  });
  if (muteResult.failed > 0) {
    content += `\n${formatTemplate(MOD.partialFail, { failed: muteResult.failed })}`;
  }

  return interaction.reply(ephemeralPayload({ content }));
}

async function bulkUnmute(interaction) {
  if (!getModerationSettings().enabled) {
    return interaction.reply(ephemeralPayload({ content: MOD.disabled }));
  }

  const result = getVoiceChannelMembers(interaction.member);
  if (result.error) {
    return interaction.reply(ephemeralPayload({ content: result.error }));
  }

  const muteResult = await setMuteState(interaction.member, result.targets, false);
  if (muteResult.error) {
    return interaction.reply(ephemeralPayload({ content: muteResult.error }));
  }

  let content = formatTemplate(MOD.unmuteSuccess, {
    channel: result.channel.name,
    count: muteResult.success,
  });
  if (muteResult.failed > 0) {
    content += `\n${formatTemplate(MOD.partialFail, { failed: muteResult.failed })}`;
  }

  return interaction.reply(ephemeralPayload({ content }));
}

module.exports = { bulkMute, bulkUnmute };
