const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { KayitPuan } = require('../database/models/KayitPuan');
const { getIds, getWhitelistSettings } = require('../config/loadConfig');
const { baseEmbed } = require('../utils/embedBuilder');
const { formatTemplate } = require('../utils/format');
const { sendLogEmbed } = require('../utils/logChannel');
const KP = require('../constants/kayitPuan');

function starsForScore(score) {
  const n = Math.max(1, Math.min(5, Number(score) || 0));
  return '⭐'.repeat(n);
}

function formatAverage(avg) {
  if (avg == null || Number.isNaN(avg)) return null;
  const rounded = Math.round(avg * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

async function getStaffKayitRatingSummary(guildId, staffId) {
  const { getDb } = require('../database/sqlite/db');
  const row = getDb()
    .prepare(
      `SELECT AVG(score) AS avgScore, COUNT(*) AS count
       FROM kayit_puanlari
       WHERE guild_id = ? AND staff_id = ? AND status = 'rated'`
    )
    .get(guildId, staffId);

  const count = row?.count ?? 0;
  if (!count) return null;

  return {
    average: row.avgScore,
    averageText: formatAverage(row.avgScore),
    count,
    stars: starsForScore(Math.round(row.avgScore)),
  };
}

function buildRatingButtons(requestId) {
  const row = new ActionRowBuilder();
  for (let score = 1; score <= 5; score += 1) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${KP.buttons.ratePrefix}${requestId}:${score}`)
        .setLabel(KP.buttonLabels[score])
        .setStyle(ButtonStyle.Secondary)
    );
  }
  return row;
}

async function createRatingRequest(guild, voterUser, staffUser) {
  const record = await KayitPuan.create({
    guildId: guild.id,
    voterId: voterUser.id,
    voterTag: voterUser.tag,
    staffId: staffUser.id,
    staffTag: staffUser.tag,
    status: 'pending',
  });

  return String(record._id ?? record.id);
}

async function sendRatingRequestDm(client, guild, voterUser, staffUser) {
  if (!getWhitelistSettings().kayitPuanEnabled) return { ok: false, reason: 'disabled' };

  const requestId = await createRatingRequest(guild, voterUser, staffUser);

  try {
    await voterUser.send({
      content: KP.messages.dmBody,
      components: [buildRatingButtons(requestId)],
    });
    return { ok: true, requestId };
  } catch (err) {
    console.warn(KP.messages.dmSendFailed, voterUser.id, err?.message || err);
    await KayitPuan.deleteOne({ _id: requestId }).catch(() => {});
    return { ok: false, reason: 'dm_closed' };
  }
}

async function postPuanLog(guild, { voter, staff, score }) {
  const channelId = getIds().puanLogChannelId;
  if (!channelId) {
    console.warn(KP.messages.logChannelMissing);
    return;
  }

  const embed = baseEmbed()
    .setTitle(KP.messages.logTitle)
    .setDescription(
      formatTemplate(KP.messages.logDesc, {
        voter: voter.toString(),
        staff: staff.toString(),
        score: String(score),
        stars: starsForScore(score),
      })
    )
    .setTimestamp();

  await sendLogEmbed(guild, channelId, embed);
}

function buildRatedDmMessage(score) {
  return formatTemplate(KP.messages.thankYou, {
    stars: starsForScore(score),
  });
}

function disableRatingButtons(components, requestId) {
  if (!components?.length) return [];

  return components.map((row) => {
    const disabledRow = new ActionRowBuilder();
    const buttons = row.components.map((comp) => {
      const btn = ButtonBuilder.from(comp);
      if (comp.customId?.startsWith(`${KP.buttons.ratePrefix}${requestId}:`)) {
        btn.setDisabled(true);
      }
      return btn;
    });
    return disabledRow.addComponents(...buttons);
  });
}

async function handleKayitPuanButton(interaction) {
  const rest = interaction.customId.slice(KP.buttons.ratePrefix.length);
  const [requestId, scoreRaw] = rest.split(':');
  const score = Number(scoreRaw);

  if (!requestId || !Number.isInteger(score) || score < 1 || score > 5) {
    return interaction.reply({ content: KP.messages.invalidRequest, ephemeral: true });
  }

  const record = await KayitPuan.findById(requestId);
  if (!record || record.status !== 'pending') {
    return interaction.reply({ content: KP.messages.invalidRequest, ephemeral: true });
  }

  if (record.voterId !== interaction.user.id) {
    return interaction.reply({ content: KP.messages.notYourRating, ephemeral: true });
  }

  record.status = 'rated';
  record.score = score;
  record.ratedAt = new Date();
  await record.save();

  const guild =
    interaction.client.guilds.cache.get(record.guildId) ||
    (await interaction.client.guilds.fetch(record.guildId).catch(() => null));

  if (guild) {
    const voter = interaction.user;
    const staff =
      (await guild.members.fetch(record.staffId).catch(() => null))?.user ||
      (await interaction.client.users.fetch(record.staffId).catch(() => null));

    if (staff) {
      await postPuanLog(guild, { voter, staff, score });
    }
  }

  const disabledComponents = disableRatingButtons(interaction.message?.components, requestId);

  return interaction.update({
    content: buildRatedDmMessage(score),
    components: disabledComponents,
  });
}

module.exports = {
  sendRatingRequestDm,
  handleKayitPuanButton,
  getStaffKayitRatingSummary,
  starsForScore,
};
