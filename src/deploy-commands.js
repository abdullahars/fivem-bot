require('dotenv').config();
const COMMANDS = require('./constants/commands');
const { deployCommands } = require('./utils/deployCommands');

async function main() {
  const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

  if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
    console.error('❌ .env dosyasında DISCORD_TOKEN ve DISCORD_CLIENT_ID gerekli.');
    process.exit(1);
  }

  if (!DISCORD_GUILD_ID) {
    console.warn(
      '⚠️  DISCORD_GUILD_ID tanımlı değil → global komut kaydı (1 saate kadar gecikebilir).'
    );
    console.warn('    Anında görmek için .env dosyasına sunucu ID ekleyin.\n');
  }

  try {
    const result = await deployCommands({
      token: DISCORD_TOKEN,
      clientId: DISCORD_CLIENT_ID,
      guildId: DISCORD_GUILD_ID || undefined,
    });

    const names = [
      COMMANDS.kurulum.name,
      COMMANDS.stat.name,
      COMMANDS.topStat.name,
      COMMANDS.whitelist.name,
      COMMANDS.kayitsiz.name,
      COMMANDS.topluSustur.name,
      COMMANDS.topluSusturAc.name,
    ].join(', ');

    if (result.clearedGlobal) {
      console.log('🧹 Eski global komutlar temizlendi.');
    }
    if (result.scope === 'guild') {
      console.log(`✅ ${result.count} komut sunucuya kaydedildi (anında görünür).`);
      console.log(`   Sunucu ID: ${result.guildId}`);
    } else {
      console.log(`✅ ${result.count} komut global kaydedildi.`);
    }
    console.log(`   Komutlar: /${names.replace(/, /g, ', /')}`);
  } catch (err) {
    console.error('❌ Komut kaydı başarısız:', err.message || err);
    process.exit(1);
  }
}

main();
