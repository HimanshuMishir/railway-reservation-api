module.exports = (sequelize, DataTypes) => {
    return sequelize.define('WaitingList', {
        position: DataTypes.INTEGER,
        ticket_id: DataTypes.INTEGER
    });
};