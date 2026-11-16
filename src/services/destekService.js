const { Support } = require('../database/models/Support');
const { Counter } = require('../database/models/Counter');
const { getIds } = require('../config/loadConfig');
const { baseEmbed } = require('../utils/embedBuilder');
const { formatTemplate } = require('../utils/format');
const { sendLogEmbed } = require('../utils/logChannel');
const { ephemeralPayload } = require('../utils/interaction');
const { isStaff } = require('../utils/permissions');
const DESTEK = require('../constants/destek');
const {
  ContainerBuilder,
  MessageFlags,
  ButtonStyle,
} = require('discord.js');
const { parseEmbedColor } = require('../utils/colors');
const { getConfig } = require('../config/loadConfig');

async function getNextSupportNumber(guildId) {
  const counter = await Counter.findByIdAndUpdate(
    `support_${guildId}`,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

function parseUserMentions(text) {
  if (!text?.trim()) return [];
  
  // <@123456789> veya <@!123456789> formatındaki mentionları bul
  const mentionRegex = /<@!?(\d+)>/g;
  const matches = [...text.matchAll(mentionRegex)];
  
  return matches.map(match => match[1]);
}

async function createSupport(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: DESTEK.messages.noPermission }));
  }

  const receiversText = interaction.options.getString(DESTEK.options.receivers.name, true);
  const providersText = interaction.options.getString(DESTEK.options.providers.name, true);
  const penalizedText = interaction.options.getString(DESTEK.options.penalized.name);
  const description = interaction.options.getString(DESTEK.options.description.name, true);

  await interaction.deferReply(ephemeralPayload());

  // Parse user mentions
  const receiverIds = parseUserMentions(receiversText);
  const providerIds = parseUserMentions(providersText);
  const penalizedIds = penalizedText ? parseUserMentions(penalizedText) : [];

  if (receiverIds.length === 0) {
    return interaction.editReply(ephemeralPayload({ content: DESTEK.messages.noReceivers }));
  }

  if (providerIds.length === 0) {
    return interaction.editReply(ephemeralPayload({ content: DESTEK.messages.noProviders }));
  }

  // Fetch user objects
  const receivers = [];
  for (const userId of receiverIds) {
    try {
      const user = await interaction.client.users.fetch(userId);
      receivers.push({ userId: user.id, userTag: user.tag });
    } catch (err) {
      console.error('[Destek] Receiver fetch error:', err);
    }
  }

  const providers = [];
  for (const userId of providerIds) {
    try {
      const user = await interaction.client.users.fetch(userId);
      providers.push({ userId: user.id, userTag: user.tag });
    } catch (err) {
      console.error('[Destek] Provider fetch error:', err);
    }
  }

  const penalized = [];
  for (const userId of penalizedIds) {
    try {
      const user = await interaction.client.users.fetch(userId);
      penalized.push({ userId: user.id, userTag: user.tag });
    } catch (err) {
      console.error('[Destek] Penalized fetch error:', err);
    }
  }

  // Get next support number
  const supportNumber = await getNextSupportNumber(interaction.guild.id);

  // Save to database
  await Support.create({
    guildId: interaction.guild.id,
    supportNumber,
    receivers,
    providers,
    penalized,
    description,
    createdBy: {
      userId: interaction.user.id,
      userTag: interaction.user.tag,
    },
  });

  // Update stats for receivers (they received support)
  const { recordSupportReceived } = require('./statsService');
  for (const receiver of receivers) {
    await recordSupportReceived(interaction.guild.id, receiver.userId);
  }

  // Update stats for providers (they provided support)
  const { recordSupportProvided } = require('./statsService');
  for (const provider of providers) {
    await recordSupportProvided(interaction.guild.id, provider.userId);
  }

  // Send log
  await sendSupportLog(interaction.guild, {
    number: supportNumber,
    receivers,
    providers,
    penalized,
    description,
    createdBy: interaction.user,
  });

  // Show panel to user
  const panelPayload = await buildSupportPanel(interaction.guild, {
    number: supportNumber,
    receivers,
    providers,
    penalized,
    description,
    createdBy: interaction.user,
    timestamp: Math.floor(Date.now() / 1000),
  });

  await interaction.editReply(panelPayload);

  return interaction.followUp(
    ephemeralPayload({
      content: formatTemplate(DESTEK.messages.success, { number: supportNumber }),
    })
  );
}

async function buildSupportPanel(guild, data) {
  const config = getConfig();
  const container = new ContainerBuilder().setAccentColor(
    parseEmbedColor(config.bot.embedColor)
  );

  // Title
  container.addTextDisplayComponents((td) =>
    td.setContent(`## ${DESTEK.panel.title}\n### Destek #${data.number}`)
  );

  container.addSeparatorComponents((sep) => sep);

  // Desteği alan yetkililer
  const receiversText = data.receivers
    .map((r) => `• <@${r.userId}>`)
    .join('\n');
  
  container.addTextDisplayComponents((td) =>
    td.setContent(`**${DESTEK.panel.fields.receivers}:**\n${receiversText}`)
  );

  // Destekte bulunan stafflar
  const providersText = data.providers
    .map((p) => `• <@${p.userId}>`)
    .join('\n');
  
  container.addTextDisplayComponents((td) =>
    td.setContent(`**${DESTEK.panel.fields.providers}:**\n${providersText}`)
  );

  // Ceza alan kişiler
  const penalizedText = data.penalized.length > 0
    ? data.penalized.map((p) => `• <@${p.userId}>`).join('\n')
    : DESTEK.panel.noPenalized;
  
  container.addTextDisplayComponents((td) =>
    td.setContent(`**${DESTEK.panel.fields.penalized}:**\n${penalizedText}`)
  );

  // Açıklama
  container.addTextDisplayComponents((td) =>
    td.setContent(`**${DESTEK.panel.fields.description}:**\n${data.description}`)
  );

  container.addSeparatorComponents((sep) => sep);

  // Oluşturan ve tarih
  container.addTextDisplayComponents((td) =>
    td.setContent(
      `**${DESTEK.panel.fields.createdBy}:** ${data.createdBy.toString()}\n` +
      `**${DESTEK.panel.fields.timestamp}:** <t:${data.timestamp}:R>`
    )
  );

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

async function sendSupportLog(guild, data) {
  const ids = getIds();
  if (!ids.destekLogChannelId) return;

  const receiversText = data.receivers
    .map((r) => `• <@${r.userId}> (${r.userTag})`)
    .join('\n');

  const providersText = data.providers
    .map((p) => `• <@${p.userId}> (${p.userTag})`)
    .join('\n');

  const penalizedText = data.penalized.length > 0
    ? data.penalized.map((p) => `• <@${p.userId}> (${p.userTag})`).join('\n')
    : DESTEK.panel.noPenalized;

  const timestamp = Math.floor(Date.now() / 1000);

  const embed = baseEmbed()
    .setTitle(DESTEK.log.title)
    .setDescription(
      formatTemplate(DESTEK.log.desc, {
        number: data.number,
        receivers: receiversText,
        providers: providersText,
        penalized: penalizedText,
        description: data.description,
        createdBy: data.createdBy.toString(),
        timestamp,
      })
    )
    .setTimestamp();

  await sendLogEmbed(guild, ids.destekLogChannelId, embed);
}

async function getUserSupportStats(guildId, userId) {
  const received = await Support.countDocuments({
    guildId,
    'receivers.userId': userId,
  });

  const provided = await Support.countDocuments({
    guildId,
    'providers.userId': userId,
  });

  return { received, provided };
}

module.exports = {
  createSupport,
  getUserSupportStats,
};
