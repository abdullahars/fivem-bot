const {
  ContainerBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require('discord.js');
const { getConfig, getOwnerIds, getCoinSettings } = require('../config/loadConfig');
const { parseEmbedColor } = require('../utils/colors');
const { ephemeralPayload } = require('../utils/interaction');
const COIN = require('../constants/coin');
const {
  listShopItems,
  getShopItem,
  createShopItem,
  updateShopItem,
  deleteShopItem,
  setRate,
  resetAllCoins,
  buildRatesList,
  formatCoin,
  adminAddCoins,
  adminRemoveCoins,
} = require('./coinService');

function isOwner(interaction) {
  const owners = getOwnerIds();
  if (owners.length > 0) return owners.includes(interaction.user.id);
  return interaction.guild?.ownerId === interaction.user.id;
}

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

function homeButton() {
  return new ButtonBuilder()
    .setCustomId(COIN.customId.home)
    .setLabel(COIN.messages.dzBack)
    .setStyle(ButtonStyle.Secondary);
}

// ---- Ana menü ----

function buildHomePayload() {
  const enabledNote = getCoinSettings().enabled ? '' : `\n\n${COIN.messages.disabled}`;
  const c = container();
  c.addTextDisplayComponents((td) =>
    td.setContent(`## ${COIN.messages.dzTitle}\n\n${COIN.messages.dzDesc}${enabledNote}`)
  );
  c.addSeparatorComponents((sep) => sep);
  c.addActionRowComponents((row) =>
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(COIN.customId.menuRates)
        .setLabel(COIN.messages.dzMenuRates)
        .setEmoji('⚙️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(COIN.customId.menuItems)
        .setLabel(COIN.messages.dzMenuItems)
        .setEmoji('🛒')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(COIN.customId.menuReset)
        .setLabel(COIN.messages.dzMenuReset)
        .setEmoji('🚨')
        .setStyle(ButtonStyle.Danger)
    )
  );
  c.addActionRowComponents((row) =>
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(COIN.customId.menuAddCoin)
        .setLabel(COIN.messages.dzMenuAddCoin)
        .setEmoji('➕')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(COIN.customId.menuRemoveCoin)
        .setLabel(COIN.messages.dzMenuRemoveCoin)
        .setEmoji('➖')
        .setStyle(ButtonStyle.Secondary)
    )
  );
  addFooter(c);
  return payload(c);
}

// ---- Coin Ekle / Sil (kullanıcı seçimi) ----

function buildCoinUserSelectPayload(mode) {
  const isAdd = mode === 'add';
  const c = container();
  c.addTextDisplayComponents((td) =>
    td.setContent(
      `## ${isAdd ? COIN.messages.dzAddCoinTitle : COIN.messages.dzRemoveCoinTitle}\n\n` +
        (isAdd ? COIN.messages.dzAddCoinDesc : COIN.messages.dzRemoveCoinDesc)
    )
  );
  c.addSeparatorComponents((sep) => sep);
  c.addActionRowComponents((row) =>
    row.addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(isAdd ? COIN.customId.addCoinUser : COIN.customId.removeCoinUser)
        .setPlaceholder(COIN.messages.dzCoinUserPlaceholder)
        .setMinValues(1)
        .setMaxValues(1)
    )
  );
  c.addActionRowComponents((row) => row.addComponents(homeButton()));
  addFooter(c);
  return payload(c);
}

function buildCoinAmountModal(mode, userId) {
  const isAdd = mode === 'add';
  const input = new TextInputBuilder()
    .setCustomId('amount')
    .setLabel(COIN.messages.modalCoinAmount)
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const customId = isAdd
    ? `${COIN.customId.addCoinModal}${userId}`
    : `${COIN.customId.removeCoinModal}${userId}`;

  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(isAdd ? COIN.messages.modalAddCoinTitle : COIN.messages.modalRemoveCoinTitle)
    .addComponents(new ActionRowBuilder().addComponents(input));
}

// ---- Oranlar ----

