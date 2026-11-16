const { createModel } = require('../sqlite/modelFactory');
const { MODELS } = require('../sqlite/definitions');

const Ticket = createModel(MODELS.ticket);

const _create = Ticket.create.bind(Ticket);
Ticket.create = async (data) =>
  _create({
    openedAt: new Date(),
    addedMembers: [],
    ...data,
  });

module.exports = { Ticket };
