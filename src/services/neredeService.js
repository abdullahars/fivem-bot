const { formatTemplate } = require('../utils/format');
const { baseEmbed } = require('../utils/embedBuilder');
const {
  micLabel,
  deafLabel,
  cameraLabel,
  streamLabel,
} = require('../utils/voiceStateLabels');
const NEREDE = require('../constants/nerede');

async function buildNeredePayload(guild, targetUser) {
  const member =
    guild.members.cache.get(targetUser.id) ||
    (await guild.members.fetch(targetUser.id).catch(() => null));

  if (!member) return null;

  const voiceState = member.voice;
  const channel = voiceState?.channel;
  const displayName = member.displayName || targetUser.username;
  const mention = member.toString();

  const embed = baseEmbed()
    .setTitle(formatTemplate(NEREDE.title, { user: displayName }))
    .setThumbnail(targetUser.displayAvatarURL({ size: 128 }));

  if (!channel) {
    embed.setDescription(formatTemplate(NEREDE.notInVoice, { mention }));
  } else {
    embed.setDescription(
      formatTemplate(NEREDE.inVoice, {
        mention,
        channel: channel.toString(),
        mic: micLabel(voiceState),
        deaf: deafLabel(voiceState),
        camera: cameraLabel(voiceState),
        stream: streamLabel(voiceState),
      })
    );
  }

  return { embeds: [embed] };
}

module.exports = { buildNeredePayload };