function buildRatesPayload() {
  const c = container();
  c.addTextDisplayComponents((td) =>
    td.setContent(
      `## ${COIN.messages.dzRatesTitle}\n\n${COIN.messages.dzRatesDesc}\n\n${buildRatesList()}`
    )
  );
  c.addSeparatorComponents((sep) => sep);
  c.addActionRowComponents((row) =>
    row.addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('coindz:rateselect')
        .setPlaceholder('Düzenlenecek oranı seç…')
        .addOptions(
          Object.entries(COIN.rateKeys).map(([key, def]) => ({
            label: def.label,
            value: key,
          }))
        )
    )
  );
  c.addActionRowComponents((row) => row.addComponents(homeButton()));
  addFooter(c);
  return payload(c);
}

function buildRateModal(rateKey) {
  const def = COIN.rateKeys[rateKey];
  const settings = getCoinSettings();
  const input = new TextInputBuilder()
    .setCustomId('value')
    .setLabel(COIN.messages.modalRateLabel)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setValue(formatCoin(settings.rates[rateKey] || 0));

  return new ModalBuilder()
    .setCustomId(`${COIN.customId.rateModal}${rateKey}`)
    .setTitle(`${def.label} — ${COIN.messages.modalRateTitle}`)
    .addComponents(new ActionRowBuilder().addComponents(input));
}

// ---- Ürünler ----

async function buildItemsPayload(guildId) {
  const items = await listShopItems(guildId);
  const c = container();

  const body = items.length
    ? items
        .map(
          (it) =>
            `• **${it.name}** — ${formatCoin(it.cost)} ${COIN.emoji} ${
              it.active ? '🟢' : '🔴'
            } ${it.stock < 0 ? '(∞)' : `(stok: ${it.stock})`}`
        )
        .join('\n')
    : COIN.messages.dzItemsEmpty;

  c.addTextDisplayComponents((td) =>
    td.setContent(`## ${COIN.messages.dzItemsTitle}\n\n${body}`)
  );
  c.addSeparatorComponents((sep) => sep);

  if (items.length) {
    c.addActionRowComponents((row) =>
      row.addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(COIN.customId.itemSelect)
          .setPlaceholder(COIN.messages.dzItemSelectPlaceholder)
          .addOptions(
            items.slice(0, 25).map((it) => ({
              label: `${it.name} (${formatCoin(it.cost)})`.slice(0, 100),
              value: String(it._id),
              description: (it.description || '').slice(0, 100) || undefined,
            }))
          )
      )
    );
  }

  c.addActionRowComponents((row) =>
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(COIN.customId.itemAdd)
        .setLabel(COIN.messages.dzItemAddLabel)
        .setEmoji('➕')
        .setStyle(ButtonStyle.Success),
      homeButton()
    )
  );

  addFooter(c);
  return payload(c);
}

async function buildItemDetailPayload(itemId) {
  const item = await getShopItem(itemId);
  if (!item) return null;

  const c = container();
  c.addTextDisplayComponents((td) =>
    td.setContent(
      fmt(COIN.messages.dzItemDetail, {
        name: item.name,
        cost: formatCoin(item.cost),
        stock: item.stock < 0 ? 'Sınırsız' : item.stock,
        status: item.active ? '🟢 Satışta' : '🔴 Kapalı',
        desc: item.description || '—',
      })
    )
  );
  c.addSeparatorComponents((sep) => sep);
  c.addActionRowComponents((row) =>
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${COIN.customId.itemEdit}${itemId}`)
        .setLabel(COIN.messages.dzItemEditLabel)
        .setEmoji('✏️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`${COIN.customId.itemToggle}${itemId}`)
        .setLabel(item.active ? COIN.messages.dzItemToggleOff : COIN.messages.dzItemToggleOn)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${COIN.customId.itemDelete}${itemId}`)
        .setLabel(COIN.messages.dzItemDeleteLabel)
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger)
    )
  );
  c.addActionRowComponents((row) =>
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(COIN.customId.menuItems)
        .setLabel(COIN.messages.back)
        .setStyle(ButtonStyle.Secondary)
    )
  );
  addFooter(c);
  return payload(c);
}

