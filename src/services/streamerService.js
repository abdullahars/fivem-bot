const {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');
const { getConfig, getStreamerSettings, getIds } = require('../config/loadConfig');
const { parseEmbedColor } = require('../utils/colors');
const { formatTemplate } = require('../utils/format');
const { applyButtonEmoji } = require('../utils/buttonEmoji');
const { ephemeralPayload } = require('../utils/interaction');
const { sendLogEmbed } = require('../utils/logChannel');
const { baseEmbed } = require('../utils/embedBuilder');
const STREAMER = require('../constants/streamer');

function isValidStreamUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function buildWatchButton(streamUrl) {
  return applyButtonEmoji(
    new ButtonBuilder()
      .setLabel(STREAMER.buttons.watch.label)
      .setStyle(ButtonStyle.Link)
      .setURL(streamUrl),
    STREAMER.buttons.watch.emoji
  );
}

function buildStreamerPayload(user, streamUrl) {
  const config = getConfig();
  const settings = getStreamerSettings();
  const P = STREAMER.panel;
  const displayName = user.displayName || user.username;
  const timestamp = Math.floor(Date.now() / 1000);
  const avatarUrl = user.displayAvatarURL({ size: 256 });

  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  container.addSectionComponents((section) =>
    section
      .addTextDisplayComponents((td) =>
        td.setContent(
          `${formatTemplate(P.notifyLine, { user: user.toString() })}\n\n` +
            `## ${P.title}`
        )
      )
      .setThumbnailAccessory((thumb) =>
        thumb.setURL(avatarUrl).setDescription(displayName)
      )
  );

  container.addSeparatorComponents((sep) => sep);

  container.addTextDisplayComponents((td) =>
    td.setContent(
      `${formatTemplate(P.liveLine, { name: displayName })}\n` +
        `${P.inviteLine}`
    )
  );

  container.addSeparatorComponents((sep) => sep);

  const watchBtn = buildWatchButton(streamUrl);
  container.addSectionComponents((section) =>
    section
      .addTextDisplayComponents((td) =>
        td.setContent(
          `${P.linkTitle}\n${formatTemplate(P.linkText, { url: streamUrl })}`
        )
      )
      .setButtonAccessory(() => watchBtn)
  );

  const imageUrl = settings.imageUrl?.trim() || config.panel?.imageUrl?.trim();
  if (imageUrl) {
    container.addSeparatorComponents((sep) => sep);
    container.addMediaGalleryComponents((gallery) =>
      gallery.addItems((item) =>
        item.setURL(imageUrl).setDescription(displayName)
      )
    );
  }

  container.addSeparatorComponents((sep) => sep.setDivider(false));

  container.addTextDisplayComponents((td) =>
    td.setContent(formatTemplate(P.timeLine, { ts: timestamp }))
  );

  if (config.bot.footer?.trim()) {
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

async function logStreamerAnnouncement(guild, { user, streamUrl, targetChannel }) {
  const ids = getIds();
  if (!ids.streamerLogChannelId) return;

  const embed = baseEmbed()
    .setTitle(STREAMER.log.title)
    .addFields(
      {
        name: STREAMER.log.fields.streamer,
        value: `${user} (\`${user.tag}\`)`,
        inline: true,
      },
      {
        name: STREAMER.log.fields.target,
        value: targetChannel?.toString?.() || '—',
        inline: true,
      },
      {
        name: STREAMER.log.fields.command,
        value: '`/streamer`',
        inline: true,
      },
      {
        name: STREAMER.log.fields.link,
        value: streamUrl,
        inline: false,
      }
    )
    .setFooter({ text: `ID: ${user.id}` });

  await sendLogEmbed(guild, ids.streamerLogChannelId, embed);
}

async function executeStreamer(interaction) {
  const settings = getStreamerSettings();
  if (!settings.configured) {
    return interaction.reply(ephemeralPayload({ content: STREAMER.messages.notConfigured }));
  }

  const streamUrl = interaction.options.getString(STREAMER.options.yayinLinki.name)?.trim();
  if (!streamUrl || !isValidStreamUrl(streamUrl)) {
    return interaction.reply(ephemeralPayload({ content: STREAMER.messages.invalidUrl }));
  }

  const channel = await interaction.guild.channels
    .fetch(settings.channelId)
    .catch(() => null);

  if (!channel?.isTextBased?.() || channel.isDMBased()) {
    return interaction.reply(ephemeralPayload({ content: STREAMER.messages.channelMissing }));
  }

  const me = interaction.guild.members.me;
  if (!me?.permissionsIn(channel).has(PermissionFlagsBits.SendMessages)) {
    return interaction.reply(
      ephemeralPayload({ content: STREAMER.messages.botMissingPermission })
    );
  }

  const payload = buildStreamerPayload(interaction.user, streamUrl);

  try {
    await channel.send({
      ...payload,
      allowedMentions: { users: [interaction.user.id] },
    });

    logStreamerAnnouncement(interaction.guild, {
      user: interaction.user,
      streamUrl,
      targetChannel: channel,
    }).catch((err) => console.warn('[StreamerLog]', err?.message || err));

    return interaction.reply(ephemeralPayload({ content: STREAMER.messages.published }));
  } catch (err) {
    console.error('[Streamer]', err?.message || err);
    return interaction.reply(ephemeralPayload({ content: STREAMER.messages.failed }));
  }
}

module.exports = { executeStreamer };
