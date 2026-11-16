function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS counters (
      id TEXT PRIMARY KEY,
      seq INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number INTEGER NOT NULL,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      opener_id TEXT NOT NULL,
      type_id TEXT NOT NULL,
      type_label TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      claimed_by_id TEXT,
      claimed_by_tag TEXT,
      claimed_at TEXT,
      closed_by_id TEXT,
      closed_by_tag TEXT,
      closed_at TEXT,
      added_members TEXT DEFAULT '[]',
      panel_message_id TEXT,
      opened_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(guild_id, ticket_number)
    );

    CREATE TABLE IF NOT EXISTS ekip_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number INTEGER NOT NULL,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      opener_id TEXT NOT NULL,
      opener_tag TEXT NOT NULL,
      type_id TEXT NOT NULL,
      type_label TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      claimed_by_id TEXT,
      claimed_by_tag TEXT,
      claimed_at TEXT,
      closed_by_id TEXT,
      closed_by_tag TEXT,
      closed_at TEXT,
      panel_message_id TEXT,
      added_members TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(guild_id, ticket_number)
    );

    CREATE TABLE IF NOT EXISTS staff_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      total_claimed INTEGER DEFAULT 0,
      total_closed INTEGER DEFAULT 0,
      today_claimed INTEGER DEFAULT 0,
      week_claimed INTEGER DEFAULT 0,
      month_claimed INTEGER DEFAULT 0,
      today_closed INTEGER DEFAULT 0,
      week_closed INTEGER DEFAULT 0,
      month_closed INTEGER DEFAULT 0,
      category_counts TEXT DEFAULT '{"ic":0,"ooc":0,"ac":0}',
      total_claim_time_ms INTEGER DEFAULT 0,
      total_close_time_ms INTEGER DEFAULT 0,
      claim_count_for_avg INTEGER DEFAULT 0,
      close_count_for_avg INTEGER DEFAULT 0,
      total_whitelist_ver INTEGER DEFAULT 0,
      today_whitelist_ver INTEGER DEFAULT 0,
      week_whitelist_ver INTEGER DEFAULT 0,
      month_whitelist_ver INTEGER DEFAULT 0,
      total_kayitsiz INTEGER DEFAULT 0,
      total_ic_onay INTEGER DEFAULT 0,
      total_ic_red INTEGER DEFAULT 0,
      today_ic_onay INTEGER DEFAULT 0,
      week_ic_onay INTEGER DEFAULT 0,
      month_ic_onay INTEGER DEFAULT 0,
      today_ic_red INTEGER DEFAULT 0,
      week_ic_red INTEGER DEFAULT 0,
      month_ic_red INTEGER DEFAULT 0,
      today_kayitsiz INTEGER DEFAULT 0,
      week_kayitsiz INTEGER DEFAULT 0,
      month_kayitsiz INTEGER DEFAULT 0,
      total_ekip_ac INTEGER DEFAULT 0,
      total_ekip_kapat INTEGER DEFAULT 0,
      today_ekip_ac INTEGER DEFAULT 0,
      week_ekip_ac INTEGER DEFAULT 0,
      month_ekip_ac INTEGER DEFAULT 0,
      today_ekip_kapat INTEGER DEFAULT 0,
      week_ekip_kapat INTEGER DEFAULT 0,
      month_ekip_kapat INTEGER DEFAULT 0,
      total_support_received INTEGER DEFAULT 0,
      today_support_received INTEGER DEFAULT 0,
      week_support_received INTEGER DEFAULT 0,
      month_support_received INTEGER DEFAULT 0,
      total_support_provided INTEGER DEFAULT 0,
      today_support_provided INTEGER DEFAULT 0,
      week_support_provided INTEGER DEFAULT 0,
      month_support_provided INTEGER DEFAULT 0,
      total_ekip_referans INTEGER DEFAULT 0,
      last_reset_day TEXT DEFAULT '',
      last_reset_week TEXT DEFAULT '',
      last_reset_month TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS penalties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      penalty_number INTEGER NOT NULL,
      target_id TEXT NOT NULL,
      target_tag TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      staff_tag TEXT NOT NULL,
      reason TEXT NOT NULL,
      multiplier INTEGER DEFAULT 1,
      days INTEGER DEFAULT 0,
      expires_at TEXT,
      original_nickname TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(guild_id, penalty_number)
    );

    CREATE TABLE IF NOT EXISTS whitelist_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      action TEXT NOT NULL,
      reject_reason TEXT,
      staff_id TEXT NOT NULL,
      staff_tag TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_tag TEXT NOT NULL,
      steam_id TEXT,
      hex_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS blacklist_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blacklist_number INTEGER NOT NULL,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_tag TEXT NOT NULL,
      reason TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      staff_tag TEXT NOT NULL,
      removed_roles TEXT DEFAULT '[]',
      active INTEGER DEFAULT 1,
      removed_at TEXT,
      removed_by_id TEXT,
      removed_by_tag TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(guild_id, blacklist_number)
    );

    CREATE TABLE IF NOT EXISTS ic_isim_pending (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL UNIQUE,
      control_message_id TEXT,
      user_id TEXT NOT NULL,
      requested_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ic_isim_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      action TEXT NOT NULL,
      staff_id TEXT,
      staff_tag TEXT,
      target_id TEXT NOT NULL,
      target_tag TEXT NOT NULL,
      requested_name TEXT NOT NULL,
      final_name TEXT,
      reject_reason TEXT,
      message_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS member_flow_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_tag TEXT DEFAULT '',
      type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS member_invite_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_tag TEXT DEFAULT '',
      display_name TEXT DEFAULT '',
      inviter_id TEXT,
      inviter_tag TEXT DEFAULT '',
      inviter_name TEXT DEFAULT '',
      invite_code TEXT,
      invite_uses INTEGER DEFAULT 0,
      member_count INTEGER DEFAULT 0,
      source TEXT DEFAULT 'unknown',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_member_invite_guild_user
      ON member_invite_records(guild_id, user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_member_invite_guild_inviter
      ON member_invite_records(guild_id, inviter_id);

    CREATE TABLE IF NOT EXISTS supports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      support_number INTEGER NOT NULL,
      receivers TEXT NOT NULL,
      providers TEXT NOT NULL,
      penalized TEXT DEFAULT '[]',
      description TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(guild_id, support_number)
    );

    CREATE TABLE IF NOT EXISTS ekips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      boss_id TEXT,
      created_by_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      text_channel_id TEXT NOT NULL,
      panel_message_id TEXT DEFAULT '',
      member_ids TEXT DEFAULT '[]',
      banned_ids TEXT DEFAULT '[]',
      warnings TEXT DEFAULT '[]',
      action_logs TEXT DEFAULT '[]',
      yardim_yapildi INTEGER DEFAULT 0,
      referans_id TEXT,
      referans_tag TEXT,
      referans_at TEXT,
      referans_message_id TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      message_count INTEGER DEFAULT 0,
      voice_time_ms INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS guild_role_blacklists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL UNIQUE,
      role_ids TEXT DEFAULT '[]',
      exempt_roles TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS role_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_tag TEXT NOT NULL,
      role_id TEXT NOT NULL,
      role_name TEXT NOT NULL,
      action TEXT NOT NULL,
      executor_id TEXT NOT NULL,
      executor_tag TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS role_manage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      action TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      staff_tag TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_tag TEXT NOT NULL,
      role_id TEXT NOT NULL,
      role_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ban_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_tag TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      staff_tag TEXT NOT NULL,
      reason TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      unbanned_by_id TEXT,
      unbanned_by_tag TEXT,
      unbanned_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guild_daily_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      report_date_key TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(guild_id, report_date_key)
    );

    CREATE TABLE IF NOT EXISTS mulakat_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting',
      last_call_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS giveaways (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      description TEXT NOT NULL,
      winner_count INTEGER NOT NULL,
      ends_at TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      creator_tag TEXT NOT NULL,
      participants TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active',
      winners TEXT DEFAULT '[]',
      backups TEXT DEFAULT '[]',
      ended_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_giveaways_status_ends
      ON giveaways(status, ends_at);

    CREATE TABLE IF NOT EXISTS meslek_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      ekip_id INTEGER,
      user_id TEXT,
      ekip_name TEXT,
      role_id TEXT NOT NULL,
      role_name TEXT NOT NULL,
      assigned_by_id TEXT NOT NULL,
      assigned_by_tag TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_meslek_guild_type
      ON meslek_assignments(guild_id, target_type);
    CREATE INDEX IF NOT EXISTS idx_meslek_ekip
      ON meslek_assignments(guild_id, ekip_id);
    CREATE INDEX IF NOT EXISTS idx_meslek_user
      ON meslek_assignments(guild_id, user_id);

    CREATE TABLE IF NOT EXISTS channel_locks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      overwrites TEXT DEFAULT '[]',
      locked_by_id TEXT NOT NULL,
      locked_by_tag TEXT NOT NULL,
      locked_at TEXT NOT NULL,
      announcement_message_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(guild_id, channel_id)
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_guild_opener_status ON tickets(guild_id, opener_id, status);
    CREATE INDEX IF NOT EXISTS idx_tickets_channel ON tickets(channel_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_claimed ON tickets(claimed_by_id, status);
    CREATE INDEX IF NOT EXISTS idx_penalties_guild_target ON penalties(guild_id, target_id);
    CREATE INDEX IF NOT EXISTS idx_whitelist_logs_guild ON whitelist_logs(guild_id, staff_id, action);
    CREATE INDEX IF NOT EXISTS idx_ban_logs_guild_target ON ban_logs(guild_id, target_id, active);
    CREATE INDEX IF NOT EXISTS idx_ic_isim_logs_guild ON ic_isim_logs(guild_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_member_flow_guild ON member_flow_logs(guild_id, type, created_at);
    CREATE INDEX IF NOT EXISTS idx_ekips_guild_slug ON ekips(guild_id, slug, status);

    CREATE TABLE IF NOT EXISTS user_channel_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_count INTEGER DEFAULT 0,
      voice_time_ms INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(guild_id, user_id, channel_id)
    );

    CREATE INDEX IF NOT EXISTS idx_user_channel_stats_guild_user_msg
      ON user_channel_stats(guild_id, user_id, message_count);
    CREATE INDEX IF NOT EXISTS idx_user_channel_stats_guild_user_voice
      ON user_channel_stats(guild_id, user_id, voice_time_ms);

    CREATE TABLE IF NOT EXISTS user_daily_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      date_key TEXT NOT NULL,
      message_count INTEGER DEFAULT 0,
      voice_time_ms INTEGER DEFAULT 0,
      voice_joins INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(guild_id, user_id, date_key)
    );

    CREATE INDEX IF NOT EXISTS idx_user_daily_activity_guild_date
      ON user_daily_activity(guild_id, date_key);

    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      title TEXT NOT NULL,
      voice_channel_id TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_by_id TEXT NOT NULL,
      created_by_tag TEXT NOT NULL,
      notified_at TEXT,
      cancelled_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_meetings_guild_status
      ON meetings(guild_id, status, scheduled_at);

    CREATE TABLE IF NOT EXISTS meeting_voice_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      joined_at TEXT NOT NULL,
      left_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_meeting_voice_meeting
      ON meeting_voice_sessions(meeting_id, user_id);

    CREATE TABLE IF NOT EXISTS mazarets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_tag TEXT NOT NULL,
      reason TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reject_reason TEXT,
      source TEXT NOT NULL,
      meeting_id TEXT,
      meeting_title TEXT,
      log_channel_id TEXT,
      log_message_id TEXT,
      reviewed_by_id TEXT,
      reviewed_by_tag TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_mazarets_guild_user
      ON mazarets(guild_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_mazarets_meeting_user
      ON mazarets(meeting_id, user_id);

    CREATE TABLE IF NOT EXISTS kayit_puanlari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      voter_id TEXT NOT NULL,
      voter_tag TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      staff_tag TEXT NOT NULL,
      score INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      rated_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_kayit_puan_staff
      ON kayit_puanlari(guild_id, staff_id, status);
    CREATE INDEX IF NOT EXISTS idx_kayit_puan_voter_pending
      ON kayit_puanlari(guild_id, voter_id, status);

    CREATE TABLE IF NOT EXISTS coin_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      total_earned REAL NOT NULL DEFAULT 0,
      total_spent REAL NOT NULL DEFAULT 0,
      voice_ms_remainder INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(guild_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_coin_balances_guild_balance
      ON coin_balances(guild_id, balance DESC);

    CREATE TABLE IF NOT EXISTS coin_shop_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      cost REAL NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT -1,
      active INTEGER NOT NULL DEFAULT 1,
      created_by_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_coin_shop_guild_active
      ON coin_shop_items(guild_id, active);

    CREATE TABLE IF NOT EXISTS coin_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_tag TEXT DEFAULT '',
      item_id INTEGER,
      item_name TEXT NOT NULL,
      cost REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_coin_purchases_guild_user
      ON coin_purchases(guild_id, user_id);

    CREATE TABLE IF NOT EXISTS coin_daily_totals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      date_key TEXT NOT NULL,
      total_distributed REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(guild_id, date_key)
    );

    CREATE INDEX IF NOT EXISTS idx_coin_daily_guild_date
      ON coin_daily_totals(guild_id, date_key);

    CREATE TABLE IF NOT EXISTS weekly_performance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_tag TEXT DEFAULT '',
      week_key TEXT NOT NULL,
      ticket_kapatilan INTEGER NOT NULL DEFAULT 0,
      ticket_ilgilenilen INTEGER NOT NULL DEFAULT 0,
      kayit_toplam INTEGER NOT NULL DEFAULT 0,
      ic_toplam INTEGER NOT NULL DEFAULT 0,
      destek_toplam INTEGER NOT NULL DEFAULT 0,
      ekip_toplam INTEGER NOT NULL DEFAULT 0,
      mesaj INTEGER NOT NULL DEFAULT 0,
      voice_ms INTEGER NOT NULL DEFAULT 0,
      avg_close_ms INTEGER NOT NULL DEFAULT 0,
      perf_pct REAL NOT NULL DEFAULT 0,
      above_avg INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 0,
      averages TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(guild_id, user_id, week_key)
    );

    CREATE INDEX IF NOT EXISTS idx_weekly_perf_guild_week
      ON weekly_performance(guild_id, week_key);
    CREATE INDEX IF NOT EXISTS idx_weekly_perf_guild_user
      ON weekly_performance(guild_id, user_id, week_key);

    CREATE TABLE IF NOT EXISTS rank_suggestion_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_tag TEXT DEFAULT '',
      week_key TEXT NOT NULL,
      weeks_above INTEGER NOT NULL DEFAULT 0,
      perf_pct REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      approved INTEGER NOT NULL DEFAULT 0,
      reviewed_by_id TEXT,
      reviewed_by_tag TEXT,
      reviewed_at TEXT,
      message_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_rank_suggestion_guild_user
      ON rank_suggestion_logs(guild_id, user_id, status);
    CREATE INDEX IF NOT EXISTS idx_rank_suggestion_guild_week
      ON rank_suggestion_logs(guild_id, week_key);
  `);

  migrateEkipsTable(db);
  migrateChannelLocksTable(db);
  migrateUserActivityVoiceDetail(db);
  migrateStaffStatsYetki(db);
  migrateMeetingsEndedAt(db);
  migrateMeetingsStartedNotifiedAt(db);
  migratePerformanceIndexes(db);
  migrateGuildRoleBlacklists(db);
}

function migrateGuildRoleBlacklists(db) {
  const cols = db.prepare('PRAGMA table_info(guild_role_blacklists)').all().map((c) => c.name);
  if (!cols.includes('exempt_roles')) {
    db.exec("ALTER TABLE guild_role_blacklists ADD COLUMN exempt_roles TEXT DEFAULT '[]'");
  }
}

function migratePerformanceIndexes(db) {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_whitelist_logs_guild_created ON whitelist_logs(guild_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_ban_logs_guild_created ON ban_logs(guild_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_penalties_guild_created ON penalties(guild_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_blacklist_logs_guild_created ON blacklist_logs(guild_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_supports_guild_created ON supports(guild_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_tickets_guild_created ON tickets(guild_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_ekip_tickets_guild_created ON ekip_tickets(guild_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_staff_stats_guild_closed ON staff_stats(guild_id, total_closed DESC)',
  ];

  for (const sql of indexes) {
    db.exec(sql);
  }
}

function migrateMeetingsStartedNotifiedAt(db) {
  const cols = db.prepare('PRAGMA table_info(meetings)').all().map((c) => c.name);
  if (!cols.includes('started_notified_at')) {
    db.exec('ALTER TABLE meetings ADD COLUMN started_notified_at TEXT');
  }
}

function migrateMeetingsEndedAt(db) {
  const cols = db.prepare('PRAGMA table_info(meetings)').all().map((c) => c.name);
  if (!cols.includes('ended_at')) {
    db.exec('ALTER TABLE meetings ADD COLUMN ended_at TEXT');
  }
}

function migrateStaffStatsYetki(db) {
  const cols = db.prepare('PRAGMA table_info(staff_stats)').all().map((c) => c.name);
  if (!cols.includes('staff_started_at')) {
    db.exec('ALTER TABLE staff_stats ADD COLUMN staff_started_at TEXT');
  }
  if (!cols.includes('staff_level')) {
    db.exec('ALTER TABLE staff_stats ADD COLUMN staff_level TEXT');
  }
  if (!cols.includes('staff_started_by_id')) {
    db.exec('ALTER TABLE staff_stats ADD COLUMN staff_started_by_id TEXT');
  }
  if (!cols.includes('total_ekip_referans')) {
    db.exec('ALTER TABLE staff_stats ADD COLUMN total_ekip_referans INTEGER DEFAULT 0');
  }
}

function migrateChannelLocksTable(db) {
  const cols = db.prepare('PRAGMA table_info(channel_locks)').all().map((c) => c.name);
  if (cols.length > 0 && !cols.includes('announcement_message_id')) {
    db.exec('ALTER TABLE channel_locks ADD COLUMN announcement_message_id TEXT');
  }
}

function migrateEkipsTable(db) {
  const cols = db.prepare('PRAGMA table_info(ekips)').all().map((c) => c.name);
  if (!cols.includes('boss_id')) {
    db.exec('ALTER TABLE ekips ADD COLUMN boss_id TEXT');
    db.exec('UPDATE ekips SET boss_id = owner_id WHERE boss_id IS NULL');
  }
  if (!cols.includes('yardim_yapildi')) {
    db.exec('ALTER TABLE ekips ADD COLUMN yardim_yapildi INTEGER DEFAULT 0');
  }
  if (!cols.includes('referans_id')) {
    db.exec('ALTER TABLE ekips ADD COLUMN referans_id TEXT');
  }
  if (!cols.includes('referans_tag')) {
    db.exec('ALTER TABLE ekips ADD COLUMN referans_tag TEXT');
  }
  if (!cols.includes('referans_at')) {
    db.exec('ALTER TABLE ekips ADD COLUMN referans_at TEXT');
  }
  if (!cols.includes('referans_message_id')) {
    db.exec('ALTER TABLE ekips ADD COLUMN referans_message_id TEXT');
  }
  if (!cols.includes('warnings')) {
    db.exec("ALTER TABLE ekips ADD COLUMN warnings TEXT DEFAULT '[]'");
  }
  if (!cols.includes('action_logs')) {
    db.exec("ALTER TABLE ekips ADD COLUMN action_logs TEXT DEFAULT '[]'");
  }
}

function migrateUserActivityVoiceDetail(db) {
  for (const table of ['user_activity', 'user_channel_stats']) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    if (!cols.includes('voice_mic_open_ms')) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN voice_mic_open_ms INTEGER DEFAULT 0`);
    }
    if (!cols.includes('voice_deaf_open_ms')) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN voice_deaf_open_ms INTEGER DEFAULT 0`);
    }
  }
}

module.exports = { initSchema };