function buildItemModal({ itemId, item } = {}) {
  const nameInput = new TextInputBuilder()
    .setCustomId('name')
    .setLabel(COIN.messages.modalItemName)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(80);
  const descInput = new TextInputBuilder()
    .setCustomId('description')
    .setLabel(COIN.messages.modalItemDesc)
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(200);
  const costInput = new TextInputBuilder()
    .setCustomId('cost')
    .setLabel(COIN.messages.modalItemCost)
    .setStyle(TextInputStyle.Short)
    .setRequired(true);
  const stockInput = new TextInputBuilder()
    .setCustomId('stock')
    .setLabel(COIN.messages.modalItemStock)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setValue('-1');

  if (item) {
    nameInput.setValue(item.name || '');
    descInput.setValue(item.description || '');
    costInput.setValue(formatCoin(item.cost || 0));
    stockInput.setValue(String(item.stock ?? -1));
  }

  const customId = itemId
    ? `${COIN.customId.itemEditModal}${itemId}`
    : COIN.customId.itemAddModal;

  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(COIN.messages.modalItemTitle)
    .addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(descInput),
      new ActionRowBuilder().addComponents(costInput),
      new ActionRowBuilder().addComponents(stockInput)
    );
}

// ---- Sıfırlama ----

function buildResetPayload(step) {
  const c = container();
  if (step === 1) {
    c.addTextDisplayComponents((td) =>
      td.setContent(`## ${COIN.messages.dzResetTitle}\n\n${COIN.messages.dzResetConfirm1}`)
    );
    c.addSeparatorComponents((sep) => sep);
    c.addActionRowComponents((row) =>
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(COIN.customId.resetConfirm2)
          .setLabel('Devam Et (1/2)')
          .setStyle(ButtonStyle.Danger),
        homeButton()
      )
    );
  } else {
    c.addTextDisplayComponents((td) =>
      td.setContent(`## ${COIN.messages.dzResetTitle}\n\n${COIN.messages.dzResetConfirm2}`)
    );
    c.addSeparatorComponents((sep) => sep);
    c.addActionRowComponents((row) =>
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(COIN.customId.resetExec)
          .setLabel('SIFIRLA (2/2)')
          .setEmoji('🚨')
          .setStyle(ButtonStyle.Danger),
        homeButton()
      )
    );
  }
  addFooter(c);
  return payload(c);
}

function buildNoticePayload(text) {
  const c = container();
  c.addTextDisplayComponents((td) => td.setContent(text));
  c.addActionRowComponents((row) => row.addComponents(homeButton()));
  addFooter(c);
  return payload(c);
}

// ---- Komut girişi ----

async function openCoinManagePanel(interaction) {
  if (!isOwner(interaction)) {
    return interaction.reply(ephemeralPayload({ content: COIN.messages.noPermissionOwner }));
  }
  return interaction.reply(buildHomePayload());
}

// ---- Etkileşim yönlendirme ----

function isCoinManageInteraction(customId) {
  return typeof customId === 'string' && customId.startsWith('coindz:');
}

