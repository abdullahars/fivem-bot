const { ApplicationCommandOptionType } = require('discord.js');
const { getIds } = require('../config/loadConfig');
const { sendLogEmbed } = require('../utils/logChannel');
const { baseEmbed } = require('../utils/embedBuilder');
const CMD_LOG = require('../constants/commandLog');

function formatCommandPath(interaction) {
  if (interaction.isUserContextMenuCommand()) {
    return interaction.commandName;
  }

  if (!interaction.isChatInputCommand()) {
    return interaction.commandName || '—';
  }

  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand(false);

  if (group && sub) return `/${interaction.commandName} ${group} ${sub}`;
  if (sub) return `/${interaction.commandName} ${sub}`;
  return `/${interaction.commandName}`;
}

function formatOptionValue(opt) {
  if (opt.user) return `${opt.user.tag} (${opt.user.id})`;
  if (opt.member?.user) return `${opt.member.user.tag} (${opt.member.id})`;
  if (opt.channel) {
    const label = opt.channel.toString?.() || `#${opt.channel.name || opt.channel.id}`;
    return `${label} (${opt.channel.id})`;
  }
  if (opt.role) return `@${opt.role.name} (${opt.role.id})`;
  if (opt.attachment) return opt.attachment.name || opt.attachment.id;
  if (opt.value !== undefined && opt.value !== null) return String(opt.value);
  return '—';
}

function summarizeOptions(interaction) {
  if (interaction.isUserContextMenuCommand()) {
    const target = interaction.targetUser;
    return target ? `Hedef: ${target.tag} (${target.id})` : '—';
  }

  if (!interaction.isChatInputCommand()) return '—';

  const lines = [];
  for (const opt of interaction.options.data) {
    if (
      opt.type === ApplicationCommandOptionType.Subcommand ||
      opt.type === ApplicationCommandOptionType.SubcommandGroup
    ) {
      continue;
    }
    const value = formatOptionValue(opt);
    const safeValue = value.length > 200 ? `${value.slice(0, 197)}...` : value;
    lines.push(`• **${opt.name}:** ${safeValue}`);
  }

  return lines.length ? lines.join('\n') : '—';
}

function resolveChannelLabel(interaction) {
  const channel = interaction.channel;
  if (!channel) return '—';
  if (channel.isDMBased?.()) return 'DM';
  return `${channel} (\`${channel.name}\`)`;
}

async function logCommandUsage(interaction) {
  const ids = getIds();
  if (!ids.komutLogChannelId || !interaction.guild) return;

  const commandPath = formatCommandPath(interaction);
  const typeLabel = interaction.isUserContextMenuCommand()
    ? CMD_LOG.types.context
    : CMD_LOG.types.slash;

  const embed = baseEmbed()
    .setTitle(CMD_LOG.title)
    .addFields(
      {
        name: CMD_LOG.fields.command,
        value: `\`${commandPath}\` (${typeLabel})`,
        inline: false,
      },
      {
        name: CMD_LOG.fields.user,
        value: `${interaction.user} (\`${interaction.user.tag}\`)`,
        inline: true,
      },
      {
        name: CMD_LOG.fields.channel,
        value: resolveChannelLabel(interaction),
        inline: true,
      },
      {
        name: CMD_LOG.fields.options,
        value: summarizeOptions(interaction).slice(0, 1024),
        inline: false,
      }
    )
    .setFooter({ text: `ID: ${interaction.user.id}` });

  await sendLogEmbed(interaction.guild, ids.komutLogChannelId, embed);
}

module.exports = {
  logCommandUsage,
  formatCommandPath,
};
