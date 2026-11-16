const { createCounterModel } = require('../sqlite/modelFactory');

const Counter = createCounterModel();

async function getNextTicketNumber(guildId) {
  const counter = await Counter.findByIdAndUpdate(
    `ticket_${guildId}`,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

module.exports = { Counter, getNextTicketNumber };
