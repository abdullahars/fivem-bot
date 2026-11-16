const { Events, ChannelType, PermissionFlagsBits } = require('discord.js');
const {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
} = require('@discordjs/voice');
const { getVoicePresenceSettings } = require('../config/loadConfig');

const RETRY_MS = 5000;
const MAX_ATTEMPTS = 5;

function resolveTargetGuild(client) {
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (guildId) {
    return client.guilds.cache.get(guildId) || null;
  }
  return client.guilds.cache.first() || null;
}

function logPermissionHints(me, channel) {
  const perms = channel.permissionsFor(me);
  if (!perms) {
    console.warn('[Ses] Kanal izinleri okunamadı.');
    return;
  }
  const missing = [];
  if (!perms.has(PermissionFlagsBits.ViewChannel)) missing.push('Kanalı Görüntüle');
  if (!perms.has(PermissionFlagsBits.Connect)) missing.push('Bağlan');
  if (missing.length) {
    console.warn(`[Ses] Eksik izinler (#${channel.name}): ${missing.join(', ')}`);
  }
}

function destroyVoiceConnection(guildId) {
  const existing = getVoiceConnection(guildId);
  if (existing) {
    try {
      existing.destroy();
    } catch {
      /* zaten kapalı */
    }
  }
}

async function joinConfiguredVoice(guild, attempt = 1) {
  const settings = getVoicePresenceSettings();
  if (!settings.enabled || !settings.channelId) {
    console.log('[Ses] Yapılandırma kapalı veya channelId boş — sese girilmiyor.');
    return;
  }

  try {
    const me = guild.members.me || (await guild.members.fetchMe());
    const channel = await guild.channels.fetch(settings.channelId, { force: true }).catch(() => null);

    if (!channel) {
      console.warn(
        `[Ses] Kanal bulunamadı (ID: ${settings.channelId}, sunucu: ${guild.name}).`
      );
      return scheduleRetry(guild, attempt);
    }

    if (
      channel.type !== ChannelType.GuildVoice &&
      channel.type !== ChannelType.GuildStageVoice
    ) {
      console.warn(`[Ses] Bu kanal ses/stage değil (tip: ${channel.type}).`);
      return;
    }

    const existing = getVoiceConnection(guild.id);
    if (existing?.joinConfig?.channelId === channel.id) {
      if (me.voice?.channelId === channel.id) {
        console.log('[Ses] Bot zaten yapılandırılan kanalda.');
        return;
      }
    }

    destroyVoiceConnection(guild.id);
    logPermissionHints(me, channel);

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: settings.selfDeaf,
      selfMute: settings.selfMute,
    });

    connection.on(VoiceConnectionStatus.Ready, () => {
      console.log(`[Ses] Bot sese bağlandı: #${channel.name} (${channel.id})`);
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
      console.warn('[Ses] Ses bağlantısı koptu.');
    });

    connection.on('error', (err) => {
      console.warn('[Ses] Ses bağlantı hatası:', err.message || err);
    });

    if (channel.type === ChannelType.GuildStageVoice) {
      connection.once(VoiceConnectionStatus.Ready, async () => {
        try {
          await me.voice.setSuppressed(false);
        } catch (err) {
          console.warn('[Ses] Stage konuşmacı modu (isteğe bağlı):', err.message || err);
        }
      });
    }
  } catch (err) {
    console.warn(
      `[Ses] Sese bağlanılamadı (deneme ${attempt}/${MAX_ATTEMPTS}):`,
      err.message || err
    );
    if (err.code) console.warn(`[Ses] Discord kodu: ${err.code}`);
    scheduleRetry(guild, attempt);
  }
}

function scheduleRetry(guild, attempt) {
  if (attempt >= MAX_ATTEMPTS) {
    console.warn('[Ses] Maksimum deneme sayısına ulaşıldı. Bot çalışmaya devam ediyor.');
    return;
  }
  setTimeout(() => {
    joinConfiguredVoice(guild, attempt + 1).catch((err) => {
      console.warn('[Ses] Yeniden deneme hatası:', err.message || err);
    });
  }, RETRY_MS);
}

function startVoicePresence(client) {
  const guild = resolveTargetGuild(client);
  if (!guild) {
    console.warn('[Ses] Sunucu bulunamadı — DISCORD_GUILD_ID kontrol edin.');
    return;
  }
  joinConfiguredVoice(guild, 1).catch((err) => {
    console.warn('[Ses] Başlangıç bağlantısı:', err.message || err);
  });
}

function registerVoicePresence(client) {
  client.on(Events.ChannelDelete, (channel) => {
    const settings = getVoicePresenceSettings();
    if (!settings.channelId || channel.id !== settings.channelId) return;

    destroyVoiceConnection(channel.guild?.id);
    console.warn(`[Ses] Ses kanalı silindi (${channel.id}). Bot çalışmaya devam ediyor.`);
  });

  client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    if (newState.member?.id !== newState.client.user?.id) return;

    const settings = getVoicePresenceSettings();
    if (!settings.enabled || !settings.channelId) return;

    if (oldState.channelId === settings.channelId && !newState.channelId) {
      destroyVoiceConnection(newState.guild.id);
      console.warn('[Ses] Bot kanaldan düştü; yeniden bağlanılıyor...');
      setTimeout(() => joinConfiguredVoice(newState.guild, 1).catch(() => {}), RETRY_MS);
    }
  });
}

module.exports = { registerVoicePresence, startVoicePresence, joinConfiguredVoice };
