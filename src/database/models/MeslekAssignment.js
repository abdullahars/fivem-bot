const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

module.exports = {
  MeslekAssignment: createModel(MODELS.meslekAssignment),
};
