module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Berth', {
        berth_type: DataTypes.ENUM('LOWER', 'MIDDLE', 'UPPER', 'SIDE_LOWER'),
        berth_number: DataTypes.INTEGER,
        is_occupied: DataTypes.BOOLEAN,
    });
};