const SIL = require('../constants/sil');
const { formatTemplate } = require('../utils/format');
const { ephemeralPayload } = require('../utils/interaction');

async function deleteChannelMessages(channel, amount) {
  let totalDeleted = 0;
  let remaining = amount;

  while (remaining > 0) {
    const batch = Math.min(remaining, SIL.limits.batchSize);
    const deleted = await channel.bulkDelete(batch, true);
    const count = deleted.size;

    totalDeleted += count;
    remaining -= count;

    if (count === 0) break;
  }

  return totalDeleted;
}

async function executeSil(interaction) {
  const amount = interaction.options.getInteger(SIL.optionAmount.name);

  if (!interaction.channel?.isTextBased?.() || interaction.channel.isDMBased()) {
    return interaction.reply(ephemeralPayload({ content: SIL.messages.notTextChannel }));
  }

  if (
    amount == null ||
    amount < SIL.limits.min ||
    amount > SIL.limits.max
  ) {
    return interaction.reply(ephemeralPayload({ content: SIL.messages.invalidAmount }));
  }

  const me = interaction.guild.members.me;
  if (!me?.permissionsIn(interaction.channel).has('ManageMessages')) {
    return interaction.reply(
      ephemeralPayload({ content: SIL.messages.botMissingPermission })
    );
  }

  await interaction.deferReply(ephemeralPayload());

  try {
    const deletedCount = await deleteChannelMessages(interaction.channel, amount);

    if (deletedCount === 0) {
      return interaction.editReply(
        ephemeralPayload({ content: SIL.messages.nothingDeleted })
      );
    }

    const content =
      deletedCount < amount
        ? formatTemplate(SIL.messages.partialDeleted, { count: deletedCount })
        : formatTemplate(SIL.messages.deleted, { count: deletedCount });

    return interaction.editReply(ephemeralPayload({ content }));
  } catch (err) {
    console.error('[Sil]', err?.message || err);
    return interaction.editReply(ephemeralPayload({ content: SIL.messages.failed }));
  }
}

module.exports = { executeSil };
