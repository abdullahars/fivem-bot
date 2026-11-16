const {
  ContainerBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { BanLog } = require('../database/models/BanLog');
const { getIds } = require('../config/loadConfig');
const BAN = require('../constants/ban');
const { formatTemplate } = require('../utils/format');
const { baseEmbed } = require('../utils/embedBuilder');
const { sendLogEmbed } = require('../utils/logChannel');
const { ephemeralPayload } = require('../utils/interaction');
const { parseEmbedColor } = require('../utils/colors');
const { getConfig } = require('../config/loadConfig');
const { isBanhammer } = require('../utils/permissions');
const { applyButtonEmoji } = require('../utils/buttonEmoji');
const MESSAGES = require('../constants/messages');

function resolveTargetId(interaction) {
  const user = interaction.options.getUser(BAN.options.user.name);
  const idOpt = interaction.options.getString(BAN.options.id.name);
  const targetOpt = interaction.options.getString(BAN.options.target.name);

  if (user) return user.id;
  const raw = (idOpt || targetOpt || '').trim();
  if (!raw) return null;
  if (/^\d{17,20}$/.test(raw)) return raw;
  const mention = raw.match(/^<@!?(\d{17,20})>$/);
  return mention ? mention[1] : null;
}

function formatDate(d) {
  return `<t:${Math.floor(d.getTime() / 1000)}:F>`;
}

async function sendBanLog(guild, data) {
  const ids = getIds();
  const embed = baseEmbed()
    .setTitle(data.title)
    .setDescription(data.description)
    .setTimestamp();
  await sendLogEmbed(guild, ids.banLogChannelId, embed);
}

async function banUser(interaction) {
  const targetUser = interaction.options.getUser(BAN.options.user.name, true);
  const reason = interaction.options.getString(BAN.options.reason.name, true)?.trim();

  if (!reason) {
    return interaction.reply(ephemeralPayload({ content: BAN.messages.noReason }));
  }
  if (targetUser.bot) {
    return interaction.reply(ephemeralPayload({ content: BAN.messages.targetBot }));
  }

  const me = interaction.guild.members.me;
  if (!me?.permissions.has('BanMembers')) {
    return interaction.reply(ephemeralPayload({ content: BAN.messages.botNoPerm }));
  }

  const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (member && !member.bannable) {
    return interaction.reply(ephemeralPayload({ content: BAN.messages.notBannable }));
  }

  const existing = await BanLog.findOne({
    guildId: interaction.guild.id,
    targetId: targetUser.id,
    active: true,
  });
  if (existing) {
    return interaction.reply(ephemeralPayload({ content: BAN.messages.alreadyBanned }));
  }

  await interaction.guild.members.ban(targetUser.id, {
    reason: `${reason} — ${interaction.user.tag}`,
    deleteMessageSeconds: 0,
  });

  const record = await BanLog.create({
    guildId: interaction.guild.id,
    targetId: targetUser.id,
    targetTag: targetUser.tag,
    staffId: interaction.user.id,
    staffTag: interaction.user.tag,
    reason,
    active: true,
  });

  const now = record.createdAt;
  await sendBanLog(interaction.guild, {
    title: BAN.log.banTitle,
    description: formatTemplate(BAN.log.banDesc, {
      staff: interaction.user.toString(),
      target: targetUser.toString(),
      reason,
      date: formatDate(now),
    }),
  });

  return interaction.reply(
    ephemeralPayload({
      content: formatTemplate(BAN.messages.banSuccess, {
        target: targetUser.toString(),
        reason,
      }),
    })
  );
}

async function unbanById(guild, targetId, staffUser) {
  const bans = await guild.bans.fetch().catch(() => null);
  const isBanned = bans?.has(targetId);

  const record = await BanLog.findOne({
    guildId: guild.id,
    targetId,
    active: true,
  });

  if (!isBanned && !record) {
    return { ok: false, error: BAN.messages.notBanned };
  }

  if (isBanned) {
    await guild.members.unban(targetId, `Ban kaldır — ${staffUser.tag}`);
  }

  if (record) {
    record.active = false;
    record.unbannedById = staffUser.id;
    record.unbannedByTag = staffUser.tag;
    record.unbannedAt = new Date();
    await record.save();
  }

  const targetTag = record?.targetTag || targetId;
  await sendBanLog(guild, {
    title: BAN.log.unbanTitle,
    description: formatTemplate(BAN.log.unbanDesc, {
      staff: staffUser.toString(),
      target: `<@${targetId}> (\`${targetTag}\`)`,
      date: formatDate(new Date()),
    }),
  });

  return {
    ok: true,
    targetId,
    targetTag,
  };
}

async function unbanUser(interaction) {
  const targetId = resolveTargetId(interaction);
  if (!targetId) {
    return interaction.reply(ephemeralPayload({ content: BAN.messages.noTarget }));
  }

  const result = await unbanById(interaction.guild, targetId, interaction.user);
  if (!result.ok) {
    return interaction.reply(ephemeralPayload({ content: result.error }));
  }

  return interaction.reply(
    ephemeralPayload({
      content: formatTemplate(BAN.messages.unbanSuccess, {
        target: `<@${result.targetId}>`,
      }),
    })
  );
}

function buildBanBilgiCustomId(targetId) {
  return `banbilgi:unban:${targetId}`;
}

function buildBanBilgiMessage(record, targetUser) {
  const accentColor = parseEmbedColor(getConfig().bot.embedColor);
  const ts = Math.floor(new Date(record.createdAt).getTime() / 1000);
  const target = targetUser
    ? targetUser.toString()
    : `<@${record.targetId}> (\`${record.targetTag}\`)`;

  const desc = record.active
    ? formatTemplate(BAN.bilgi.activeDesc, {
        target,
        reason: record.reason,
        staff: `<@${record.staffId}> (\`${record.staffTag}\`)`,
        ts: String(ts),
      })
    : formatTemplate(BAN.bilgi.inactiveDesc, {
        target,
        reason: record.reason,
        staff: `<@${record.staffId}> (\`${record.staffTag}\`)`,
        ts: String(ts),
        unbanner: record.unbannedById
          ? `<@${record.unbannedById}> (\`${record.unbannedByTag}\`)`
          : '—',
        uts: String(Math.floor(new Date(record.unbannedAt).getTime() / 1000)),
      });

  const container = new ContainerBuilder().setAccentColor(accentColor);
  container.addTextDisplayComponents((td) =>
    td.setContent(`## ${BAN.bilgi.title}\n\n${desc}`)
  );

  if (record.active) {
    container.addSectionComponents((section) =>
      section
        .addTextDisplayComponents((td) => td.setContent(`**${BAN.bilgi.unbanButton}**`))
        .setButtonAccessory((button) => {
          const btn = button
            .setCustomId(buildBanBilgiCustomId(record.targetId))
            .setLabel(BAN.bilgi.unbanButton)
            .setStyle(ButtonStyle.Danger);
          applyButtonEmoji(btn, '🔓');
          return btn;
        })
    );
  }

  return {
    embeds: [],
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: ['users'] },
  };
}

