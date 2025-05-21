module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Ticket', {
        status: DataTypes.ENUM('CONFIRMED', 'RAC', 'WAITING', 'CANCELLED'),
        berth_type: DataTypes.ENUM('LOWER', 'MIDDLE', 'UPPER', 'SIDE_LOWER', 'NONE')
    });
};