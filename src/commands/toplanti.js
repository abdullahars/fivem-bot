const { isUstYonetim } = require('../utils/permissions');
const { ephemeralPayload } = require('../utils/interaction');
const TOP = require('../constants/toplanti');
const {
  createMeeting,
  listMeetings,
  cancelMeeting,
  takeAttendance,
} = require('../services/toplantiService');
const { finishMeeting } = require('../services/meetingAttendanceService');
const COMMANDS = require('../constants/commands');

async function execute(interaction) {
  if (!isUstYonetim(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: TOP.noPermission }));
  }

  const sub = interaction.options.getSubcommand();

  if (sub === COMMANDS.toplanti.sub.olustur.name) {
    return createMeeting(interaction);
  }
  if (sub === COMMANDS.toplanti.sub.liste.name) {
    return listMeetings(interaction);
  }
  if (sub === COMMANDS.toplanti.sub.sil.name) {
    return cancelMeeting(interaction);
  }
  if (sub === COMMANDS.toplanti.sub.yoklama.name) {
    return takeAttendance(interaction);
  }
  if (sub === COMMANDS.toplanti.sub.bittir.name) {
    return finishMeeting(interaction);
  }
}

module.exports = { execute };