async function showBanBilgi(interaction) {
  const targetId = resolveTargetId(interaction);
  if (!targetId) {
    return interaction.reply(ephemeralPayload({ content: BAN.messages.noTarget }));
  }

  const record =
    (await BanLog.findOne({
      guildId: interaction.guild.id,
      targetId,
      active: true,
    })) ||
    (await BanLog.findOne({ guildId: interaction.guild.id, targetId }).sort({ createdAt: -1 }));

  if (!record) {
    return interaction.reply(ephemeralPayload({ content: BAN.messages.notFound }));
  }

  const targetUser = await interaction.client.users.fetch(targetId).catch(() => null);
  const payload = buildBanBilgiMessage(record, targetUser);

  if (interaction.replied || interaction.deferred) {
    return interaction.editReply(payload);
  }
  return interaction.reply({ ...payload, ephemeral: true });
}

async function handleBanBilgiUnban(interaction) {
  if (!isBanhammer(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: BAN.messages.noBanhammer }));
  }

  const targetId = interaction.customId.split(':')[2];
  if (!targetId) return;

  await interaction.deferUpdate();

  const result = await unbanById(interaction.guild, targetId, interaction.user);
  if (!result.ok) {
    return interaction.followUp(ephemeralPayload({ content: result.error }));
  }

  const record = await BanLog.findOne({
    guildId: interaction.guild.id,
    targetId,
  }).sort({ createdAt: -1 });

  if (record) {
    const payload = buildBanBilgiMessage(record, null);
    await interaction.editReply(payload);
  }

  return interaction.followUp(
    ephemeralPayload({
      content: formatTemplate(BAN.messages.unbanSuccess, {
        target: `<@${targetId}>`,
      }),
    })
  );
}

module.exports = {
  banUser,
  unbanUser,
  showBanBilgi,
  handleBanBilgiUnban,
  buildBanBilgiMessage,
};
