const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  UserSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { Ekip } = require('../database/models/Ekip');
const { getIds, getEkipSettings } = require('../config/loadConfig');
const { baseEmbed } = require('../utils/embedBuilder');
const { formatTemplate } = require('../utils/format');
const { ephemeralPayload } = require('../utils/interaction');
const {
  isStaff,
  isBanhammer,
  canManageEkipAllowedRoles,
} = require('../utils/permissions');
const { recordEkipAc, recordEkipKapat, recordEkipReferans } = require('./statsService');
const EKIP = require('../constants/ekip');

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
}

function validateEkipName(name) {
  const trimmed = name?.trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 32) return null;
  if (!/^[\p{L}\p{N}\s._-]+$/u.test(trimmed)) return null;
  return trimmed;
}

function formatYardimLabel(yardimYapildi) {
  return yardimYapildi ? EKIP.yardim.done : EKIP.yardim.pending;
}

/** Tıklanabilir kanal mention (#slug-sinirsiz) */
function formatSinirsizChannel(_guild, ekip) {
  if (!ekip?.textChannelId) return '—';
  return `<#${ekip.textChannelId}>`;
}

function buildSinirsizChannelUrl(guildId, channelId) {
  if (!guildId || !channelId) return null;
  return `https://discord.com/channels/${guildId}/${channelId}`;
}

function getSinirsizChannelLabel(guild, ekip) {
  if (!ekip?.textChannelId) return 'kanal yok';
  const ch = guild?.channels?.cache?.get(ekip.textChannelId);
  return ch ? `#${ch.name}` : 'sınırsız kanal';
}

async function getRoleMemberCount(guild, roleId) {
  const role = guild.roles.cache.get(roleId) || (await guild.roles.fetch(roleId).catch(() => null));
  if (!role) return 0;
  return role.members?.size ?? 0;
}

async function applyBossRole(guild, userId) {
  const { bossRoleId } = getEkipSettings();
  if (!bossRoleId) return false;
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return false;
  await member.roles.add(bossRoleId).catch(() => {});
  return true;
}

async function removeBossRole(guild, userId) {
  const { bossRoleId } = getEkipSettings();
  if (!bossRoleId) return;
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;
  await member.roles.remove(bossRoleId).catch(() => {});
}

