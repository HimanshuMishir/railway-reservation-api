const Sequelize = require('sequelize');
const sequelize = require('../db');

const Passenger = require('./passenger.model')(sequelize, Sequelize);
const Ticket = require('./ticket.model')(sequelize, Sequelize);
const Berth = require('./berth.model')(sequelize, Sequelize);
const RACQueue = require('./rac.model')(sequelize, Sequelize);
const WaitingList = require('./waitinglist.model')(sequelize, Sequelize);

// Associations
Ticket.hasMany(Passenger, { onDelete: 'CASCADE' });
Passenger.belongsTo(Ticket);

Ticket.hasOne(Berth);
Berth.belongsTo(Ticket);

module.exports = { sequelize, Passenger, Ticket, Berth, RACQueue, WaitingList };