const {
  ContainerBuilder,
  MessageFlags,
  OverwriteType,
  PermissionFlagsBits,
} = require('discord.js');
const { ChannelLock } = require('../database/models/ChannelLock');
const { getConfig } = require('../config/loadConfig');
const { parseEmbedColor } = require('../utils/colors');
const KILIT = require('../constants/kilit');
const { formatTemplate } = require('../utils/format');
const { ephemeralPayload } = require('../utils/interaction');

const WRITE_PERMS = [
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.SendMessagesInThreads,
  PermissionFlagsBits.CreatePublicThreads,
  PermissionFlagsBits.CreatePrivateThreads,
  PermissionFlagsBits.SendVoiceMessages,
];

const LOCK_BITS = WRITE_PERMS.reduce((acc, bit) => acc | bit, 0n);

function serializeOverwrites(channel) {
  return [...channel.permissionOverwrites.cache.values()].map((ow) => ({
    id: ow.id,
    type: ow.type,
    allow: ow.allow.bitfield.toString(),
    deny: ow.deny.bitfield.toString(),
  }));
}

function buildLockedOverwrites(snapshot, guildId) {
  const locked = snapshot.map((ow) => {
    let allow = BigInt(ow.allow);
    let deny = BigInt(ow.deny);
    allow &= ~LOCK_BITS;
    deny |= LOCK_BITS;
    return {
      id: ow.id,
      type: ow.type,
      allow: allow.toString(),
      deny: deny.toString(),
    };
  });

  if (!locked.some((ow) => ow.id === guildId)) {
    locked.push({
      id: guildId,
      type: OverwriteType.Role,
      allow: '0',
      deny: LOCK_BITS.toString(),
    });
  }

  return locked;
}

async function applyOverwriteSet(channel, serialized) {
  await channel.permissionOverwrites.set(
    serialized.map((ow) => ({
      id: ow.id,
      type: ow.type,
      allow: BigInt(ow.allow),
      deny: BigInt(ow.deny),
    }))
  );
}

function buildAnnouncementPayload({ title, body, channel, userId }) {
  const config = getConfig();
  const P = KILIT.panel;
  const timestamp = Math.floor(Date.now() / 1000);

  const metaLines =
    `**${P.rowChannel}:** ${channel}\n` +
    `**${P.rowBy}:** <@${userId}>\n` +
    `**${P.rowTime}:** <t:${timestamp}:F>`;

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  container.addTextDisplayComponents((td) =>
    td.setContent(`## ${title}\n\n${body}\n\n${metaLines}`)
  );

  const imageUrl = config.panel?.imageUrl?.trim();
  if (imageUrl) {
    container.addSeparatorComponents((sep) => sep);
    container.addMediaGalleryComponents((gallery) =>
      gallery.addItems((item) => item.setURL(imageUrl).setDescription(title))
    );
  }

  if (config.bot.footer?.trim()) {
    container.addSeparatorComponents((sep) => sep.setDivider(false));
    container.addTextDisplayComponents((td) =>
      td.setContent(`-# ${config.bot.footer}`)
    );
  }

  return {
    embeds: [],
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

function buildLockedAnnouncement(channel, userId) {
  const P = KILIT.panel;
  return buildAnnouncementPayload({
    title: P.lockedTitle,
    body: P.lockedBody,
    channel,
    userId,
  });
}

function buildUnlockedAnnouncement(channel, userId) {
  const P = KILIT.panel;
  return buildAnnouncementPayload({
    title: P.unlockedTitle,
    body: P.unlockedBody,
    channel,
    userId,
  });
}

async function lockChannel(interaction) {
  const channel = interaction.channel;
  const snapshot = serializeOverwrites(channel);
  const lockedOverwrites = buildLockedOverwrites(snapshot, interaction.guild.id);

  await channel.send(buildLockedAnnouncement(channel, interaction.user.id));
  await applyOverwriteSet(channel, lockedOverwrites);

  await ChannelLock.create({
    guildId: interaction.guild.id,
    channelId: channel.id,
    overwrites: snapshot,
    lockedById: interaction.user.id,
    lockedByTag: interaction.user.tag,
    lockedAt: new Date(),
  });

  return interaction.editReply({
    content: formatTemplate(KILIT.messages.locked, { channel: channel.toString() }),
  });
}

async function unlockChannel(interaction, record) {
  const channel = interaction.channel;

  await applyOverwriteSet(channel, record.overwrites || []);
  await channel.send(buildUnlockedAnnouncement(channel, interaction.user.id));
  await ChannelLock.deleteOne({ _id: record._id });

  return interaction.editReply({
    content: formatTemplate(KILIT.messages.unlocked, { channel: channel.toString() }),
  });
}

async function executeKilit(interaction) {
  const channel = interaction.channel;

  if (!channel?.isTextBased?.() || channel.isDMBased()) {
    return interaction.reply(ephemeralPayload({ content: KILIT.messages.notTextChannel }));
  }

  const me = interaction.guild.members.me;
  if (!me?.permissionsIn(channel).has(PermissionFlagsBits.ManageChannels)) {
    return interaction.reply(ephemeralPayload({ content: KILIT.messages.botMissingPermission }));
  }

  await interaction.deferReply(ephemeralPayload());

  const existing = await ChannelLock.findOne({
    guildId: interaction.guild.id,
    channelId: channel.id,
  });

  try {
    if (existing) {
      return unlockChannel(interaction, existing);
    }
    return lockChannel(interaction);
  } catch (err) {
    console.error('[Kilit]', err?.message || err);
    return interaction.editReply(ephemeralPayload({ content: KILIT.messages.failed }));
  }
}

module.exports = { executeKilit };