function buildEkipPanel(ekip) {
  const embed = baseEmbed()
    .setTitle(EKIP.panel.title)
    .setDescription(
      formatTemplate(EKIP.panel.description, {
        name: ekip.name,
        owner: `<@${ekip.ownerId}>`,
        boss: `<@${ekip.bossId || ekip.ownerId}>`,
        yardim: formatYardimLabel(ekip.yardimYapildi),
      })
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${EKIP.buttons.closePrefix}${ekip._id}`)
      .setLabel(EKIP.panel.closeLabel)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`${EKIP.buttons.addMemberPrefix}${ekip._id}`)
      .setLabel(EKIP.panel.addMemberLabel)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`${EKIP.buttons.banPrefix}${ekip._id}`)
      .setLabel(EKIP.panel.banLabel)
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

async function getEkipByChannel(channelId) {
  return Ekip.findOne({
    textChannelId: channelId,
    status: 'open',
  });
}

async function getEkipById(ekipId) {
  return Ekip.findById(ekipId);
}

async function findOpenEkipByName(guildId, rawName) {
  const name = validateEkipName(rawName);
  if (!name) return null;
  const slug = slugify(name);
  return Ekip.findOne({ guildId, slug, status: 'open' });
}

async function listOpenEkips(guildId) {
  return Ekip.find({ guildId, status: 'open' }).sort({ createdAt: -1 });
}

async function sendEkipLog(guild, embed) {
  const ids = getIds();
  if (!ids.ekipLogChannelId) return;
  const ch =
    guild.channels.cache.get(ids.ekipLogChannelId) ||
    (await guild.channels.fetch(ids.ekipLogChannelId).catch(() => null));
  if (ch?.isTextBased()) await ch.send({ embeds: [embed] }).catch(() => {});
}

async function createEkip(interaction, rawName, ownerUser) {
  const name = validateEkipName(rawName);
  if (!name) {
    return interaction.reply(ephemeralPayload({ content: EKIP.messages.invalidName }));
  }

  const slug = slugify(name);
  if (!slug) {
    return interaction.reply(ephemeralPayload({ content: EKIP.messages.invalidName }));
  }

  const existing = await Ekip.findOne({
    guildId: interaction.guild.id,
    slug,
    status: 'open',
  });
  if (existing) {
    return interaction.reply(ephemeralPayload({ content: EKIP.messages.nameExists }));
  }

  if (!ownerUser?.id) {
    return interaction.reply(ephemeralPayload({ content: EKIP.messages.ownerNotFound }));
  }

  const ownerMember = await interaction.guild.members
    .fetch(ownerUser.id)
    .catch(() => null);
  if (!ownerMember) {
    return interaction.reply(ephemeralPayload({ content: EKIP.messages.ownerNotFound }));
  }

  await interaction.deferReply(ephemeralPayload());

  const ids = getIds();
  const parentId = ids.ekipCategoryId || ids.categoryParentId;
  const guild = interaction.guild;

  // Ekip rolü oluştur
  const role = await guild.roles.create({
    name: name,
    color: 'Random',
    mentionable: true,
    reason: `Ekip oluşturuldu: ${name}`,
  });

  // Ekip sahibine rolü ver
  await ownerMember.roles.add(role).catch(() => {});

  // Kanal izinleri - sadece ekip rolü ve yetkililer görebilir/yazabilir
  const channelPermissions = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: ids.staffRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
      ],
    },
    {
      id: role.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
  ];

  // Sadece text kanalı oluştur (sınırsız)
  const textChannel = await guild.channels.create({
    name: `${slug}-sinirsiz`.slice(0, 100),
    type: ChannelType.GuildText,
    parent: parentId || undefined,
    permissionOverwrites: channelPermissions,
  });

  const bossApplied = await applyBossRole(guild, ownerMember.id);

  const ekip = await Ekip.create({
    guildId: guild.id,
    name,
    slug,
    ownerId: ownerMember.id,
    bossId: ownerMember.id,
    createdById: interaction.user.id,
    roleId: role.id,
    textChannelId: textChannel.id,
    memberIds: [],
    bannedIds: [],
    yardimYapildi: false,
    status: 'open',
  });

  const panel = buildEkipPanel(ekip);
  const msg = await textChannel.send(panel);
  ekip.panelMessageId = msg.id;
  await ekip.save();

  const { appendEkipAction } = require('./ekipActionLogService');
  await appendEkipAction(ekip, {
    byId: interaction.user.id,
    byTag: interaction.user.tag,
    text: EKIP.messages.islemCreate,
  });

  await recordEkipAc(guild.id, interaction.user.id);

  const logEmbed = baseEmbed()
    .setTitle(EKIP.log.openTitle)
    .addFields(
      { name: 'Ekip', value: name, inline: true },
      { name: 'Sahip', value: `<@${ownerMember.id}>`, inline: true },
      { name: 'Boss', value: `<@${ownerMember.id}>`, inline: true },
      { name: 'Açan', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Yardım', value: formatYardimLabel(false), inline: true },
      { name: 'Kanal', value: `<#${textChannel.id}>`, inline: false },
      { name: 'Rol', value: `<@&${role.id}>`, inline: false }
    );
  await sendEkipLog(guild, logEmbed);

  await sendReferansDm(ekip, ownerMember.user);

  let content = formatTemplate(EKIP.messages.created, {
    name,
    channel: `<#${textChannel.id}>`,
    role: `<@&${role.id}>`,
    boss: `<@${ownerMember.id}>`,
  });
  if (!bossApplied) content += `\n${EKIP.messages.bossRoleMissing}`;

  return interaction.editReply({ content });
}

// ---- Ekip Referans Sistemi ----

