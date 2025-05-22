const { DataTypes, Model } = require("sequelize");
const sequelize = require("../db");
const { v4: uuidv4 } = require("uuid");

class Passenger extends Model { }
Passenger.init({
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    userId: { type: DataTypes.STRING, allowNull: false },
    bookingId: {
        type: DataTypes.STRING(5),
        allowNull: false,
        validate: { is: /^\d{5}$/ }
    },
    name: { type: DataTypes.TEXT, allowNull: false },
    age: { type: DataTypes.INTEGER, allowNull: false },
    gender: { type: DataTypes.ENUM("MALE", "FEMALE", "OTHER"), allowNull: false },
    status: { type: DataTypes.ENUM("CONFIRMED", "RAC", "WAITLIST"), allowNull: false },
    berthNo: { type: DataTypes.INTEGER, allowNull: true },
    berthType: { type: DataTypes.ENUM("LB", "MB", "UB", "SU"), allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    tableName: "passengers",
    timestamps: false
});

module.exports = Passenger;
