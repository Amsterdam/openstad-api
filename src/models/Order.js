var config         = require('config')
, log            = require('debug')('app:user')
, pick           = require('lodash/pick');

var sanitize       = require('../util/sanitize');


module.exports = function( db, sequelize, DataTypes ) {
	var Order = sequelize.define('order', {
		siteId: {
			type         : DataTypes.INTEGER,
			defaultValue : 0,
		},

		extraData: getExtraDataConfig(DataTypes.JSON, 'order'),

		email: {
			type         : DataTypes.STRING(255),
			auth: {
				listableBy: ['editor','owner'],
				viewableBy: ['editor','owner'],
				createableBy: ['editor','owner'],
				updateableBy: ['editor','owner'],
			},
			allowNull    : true,
			validate     : {
				isEmail: {
					msg: 'Geen geldig emailadres'
				},
				notBlackListed: function( email ) {
					var match = email && email.match(/^.+@(.+)$/);
					if (match) {
						let domainName = match[1];
						if( domainName in emailBlackList ) {
							throw Error('Graag je eigen emailadres gebruiken; geen tijdelijk account');
						}
					}
				}
			}
		},
		firstName: {
			type         : DataTypes.STRING(64),
			auth: {
				listableBy: ['editor','owner'],
        viewableBy: ['editor','owner'],
				createableBy: ['editor','owner'],
				updateableBy: ['editor','owner'],
			},
			allowNull    : true,
			set          : function( value ) {
				this.setDataValue('firstName', sanitize.noTags(value));
			}
		},

		lastName: {
			type         : DataTypes.STRING(64),
			auth: {
				listableBy: ['editor','owner'],
        viewableBy: ['editor','owner'],
				createableBy: ['editor','owner'],
				updateableBy: ['editor','owner'],
			},
			allowNull    : true,
			set          : function( value ) {
				this.setDataValue('lastName', sanitize.noTags(value));
			}
		},

		phoneNumber: {
			type         : DataTypes.STRING(64),
			auth: {
				listableBy: ['editor','owner'],
				viewableBy: ['editor','owner'],
				createableBy: ['editor','owner'],
				updateableBy: ['editor','owner'],
			},
			allowNull    : true,
			set          : function( value ) {
				this.setDataValue('phoneNumber', sanitize.noTags(value));
			}
		},

		streetName: {
			type         : DataTypes.STRING(64),
			auth: {
				listableBy: ['editor','owner'],
				viewableBy: ['editor','owner'],
				createableBy: ['editor','owner'],
				updateableBy: ['editor','owner'],
			},
			allowNull    : true,
			set          : function( value ) {
				this.setDataValue('streetName', sanitize.noTags(value));
			}
		},

		houseNumber: {
			type         : DataTypes.STRING(64),
			allowNull    : true,
			set          : function( value ) {
				this.setDataValue('houseNumber', sanitize.noTags(value));
			}
		},


		postcode: {
			type         : DataTypes.STRING(64),
			allowNull    : true,
			set          : function( value ) {
				this.setDataValue('postcode', sanitize.noTags(value));
			}
		},

		city: {
			type         : DataTypes.STRING(64),
			allowNull    : true,
			set          : function( value ) {
				this.setDataValue('city', sanitize.noTags(value));
			}
		},

		suffix: {
			type         : DataTypes.STRING(64),
			allowNull    : true,
			set          : function( value ) {
				this.setDataValue('suffix', sanitize.noTags(value));
			}
		},

		phoneNumber: {
			type         : DataTypes.STRING(64),
			auth: {
				listableBy: ['editor','owner'],
				viewableBy: ['editor','owner'],
				createableBy: ['editor','owner'],
				updateableBy: ['editor','owner'],
			},
			allowNull    : true,
			set          : function( value ) {
				this.setDataValue('phoneNumber', sanitize.noTags(value));
			}
		},

    paymentStatus: {
			type         : DataTypes.ENUM('OPEN','PAYED'),
			defaultValue : 'OPEN',
			allowNull    : false
    },

		status: {
			type         : DataTypes.ENUM('OPEN','PROCESSING','IN_SHIPPING','DELIVERED', 'CANCELLED'),
			defaultValue : 'OPEN',
			allowNull    : false
		},

		total: {
       type: DataTypes.DECIMAL(10,2),
       allowNull: true,
    },

	}, {
		charset: 'utf8',
		validate: {},
	});

	Order.scopes = function scopes() {
		return {
			includeLog: {
				include: [{
					model: db.OrderLog,
					attributes: ['event', 'description', 'createdAt'],
					through: {attributes: []},
				}]
			},
			includeItems: {
				include: [{
					model: db.OrderItem,
					attributes: ['productId', 'vat', 'price', 'extraData'],
					through: {attributes: []},
				}]
			},
			includeTransaction: {
				include: [{
					model: db.Transaction,
					attributes: ['status', 'createdAt', 'provider'],
					through: {attributes: []},
				}]
			},
		}
	}

	Order.auth = Order.prototype.auth = {
		listableBy: ['admin','editor','owner', 'moderator'],
		viewableBy: ['admin','editor','owner', 'moderator'],
		createableBy: 'member',
    updateableBy: ['admin','editor','owner', 'moderator'],
    deleteableBy: ['admin','editor','owner', 'moderator'],
	}

	Order.associate = function( models ) {
		this.hasMany(models.Order);
		this.belongsTo(models.Account);
		//variations
		this.belongsTo(models.Order);
	}

	return Order;
};