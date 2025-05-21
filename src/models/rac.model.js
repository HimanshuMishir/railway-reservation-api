module.exports = (sequelize, DataTypes) => {
    return sequelize.define('RACQueue', {
        position: DataTypes.INTEGER,
        ticket_id: DataTypes.INTEGER
    });
};