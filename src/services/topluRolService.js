const { PermissionFlagsBits } = require('discord.js');
const { ephemeralPayload } = require('../utils/interaction');
const { RoleManageLog } = require('../database/models/RoleManageLog');
const { getIds } = require('../config/loadConfig');
const { baseEmbed } = require('../utils/embedBuilder');
const { sendLogEmbed } = require('../utils/logChannel');
const { formatTemplate } = require('../utils/format');
const { getRoleBlockedMessage } = require('./blRolService');

function parseUserIds(text) {
  // <@123456789> veya <@!123456789> formatındaki mention'ları parse et
  const mentionRegex = /<@!?(\d{17,20})>/g;
  const ids = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    if (!ids.includes(match[1])) {
      ids.push(match[1]);
    }
  }
  
  return ids;
}

async function logTopluRol(guild, action, staff, successfulUsers, role) {
  // Veritabanına kaydet
  const logPromises = successfulUsers.map(user =>
    RoleManageLog.create({
      guildId: guild.id,
      action,
      staffId: staff.id,
      staffTag: staff.tag,
      targetId: user.id,
      targetTag: user.tag,
      roleId: role.id,
      roleName: role.name,
    })
  );
  await Promise.all(logPromises);

  // Log kanalına embed gönder
  const ids = getIds();
  const title = action === 'ver' ? '➕ Toplu Rol Verildi' : '➖ Toplu Rol Alındı';
  
  const userList = successfulUsers
    .slice(0, 20)
    .map(u => `• ${u.toString()}`)
    .join('\n');
  
  const remaining = successfulUsers.length > 20 ? `\n*...ve ${successfulUsers.length - 20} kişi daha*` : '';
  
  const embed = baseEmbed()
    .setTitle(title)
    .setDescription(
      `**Yetkili:** ${staff.toString()}\n**Rol:** ${role.toString()}\n**Toplam:** ${successfulUsers.length} kişi\n\n**Kullanıcılar:**\n${userList}${remaining}`
    )
    .setTimestamp();

  await sendLogEmbed(guild, ids.roleLogChannelId, embed);
}

const BL_ROL_STRICT = { exemptUstYonetim: false };

async function topluRolVer(interaction, role) {
  await interaction.deferReply(ephemeralPayload());

  const guild = interaction.guild;
  const me = guild.members.me;

  const blockedMsg = await getRoleBlockedMessage(
    guild.id,
    role,
    interaction.member,
    BL_ROL_STRICT
  );
  if (blockedMsg) {
    return interaction.editReply({ content: blockedMsg });
  }

  // Bot izin kontrolü
  if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return interaction.editReply({ content: '❌ Botun rol yönetme yetkisi yok.' });
  }

  // Rol pozisyon kontrolü
  if (role.position >= me.roles.highest.position) {
    return interaction.editReply({ content: '❌ Bu rol botun en yüksek rolünden daha üstte.' });
  }

  // @everyone kontrolü
  if (role.id === guild.id) {
    return interaction.editReply({ content: '❌ @everyone rolü verilemez.' });
  }

  // Kullanıcı mention'larını parse et
  const kullanicilarText = interaction.options.getString('kullanicilar', true);
  const userIds = parseUserIds(kullanicilarText);

  if (userIds.length === 0) {
    return interaction.editReply({ content: '❌ En az 1 kullanıcı etiketlemelisiniz.' });
  }

  let success = 0;
  let failed = 0;
  const errors = [];
  const successfulUsers = [];

  // Kullanıcılara rol ver
  for (const userId of userIds) {
    try {
      const user = await guild.client.users.fetch(userId).catch(() => null);
      const member = await guild.members.fetch(userId).catch(() => null);
      
      if (!member) {
        errors.push(`<@${userId}> - Sunucuda değil`);
        failed++;
        continue;
      }

      if (member.roles.cache.has(role.id)) {
        errors.push(`${user ? user.tag : userId} - Zaten var`);
        failed++;
        continue;
      }

      await member.roles.add(role, `Toplu rol verme - ${interaction.user.tag}`);
      success++;
      if (user) {
        successfulUsers.push(user);
      }
    } catch (error) {
      errors.push(`<@${userId}> - Hata`);
      failed++;
    }
  }

  // Log gönder
  if (successfulUsers.length > 0) {
    await logTopluRol(guild, 'ver', interaction.user, successfulUsers, role);
  }

  let response = `✅ **${role.name}** rolü verildi.\n\n**Başarılı:** ${success}\n**Başarısız:** ${failed}`;
  
  if (errors.length > 0 && errors.length <= 10) {
    response += `\n\n**Hatalar:**\n${errors.join('\n')}`;
  } else if (errors.length > 10) {
    response += `\n\n**Hatalar:** ${errors.length} hata (çok fazla gösterilemiyor)`;
  }

  return interaction.editReply({ content: response });
}

async function topluRolAl(interaction, role) {
  await interaction.deferReply(ephemeralPayload());

  const guild = interaction.guild;
  const me = guild.members.me;

  const blockedMsg = await getRoleBlockedMessage(
    guild.id,
    role,
    interaction.member,
    BL_ROL_STRICT
  );
  if (blockedMsg) {
    return interaction.editReply({ content: blockedMsg });
  }

  // Bot izin kontrolü
  if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return interaction.editReply({ content: '❌ Botun rol yönetme yetkisi yok.' });
  }

  // Rol pozisyon kontrolü
  if (role.position >= me.roles.highest.position) {
    return interaction.editReply({ content: '❌ Bu rol botun en yüksek rolünden daha üstte.' });
  }

  // @everyone kontrolü
  if (role.id === guild.id) {
    return interaction.editReply({ content: '❌ @everyone rolü alınamaz.' });
  }

  // Kullanıcı mention'larını parse et
  const kullanicilarText = interaction.options.getString('kullanicilar', true);
  const userIds = parseUserIds(kullanicilarText);

  if (userIds.length === 0) {
    return interaction.editReply({ content: '❌ En az 1 kullanıcı etiketlemelisiniz.' });
  }

  let success = 0;
  let failed = 0;
  const errors = [];
  const successfulUsers = [];

  // Kullanıcılardan rol al
  for (const userId of userIds) {
    try {
      const user = await guild.client.users.fetch(userId).catch(() => null);
      const member = await guild.members.fetch(userId).catch(() => null);
      
      if (!member) {
        errors.push(`<@${userId}> - Sunucuda değil`);
        failed++;
        continue;
      }

      if (!member.roles.cache.has(role.id)) {
        errors.push(`${user ? user.tag : userId} - Zaten yok`);
        failed++;
        continue;
      }

      await member.roles.remove(role, `Toplu rol alma - ${interaction.user.tag}`);
      success++;
      if (user) {
        successfulUsers.push(user);
      }
    } catch (error) {
      errors.push(`<@${userId}> - Hata`);
      failed++;
    }
  }

  // Log gönder
  if (successfulUsers.length > 0) {
    await logTopluRol(guild, 'al', interaction.user, successfulUsers, role);
  }

  let response = `✅ **${role.name}** rolü alındı.\n\n**Başarılı:** ${success}\n**Başarısız:** ${failed}`;
  
  if (errors.length > 0 && errors.length <= 10) {
    response += `\n\n**Hatalar:**\n${errors.join('\n')}`;
  } else if (errors.length > 10) {
    response += `\n\n**Hatalar:** ${errors.length} hata (çok fazla gösterilemiyor)`;
  }

  return interaction.editReply({ content: response });
}

module.exports = { topluRolVer, topluRolAl };
