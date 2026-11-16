const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

const MeetingVoiceSession = createModel(MODELS.meetingVoiceSession);

module.exports = { MeetingVoiceSession };
