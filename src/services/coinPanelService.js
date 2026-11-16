const {
  ContainerBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require('discord.js');
const { getConfig, getCoinSettings } = require('../config/loadConfig');
const { parseEmbedColor } = require('../utils/colors');
const { ephemeralPayload } = require('../utils/interaction');
const { isStaff } = require('../utils/permissions');
const COIN = require('../constants/coin');
const {
  getBalance,
  listShopItems,
  buyShopItem,
  buildRatesList,
  formatCoin,
} = require('./coinService');

function fmt(str, vars) {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.split(`{${k}}`).join(String(v)),
    str
  );
}

function container() {
  return new ContainerBuilder().setAccentColor(
    parseEmbedColor(getConfig().bot.embedColor)
  );
}

function addFooter(c) {
  const footer = getConfig().bot.footer;
  if (footer?.trim()) {
    c.addSeparatorComponents((sep) => sep.setDivider(false));
    c.addTextDisplayComponents((td) => td.setContent(`-# ${footer}`));
  }
  return c;
}

function payload(c) {
  return ephemeralPayload({
    embeds: [],
    components: [c],
    flags: MessageFlags.IsComponentsV2,
  });
}

function stockText(item) {
  if (item.stock < 0) return COIN.messages.stockUnlimited;
  return fmt(COIN.messages.stockLeft, { n: item.stock });
}

// ---- /coin ----

async function openCoinBalance(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: COIN.messages.noPermissionStaff }));
  }
  if (!getCoinSettings().enabled) {
    return interaction.reply(ephemeralPayload({ content: COIN.messages.disabled }));
  }

  const bal = await getBalance(interaction.guild.id, interaction.user.id);
  const c = container();

  c.addTextDisplayComponents((td) =>
    td.setContent(
      `## ${COIN.messages.balanceTitle}\n\n` +
        fmt(COIN.messages.balanceLine, {
          user: interaction.user.toString(),
          balance: formatCoin(bal.balance),
        }) +
        `\n${fmt(COIN.messages.balanceDetail, {
          earned: formatCoin(bal.totalEarned),
          spent: formatCoin(bal.totalSpent),
        })}`
    )
  );
  c.addSeparatorComponents((sep) => sep);
  c.addTextDisplayComponents((td) =>
    td.setContent(fmt(COIN.messages.balanceRates, { rates: buildRatesList() }))
  );

  const { getOrCreateStats } = require('./statsService');
  const stats = await getOrCreateStats(interaction.guild.id, interaction.user.id);
  c.addSeparatorComponents((sep) => sep);
  c.addTextDisplayComponents((td) =>
    td.setContent(`🤝 **Ekip Referans:** ${stats.totalEkipReferans || 0}`)
  );

  addFooter(c);

  return interaction.reply(payload(c));
}

// ---- /coin-dukkani ----

async function buildShopPayload(guild, user) {
  const bal = await getBalance(guild.id, user.id);
  const items = await listShopItems(guild.id, { activeOnly: true });
  const c = container();

  if (!items.length) {
    c.addTextDisplayComponents((td) =>
      td.setContent(
        `## ${COIN.messages.shopTitle}\n\n${COIN.messages.shopEmpty}\n\n` +
          fmt(COIN.messages.shopYourBalance, { balance: formatCoin(bal.balance) })
      )
    );
    addFooter(c);
    return payload(c);
  }

  const lines = items.map((item) =>
    fmt(COIN.messages.shopItemLine, {
      name: item.name,
      cost: formatCoin(item.cost),
      stock: stockText(item),
      desc: item.description || '—',
    })
  );

  c.addTextDisplayComponents((td) =>
    td.setContent(
      `## ${COIN.messages.shopTitle}\n\n` +
        fmt(COIN.messages.shopYourBalance, { balance: formatCoin(bal.balance) }) +
        `\n\n${lines.join('\n\n')}`
    )
  );
  c.addSeparatorComponents((sep) => sep);

  const options = items.slice(0, 25).map((item) => ({
    label: `${item.name} — ${formatCoin(item.cost)} ${COIN.emoji}`.slice(0, 100),
    value: String(item._id),
    description: (item.description || '').slice(0, 100) || undefined,
  }));

  c.addActionRowComponents((row) =>
    row.addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(COIN.customId.shopBuy)
        .setPlaceholder(COIN.messages.shopBuyPlaceholder)
        .addOptions(options)
    )
  );

  addFooter(c);
  return payload(c);
}

async function openCoinShop(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: COIN.messages.noPermissionStaff }));
  }
  if (!getCoinSettings().enabled) {
    return interaction.reply(ephemeralPayload({ content: COIN.messages.disabled }));
  }
  const p = await buildShopPayload(interaction.guild, interaction.user);
  return interaction.reply(p);
}

async function handleShopBuy(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: COIN.messages.noPermissionStaff }));
  }
  const itemId = interaction.values[0];
  const result = await buyShopItem(interaction.guild, interaction.user, itemId);

  await interaction.deferUpdate();
  const refreshed = await buildShopPayload(interaction.guild, interaction.user);
  await interaction.editReply(refreshed);
  return interaction.followUp(ephemeralPayload({ content: result.message }));
}

function isCoinShopInteraction(customId) {
  return customId === COIN.customId.shopBuy;
}

module.exports = {
  openCoinBalance,
  openCoinShop,
  handleShopBuy,
  isCoinShopInteraction,
};
