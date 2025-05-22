const { DataTypes, Model } = require("sequelize");
const sequelize = require("../db");
const { v4: uuidv4 } = require("uuid");

class User extends Model { }
User.init({
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    fullName: DataTypes.STRING,
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize, tableName: "users", timestamps: false
});

module.exports = User;
