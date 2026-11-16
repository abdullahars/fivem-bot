const { MessageFlags } = require('discord.js');

/** discord.js v15: ephemeral yerine flags kullan */
const EPHEMERAL = MessageFlags.Ephemeral;

function ephemeralPayload(payload = {}) {
  return { ...payload, flags: (payload.flags ?? 0) | EPHEMERAL };
}

function isUnknownInteraction(err) {
  return err?.code === 10062 || err?.rawError?.code === 10062;
}

async function safeReply(interaction, payload) {
  try {
    if (interaction.replied) return interaction.followUp(payload);
    if (interaction.deferred) return interaction.editReply(payload);
    return interaction.reply(payload);
  } catch (err) {
    if (!isUnknownInteraction(err)) throw err;
  }
}

module.exports = { EPHEMERAL, ephemeralPayload, isUnknownInteraction, safeReply };
