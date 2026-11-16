const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

const StaffStats = createModel(MODELS.staffStats);

const _create = StaffStats.create.bind(StaffStats);
StaffStats.create = async (data) =>
  _create({
    categoryCounts: { ic: 0, ooc: 0, ac: 0 },
    ...data,
  });

module.exports = { StaffStats };
