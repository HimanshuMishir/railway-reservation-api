module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Passenger', {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        age: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: { min: 0 }
        },
        gender: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: { isIn: [['MALE', 'FEMALE', 'OTHER']] }
        },
        is_child: DataTypes.BOOLEAN
    });
};
