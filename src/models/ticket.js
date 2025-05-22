const { DataTypes, Model } = require("sequelize");
const sequelize = require("../db");
const { v4: uuidv4 } = require("uuid");
const Booking = require("./booking");

class Ticket extends Model { }
Ticket.init({
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    bookingId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "bookings", key: "id" }
    },
    name: { type: DataTypes.TEXT, allowNull: false },
    age: { type: DataTypes.INTEGER, allowNull: false },
    gender: { type: DataTypes.ENUM("MALE", "FEMALE", "OTHER"), allowNull: false },
    status: { type: DataTypes.ENUM("CONFIRMED", "RAC", "WAITLIST"), allowNull: false },
    berthNo: { type: DataTypes.INTEGER, allowNull: true },
    berthType: { type: DataTypes.ENUM("LB", "MB", "UB", "SU"), allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize, tableName: "tickets", timestamps: false
});

Ticket.belongsTo(Booking, { foreignKey: "bookingId" });
Booking.hasMany(Ticket, { foreignKey: "bookingId" });

module.exports = Ticket;
