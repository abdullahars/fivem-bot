const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

const Meeting = createModel(MODELS.meeting);

const _create = Meeting.create.bind(Meeting);
Meeting.create = async (data) =>
  _create({
    status: 'scheduled',
    ...data,
  });

module.exports = { Meeting };
