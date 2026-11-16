const { MemberFlowLog } = require('../database/models/MemberFlowLog');

async function recordMemberFlow(member, type) {
  if (!member?.guild || member.user?.bot) return;

  await MemberFlowLog.create({
    guildId: member.guild.id,
    userId: member.id,
    userTag: member.user?.tag || member.id,
    type,
  }).catch((err) => {
    console.warn('[MemberFlowLog]', err.message);
  });
}

module.exports = { recordMemberFlow };
