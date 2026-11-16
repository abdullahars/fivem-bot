const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

const CoinBalance = createModel(MODELS.coinBalance);
const CoinShopItem = createModel(MODELS.coinShopItem);
const CoinPurchase = createModel(MODELS.coinPurchase);

module.exports = { CoinBalance, CoinShopItem, CoinPurchase };
