const { DataTypes, Model } = require("sequelize");
const sequelize = require("../db");
const { v4: uuidv4 } = require("uuid");
const User = require("./user");

class Booking extends Model { }
Booking.init({
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    bookingId: {
        type: DataTypes.STRING(5),
        allowNull: false,
        unique: true,
        validate: { is: /^\d{5}$/ }
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" }
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize, tableName: "bookings", timestamps: false
});

// FK relation
Booking.belongsTo(User, { foreignKey: "userId" });
User.hasMany(Booking, { foreignKey: "userId" });

module.exports = Booking;
