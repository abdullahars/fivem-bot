const {
  ChannelType,
  ContainerBuilder,
  Events,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');
const { getConfig, getMulakatSettings, getIds } = require('../config/loadConfig');
const { parseEmbedColor } = require('../utils/colors');
const { formatTemplate } = require('../utils/format');
const MULAKAT = require('../constants/mulakat');

/** channelId -> { userId, guildId } */
const mulakatRooms = new Map();
/** guildId:userId -> channelId */
const userMulakatRoom = new Map();

function userRoomKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function sanitizeVoiceName(value) {
  return String(value || 'uye')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);
}

function buildPrivateRoomPermissions(guild, userId, staffRoleId) {
  const overwrites = [
    {
      id: guild.id,
      deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
    },
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.MoveMembers,
      ],
    },
    {
      id: userId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.Stream,
      ],
    },
  ];

  if (staffRoleId && !String(staffRoleId).includes('ROL_ID')) {
    overwrites.push({
      id: staffRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.MuteMembers,
        PermissionFlagsBits.DeafenMembers,
        PermissionFlagsBits.MoveMembers,
        PermissionFlagsBits.Stream,
      ],
    });
  }

  return overwrites;
}

function buildNotifyPayload({ user, roomChannel, staffRoleId }) {
  const config = getConfig();
  const P = MULAKAT.voice;
  const staffMention = staffRoleId ? `<@&${staffRoleId}>` : '@staff';

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  container.addTextDisplayComponents((td) =>
    td.setContent(
      `## ${P.notifyTitle}\n\n` +
        `${staffMention}\n\n` +
        `${formatTemplate(P.notifyBody, {
          user: user.toString(),
          room: roomChannel.toString(),
        })}`
    )
  );

  const imageUrl = getMulakatSettings().imageUrl || config.panel?.imageUrl?.trim();
  if (imageUrl) {
    container.addSeparatorComponents((sep) => sep);
    container.addMediaGalleryComponents((gallery) =>
      gallery.addItems((item) => item.setURL(imageUrl).setDescription(P.notifyTitle))
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
    allowedMentions: staffRoleId ? { roles: [staffRoleId] } : { parse: [] },
  };
}

async function sendMulakatNotify(guild, { user, roomChannel }) {
  const settings = getMulakatSettings();
  if (!settings.notifyChannelId) return;

  const channel = await guild.channels
    .fetch(settings.notifyChannelId)
    .catch(() => null);
  if (!channel?.isTextBased?.()) return;

  const ids = getIds();
  const payload = buildNotifyPayload({
    user,
    roomChannel,
    staffRoleId: ids.staffRoleId,
  });

  await channel.send(payload);
}

function trackRoom(channelId, guildId, userId) {
  mulakatRooms.set(channelId, { guildId, userId });
  userMulakatRoom.set(userRoomKey(guildId, userId), channelId);
}

function untrackRoom(channelId) {
  const meta = mulakatRooms.get(channelId);
  if (meta) {
    userMulakatRoom.delete(userRoomKey(meta.guildId, meta.userId));
  }
  mulakatRooms.delete(channelId);
}

async function cleanupMulakatRoom(channelId) {
  const meta = mulakatRooms.get(channelId);
  if (!meta) return;

  const client = global.client;
  const guild = client?.guilds?.cache?.get(meta.guildId);
  const channel = guild?.channels?.cache?.get(channelId);
  untrackRoom(channelId);
  if (channel) {
    await channel.delete('Mülakat odası boş — otomatik silindi').catch(() => {});
  }
}

async function getExistingRoom(guild, userId) {
  const key = userRoomKey(guild.id, userId);
  const channelId = userMulakatRoom.get(key);
  if (!channelId) return null;

  const channel = guild.channels.cache.get(channelId);
  if (!channel) {
    untrackRoom(channelId);
    return null;
  }
  return channel;
}

async function createMulakatRoom(guild, member) {
  const settings = getMulakatSettings();
  const ids = getIds();
  const me = guild.members.me;

  if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    console.warn('[MulakatVoice] ManageChannels yetkisi yok.');
    return null;
  }

  const existing = await getExistingRoom(guild, member.id);
  if (existing) return existing;

  const channelName = `mulakat-${sanitizeVoiceName(member.displayName || member.user.username)}`;

  const voiceChannel = await guild.channels.create({
    name: channelName.slice(0, 100),
    type: ChannelType.GuildVoice,
    parent: settings.privateRoomCategoryId || undefined,
    permissionOverwrites: buildPrivateRoomPermissions(
      guild,
      member.id,
      ids.staffRoleId
    ),
    reason: `Mülakat özel odası — ${member.user.tag}`,
  });

  trackRoom(voiceChannel.id, guild.id, member.id);
  return voiceChannel;
}

async function handleWaitingJoin(newState) {
  const settings = getMulakatSettings();
  if (!settings.configured) return;

  const member = newState.member;
  const guild = newState.guild;
  const newChannel = newState.channel;

  if (!member || member.user.bot || !newChannel) return;
  if (newChannel.id !== settings.waitingVoiceChannelId) return;

  const room = await createMulakatRoom(guild, member);
  if (!room) return;

  if (member.voice.channelId !== room.id) {
    await member.voice.setChannel(room).catch((err) => {
      console.warn('[MulakatVoice] Taşıma hatası:', err?.message || err);
    });
  }

  await sendMulakatNotify(guild, { user: member.user, roomChannel: room });
}

async function handleRoomLeave(oldState, newState) {
  const oldChannel = oldState.channel;
  if (!oldChannel || !mulakatRooms.has(oldChannel.id)) return;

  const leftChannel = newState.channel?.id !== oldChannel.id;
  if (!leftChannel) return;

  const channel =
    oldChannel.guild.channels.cache.get(oldChannel.id) ||
    (await oldChannel.fetch().catch(() => null));

  if (channel && channel.members.filter((m) => !m.user.bot).size === 0) {
    await cleanupMulakatRoom(oldChannel.id);
  }
}

async function handleVoiceStateUpdate(oldState, newState) {
  if (newState.member?.user?.bot) return;

  const joinedWaiting =
    newState.channel?.id &&
    (!oldState.channel || oldState.channel.id !== newState.channel.id);

  if (joinedWaiting) {
    await handleWaitingJoin(newState);
  }

  await handleRoomLeave(oldState, newState);
}

function registerMulakatVoice(client) {
  client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    handleVoiceStateUpdate(oldState, newState).catch((err) => {
      console.error('[MulakatVoice]', err?.message || err);
    });
  });

  client.on(Events.ChannelDelete, (channel) => {
    if (channel.type === ChannelType.GuildVoice && mulakatRooms.has(channel.id)) {
      untrackRoom(channel.id);
    }
  });
}

module.exports = {
  registerMulakatVoice,
  mulakatRooms,
  cleanupMulakatRoom,
};