async function handleCoinManageInteraction(interaction) {
  if (!isOwner(interaction)) {
    return interaction.reply(ephemeralPayload({ content: COIN.messages.noPermissionOwner }));
  }

  const id = interaction.customId;
  const guildId = interaction.guild.id;

  // ---- Modal submit ----
  if (interaction.isModalSubmit()) {
    // Oran düzenle
    if (id.startsWith(COIN.customId.rateModal)) {
      const rateKey = id.slice(COIN.customId.rateModal.length);
      const raw = interaction.fields.getTextInputValue('value').trim().replace(',', '.');
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0) {
        return interaction.reply(ephemeralPayload({ content: COIN.messages.dzInvalidNumber }));
      }
      setRate(rateKey, value);
      await interaction.deferUpdate();
      return interaction.editReply(buildRatesPayload());
    }

    // Ürün ekle
    if (id === COIN.customId.itemAddModal) {
      const parsed = parseItemModal(interaction);
      if (parsed.error) {
        return interaction.reply(ephemeralPayload({ content: parsed.error }));
      }
      await createShopItem(guildId, { ...parsed, createdById: interaction.user.id });
      await interaction.deferUpdate();
      return interaction.editReply(await buildItemsPayload(guildId));
    }

    // Ürün düzenle
    if (id.startsWith(COIN.customId.itemEditModal)) {
      const itemId = id.slice(COIN.customId.itemEditModal.length);
      const parsed = parseItemModal(interaction);
      if (parsed.error) {
        return interaction.reply(ephemeralPayload({ content: parsed.error }));
      }
      await updateShopItem(itemId, parsed);
      await interaction.deferUpdate();
      const detail = await buildItemDetailPayload(itemId);
      return interaction.editReply(detail || (await buildItemsPayload(guildId)));
    }

    // Coin ekle
    if (id.startsWith(COIN.customId.addCoinModal)) {
      const userId = id.slice(COIN.customId.addCoinModal.length);
      const amount = parseAmount(interaction);
      if (amount == null) {
        return interaction.reply(ephemeralPayload({ content: COIN.messages.dzInvalidNumber }));
      }
      const res = await adminAddCoins(guildId, userId, amount, interaction.user.id);
      await interaction.deferUpdate();
      return interaction.editReply(
        buildNoticePayload(
          fmt(COIN.messages.dzCoinAdded, {
            user: `<@${userId}>`,
            amount: formatCoin(res?.amount || 0),
            balance: formatCoin(res?.balance || 0),
          })
        )
      );
    }

    // Coin sil
    if (id.startsWith(COIN.customId.removeCoinModal)) {
      const userId = id.slice(COIN.customId.removeCoinModal.length);
      const amount = parseAmount(interaction);
      if (amount == null) {
        return interaction.reply(ephemeralPayload({ content: COIN.messages.dzInvalidNumber }));
      }
      const res = await adminRemoveCoins(guildId, userId, amount, interaction.user.id);
      await interaction.deferUpdate();
      return interaction.editReply(
        buildNoticePayload(
          fmt(COIN.messages.dzCoinRemoved, {
            user: `<@${userId}>`,
            amount: formatCoin(res?.amount || 0),
            balance: formatCoin(res?.balance || 0),
          })
        )
      );
    }
    return;
  }

  // ---- Modal açan butonlar (deferUpdate ÖNCESİ showModal) ----
  if (interaction.isButton()) {
    if (id.startsWith(COIN.customId.itemEdit)) {
      const itemId = id.slice(COIN.customId.itemEdit.length);
      const item = await getShopItem(itemId);
      if (!item) return interaction.reply(ephemeralPayload({ content: 'Ürün bulunamadı.' }));
      return interaction.showModal(buildItemModal({ itemId, item }));
    }
    if (id === COIN.customId.itemAdd) {
      return interaction.showModal(buildItemModal());
    }
  }

  // ---- Oran seçimi ----
  if (interaction.isStringSelectMenu() && id === 'coindz:rateselect') {
    const rateKey = interaction.values[0];
    return interaction.showModal(buildRateModal(rateKey));
  }

  // ---- Ürün seçimi ----
  if (interaction.isStringSelectMenu() && id === COIN.customId.itemSelect) {
    const itemId = interaction.values[0];
    await interaction.deferUpdate();
    const detail = await buildItemDetailPayload(itemId);
    return interaction.editReply(detail || (await buildItemsPayload(guildId)));
  }

  // ---- Coin ekle/sil kullanıcı seçimi → miktar modalı ----
  if (interaction.isUserSelectMenu() && id === COIN.customId.addCoinUser) {
    return interaction.showModal(buildCoinAmountModal('add', interaction.values[0]));
  }
  if (interaction.isUserSelectMenu() && id === COIN.customId.removeCoinUser) {
    return interaction.showModal(buildCoinAmountModal('remove', interaction.values[0]));
  }

  // ---- Butonlar ----
  if (!interaction.isButton()) return;

  if (id === COIN.customId.home) {
    await interaction.deferUpdate();
    return interaction.editReply(buildHomePayload());
  }
  if (id === COIN.customId.menuRates) {
    await interaction.deferUpdate();
    return interaction.editReply(buildRatesPayload());
  }
  if (id === COIN.customId.menuItems) {
    await interaction.deferUpdate();
    return interaction.editReply(await buildItemsPayload(guildId));
  }
  if (id === COIN.customId.menuReset) {
    await interaction.deferUpdate();
    return interaction.editReply(buildResetPayload(1));
  }
  if (id === COIN.customId.menuAddCoin) {
    await interaction.deferUpdate();
    return interaction.editReply(buildCoinUserSelectPayload('add'));
  }
  if (id === COIN.customId.menuRemoveCoin) {
    await interaction.deferUpdate();
    return interaction.editReply(buildCoinUserSelectPayload('remove'));
  }
  if (id === COIN.customId.resetConfirm2) {
    await interaction.deferUpdate();
    return interaction.editReply(buildResetPayload(2));
  }
  if (id === COIN.customId.resetExec) {
    await interaction.deferUpdate();
    const count = await resetAllCoins(guildId);
    return interaction.editReply(
      buildNoticePayload(fmt(COIN.messages.dzResetDone, { count }))
    );
  }
  if (id.startsWith(COIN.customId.itemToggle)) {
    const itemId = id.slice(COIN.customId.itemToggle.length);
    const item = await getShopItem(itemId);
    if (item) await updateShopItem(itemId, { active: !item.active });
    await interaction.deferUpdate();
    const detail = await buildItemDetailPayload(itemId);
    return interaction.editReply(detail || (await buildItemsPayload(guildId)));
  }
  if (id.startsWith(COIN.customId.itemDeleteConfirm)) {
    const itemId = id.slice(COIN.customId.itemDeleteConfirm.length);
    await deleteShopItem(itemId);
    await interaction.deferUpdate();
    return interaction.editReply(await buildItemsPayload(guildId));
  }
  if (id.startsWith(COIN.customId.itemDelete)) {
    const itemId = id.slice(COIN.customId.itemDelete.length);
    const item = await getShopItem(itemId);
    await interaction.deferUpdate();
    const c = container();
    c.addTextDisplayComponents((td) =>
      td.setContent(fmt(COIN.messages.dzItemDeleteConfirm, { name: item?.name || '?' }))
    );
    c.addSeparatorComponents((sep) => sep);
    c.addActionRowComponents((row) =>
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`${COIN.customId.itemDeleteConfirm}${itemId}`)
          .setLabel(COIN.messages.dzItemDeleteLabel)
          .setEmoji('🗑️')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(COIN.customId.menuItems)
          .setLabel(COIN.messages.back)
          .setStyle(ButtonStyle.Secondary)
      )
    );
    addFooter(c);
    return interaction.editReply(payload(c));
  }
}

function parseAmount(interaction) {
  const raw = interaction.fields.getTextInputValue('amount').trim().replace(',', '.');
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function parseItemModal(interaction) {
  const name = interaction.fields.getTextInputValue('name').trim();
  const description = interaction.fields.getTextInputValue('description').trim();
  const costRaw = interaction.fields.getTextInputValue('cost').trim().replace(',', '.');
  const stockRaw = interaction.fields.getTextInputValue('stock').trim();

  const cost = Number(costRaw);
  if (!Number.isFinite(cost) || cost < 0) {
    return { error: COIN.messages.dzInvalidNumber };
  }
  let stock = Number(stockRaw);
  if (!Number.isFinite(stock)) stock = -1;
  stock = Math.trunc(stock);

  return { name, description, cost, stock };
}

module.exports = {
  openCoinManagePanel,
  handleCoinManageInteraction,
  isCoinManageInteraction,
};