function buildReferansDmPayload(ekip, { disabled = false } = {}) {
  const embed = baseEmbed()
    .setTitle(EKIP.referans.dmTitle)
    .setDescription(formatTemplate(EKIP.referans.dmText, { name: ekip.name }));

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${EKIP.referans.openBtnPrefix}${ekip._id}`)
      .setLabel(EKIP.referans.btnLabel)
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled)
  );

  return { embeds: [embed], components: [row] };
}

/** Ekip sahibine referans belirtme DM'i gönderir; mesaj id'sini kaydeder. */
async function sendReferansDm(ekip, ownerUser) {
  if (!ownerUser) return;
  try {
    const dm = await ownerUser.createDM();
    const msg = await dm.send(buildReferansDmPayload(ekip));
    ekip.referansMessageId = msg.id;
    await ekip.save();
  } catch (_) {
    /* DM kapalı olabilir */
  }
}

function resolveGuild(guildId) {
  return global.client?.guilds?.cache?.get(guildId) || null;
}

/** DM'deki "Referans Belirt" butonu → modal açar. */
async function handleReferansButton(interaction) {
  const ekipId = interaction.customId.slice(EKIP.referans.openBtnPrefix.length);
  const ekip = await getEkipById(ekipId);

  if (!ekip || ekip.status !== 'open') {
    return interaction.reply({ content: EKIP.referans.ekipNotFound });
  }
  if (interaction.user.id !== ekip.ownerId) {
    return interaction.reply({ content: EKIP.referans.notOwner });
  }
  if (ekip.referansId) {
    return interaction.reply({
      content: formatTemplate(EKIP.referans.alreadySet, {
        ref: `<@${ekip.referansId}>`,
      }),
    });
  }

  const modal = new ModalBuilder()
    .setCustomId(`${EKIP.referans.modalPrefix}${ekip._id}`)
    .setTitle(EKIP.referans.modalTitle)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(EKIP.referans.inputId)
          .setLabel(EKIP.referans.inputLabel)
          .setPlaceholder(EKIP.referans.inputPlaceholder)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(40)
      )
    );

  return interaction.showModal(modal);
}

/** Referans modal submit → yetkiliyi doğrula, kaydet, logla. */
async function handleReferansModal(interaction) {
  const ekipId = interaction.customId.slice(EKIP.referans.modalPrefix.length);
  const ekip = await getEkipById(ekipId);

  if (!ekip || ekip.status !== 'open') {
    return interaction.reply({ content: EKIP.referans.ekipNotFound });
  }
  if (interaction.user.id !== ekip.ownerId) {
    return interaction.reply({ content: EKIP.referans.notOwner });
  }
  if (ekip.referansId) {
    return interaction.reply({
      content: formatTemplate(EKIP.referans.alreadySet, {
        ref: `<@${ekip.referansId}>`,
      }),
    });
  }

  const raw = interaction.fields.getTextInputValue(EKIP.referans.inputId) || '';
  const match = raw.match(/\d{15,25}/);
  const staffId = match?.[0];
  if (!staffId) {
    return interaction.reply({ content: EKIP.referans.invalidId });
  }
  if (staffId === ekip.ownerId || staffId === interaction.user.id) {
    return interaction.reply({ content: EKIP.referans.selfNotAllowed });
  }

  const guild = resolveGuild(ekip.guildId);
  const member = guild ? await guild.members.fetch(staffId).catch(() => null) : null;
  if (!member || !isStaff(member)) {
    return interaction.reply({ content: EKIP.referans.notStaff });
  }

  ekip.referansId = staffId;
  ekip.referansTag = member.user.tag;
  ekip.referansAt = new Date();
  await ekip.save();

  const { appendEkipAction } = require('./ekipActionLogService');
  await appendEkipAction(ekip, {
    byId: interaction.user.id,
    byTag: interaction.user.tag,
    text: formatTemplate(EKIP.messages.islemReferans, { user: `<@${staffId}>` }),
  });

  await recordEkipReferans(guild.id, staffId);

  const logEmbed = baseEmbed()
    .setTitle(EKIP.referans.logTitle)
    .setDescription(
      formatTemplate(EKIP.referans.logText, {
        ref: `<@${staffId}>`,
        name: ekip.name,
      })
    )
    .addFields(
      { name: 'Ekip', value: ekip.name, inline: true },
      { name: 'Referans Yetkili', value: `<@${staffId}>`, inline: true },
      { name: 'Ekip Sahibi', value: `<@${ekip.ownerId}>`, inline: true }
    );
  await sendEkipLog(guild, logEmbed);

  // DM butonunu pasifleştir
  try {
    if (ekip.referansMessageId && interaction.channel) {
      const msg = await interaction.channel.messages
        .fetch(ekip.referansMessageId)
        .catch(() => null);
      if (msg) {
        await msg.edit(buildReferansDmPayload(ekip, { disabled: true })).catch(() => {});
      }
    }
  } catch (_) {
    /* mesaj düzenlenemedi */
  }

  return interaction.reply({
    content: formatTemplate(EKIP.referans.success, { ref: `<@${staffId}>` }),
  });
}

function isReferansButton(customId) {
  return customId.startsWith(EKIP.referans.openBtnPrefix);
}

function isReferansModal(customId) {
  return customId.startsWith(EKIP.referans.modalPrefix);
}

async function finalizeEkipClose(guild, ekip, closedById) {
  const { clearMeslekForEkip } = require('./meslekService');

  const ch = guild.channels.cache.get(ekip.textChannelId);
  if (ch) await ch.delete().catch(() => {});

  const role = guild.roles.cache.get(ekip.roleId);
  if (role) await role.delete().catch(() => {});

  const bossId = ekip.bossId || ekip.ownerId;
  await removeBossRole(guild, bossId);
  await clearMeslekForEkip(guild.id, ekip._id);

  await Ekip.deleteOne({ _id: ekip._id });
  await recordEkipKapat(guild.id, closedById);

  const logEmbed = baseEmbed()
    .setTitle(EKIP.log.closeTitle)
    .addFields(
      { name: 'Ekip', value: ekip.name, inline: true },
      { name: 'Sahip', value: `<@${ekip.ownerId}>`, inline: true },
      { name: 'Boss', value: `<@${bossId}>`, inline: true },
      { name: 'Kapatan', value: `<@${closedById}>`, inline: true }
    );
  await sendEkipLog(guild, logEmbed);
}

async function closeEkip(interaction, ekip) {
  if (!canManageEkipAllowedRoles(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: EKIP.messages.noPermissionAllowed }));
  }

  await interaction.reply(ephemeralPayload({ content: '⏳ Ekip kapatılıyor...' }));

  await finalizeEkipClose(interaction.guild, ekip, interaction.user.id);

  try {
    await interaction.editReply({ content: EKIP.messages.closed });
  } catch {
    /* kanal silinmiş olabilir */
  }
}

async function showAddMemberMenu(interaction, ekip) {
  if (!isStaff(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: EKIP.messages.noPermissionStaff }));
  }

  const row = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId(`${EKIP.buttons.addSelectPrefix}${ekip._id}`)
      .setPlaceholder('Eklenecek üyeyi seçin')
      .setMinValues(1)
      .setMaxValues(1)
  );

  return interaction.reply({
    content: '👤 Ekibe eklenecek kullanıcıyı seçin:',
    components: [row],
    ephemeral: true,
  });
}

async function showBanMenu(interaction, ekip) {
  if (!isBanhammer(interaction.member)) {
    return interaction.reply(ephemeralPayload({ content: EKIP.messages.noPermission }));
  }

  const row = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId(`${EKIP.buttons.banSelectPrefix}${ekip._id}`)
      .setPlaceholder('Banlanacak kullanıcıyı seçin')
      .setMinValues(1)
      .setMaxValues(1)
  );

  return interaction.reply({
    content: '⛔ Ekipten banlanacak kullanıcıyı seçin:',
    components: [row],
    ephemeral: true,
  });
}

async function addMember(interaction, ekipId, userId) {
  const ekip = await getEkipById(ekipId);
  if (!ekip || ekip.status !== 'open') {
    return interaction.update({ content: EKIP.messages.notFound, components: [] });
  }

  if (ekip.bannedIds.includes(userId)) {
    return interaction.update({ content: EKIP.messages.isBanned, components: [] });
  }

  if (ekip.ownerId === userId || ekip.memberIds.includes(userId)) {
    return interaction.update({ content: EKIP.messages.alreadyMember, components: [] });
  }

  ekip.memberIds.push(userId);
  await ekip.save();

  const { appendEkipAction } = require('./ekipActionLogService');
  await appendEkipAction(ekip, {
    byId: interaction.user.id,
    byTag: interaction.user.tag,
    text: formatTemplate(EKIP.messages.islemMemberAdd, { user: `<@${userId}>` }),
  });

  // Kullanıcıya ekip rolünü ver
  const member = await interaction.guild.members.fetch(userId).catch(() => null);
  if (member) {
    const role = interaction.guild.roles.cache.get(ekip.roleId);
    if (role) {
      await member.roles.add(role).catch(() => {});
    }
  }

  return interaction.update({
    content: formatTemplate(EKIP.messages.memberAdded, { user: `<@${userId}>` }),
    components: [],
  });
}

async function banFromEkip(interaction, ekipId, userId) {
  const ekip = await getEkipById(ekipId);
  if (!ekip || ekip.status !== 'open') {
    return interaction.update({ content: EKIP.messages.notFound, components: [] });
  }

  if (ekip.ownerId === userId) {
    return interaction.update({ content: EKIP.messages.isOwner, components: [] });
  }

  if (!ekip.bannedIds.includes(userId)) {
    ekip.bannedIds.push(userId);
  }
  ekip.memberIds = ekip.memberIds.filter((id) => id !== userId);
  await ekip.save();

  const { appendEkipAction } = require('./ekipActionLogService');
  await appendEkipAction(ekip, {
    byId: interaction.user.id,
    byTag: interaction.user.tag,
    text: formatTemplate(EKIP.messages.islemMemberBan, { user: `<@${userId}>` }),
  });

  // Kullanıcıdan ekip rolünü al
  const member = await interaction.guild.members.fetch(userId).catch(() => null);
  if (member) {
    const role = interaction.guild.roles.cache.get(ekip.roleId);
    if (role) {
      await member.roles.remove(role).catch(() => {});
    }
    const { removeMeslekRolesFromMember } = require('./meslekService');
    await removeMeslekRolesFromMember(interaction.guild, ekip._id, member);
  }

  return interaction.update({
    content: formatTemplate(EKIP.messages.memberBanned, { user: `<@${userId}>` }),
    components: [],
  });
}

async function handleEkipButton(interaction) {
  const id = interaction.customId;
  let ekipId = '';

  if (id.startsWith(EKIP.buttons.closePrefix)) {
    ekipId = id.slice(EKIP.buttons.closePrefix.length);
    const ekip = await getEkipById(ekipId);
    if (!ekip) {
      return interaction.reply(ephemeralPayload({ content: EKIP.messages.notFound }));
    }
    return closeEkip(interaction, ekip);
  }

  if (id.startsWith(EKIP.buttons.addMemberPrefix)) {
    ekipId = id.slice(EKIP.buttons.addMemberPrefix.length);
    const ekip = await getEkipById(ekipId);
    if (!ekip) {
      return interaction.reply(ephemeralPayload({ content: EKIP.messages.notFound }));
    }
    return showAddMemberMenu(interaction, ekip);
  }

  if (id.startsWith(EKIP.buttons.banPrefix)) {
    ekipId = id.slice(EKIP.buttons.banPrefix.length);
    const ekip = await getEkipById(ekipId);
    if (!ekip) {
      return interaction.reply(ephemeralPayload({ content: EKIP.messages.notFound }));
    }
    return showBanMenu(interaction, ekip);
  }
}

module.exports = {
  createEkip,
  closeEkip,
  finalizeEkipClose,
  handleEkipButton,
  addMember,
  banFromEkip,
  getEkipByChannel,
  getEkipById,
  findOpenEkipByName,
  listOpenEkips,
  getRoleMemberCount,
  applyBossRole,
  removeBossRole,
  formatYardimLabel,
  formatSinirsizChannel,
  buildSinirsizChannelUrl,
  getSinirsizChannelLabel,
  buildEkipPanel,
  sendEkipLog,
  slugify,
  validateEkipName,
  buildReferansDmPayload,
  handleReferansButton,
  handleReferansModal,
  isReferansButton,
  isReferansModal,
};
