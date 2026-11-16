const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

const KayitPuan = createModel(MODELS.kayitPuan);

module.exports = { KayitPuan };
