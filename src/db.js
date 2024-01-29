const { DefaultAzureCredential } = require('@azure/identity');

var Sequelize = require('sequelize');
var _         = require('lodash');
var util      = require('./util');

var config    = require('config');
var dbConfig  = config.get('database');

// newer versions of mysql (8+) have changed GeomFromText to ST_GeomFromText
// this is a fix for sequalize
if (dbConfig.mysqlSTGeoMode || process.env.MYSQL_ST_GEO_MODE === 'on') {
	const wkx = require('wkx')
	Sequelize.GEOMETRY.prototype._stringify = function _stringify(value, options) {
	  return `ST_GeomFromText(${options.escape(wkx.Geometry.parseGeoJSON(value).toWkt())})`;
	}
	Sequelize.GEOMETRY.prototype._bindParam = function _bindParam(value, options) {
	  return `ST_GeomFromText(${options.bindParam(wkx.Geometry.parseGeoJSON(value).toWkt())})`;
	}
	Sequelize.GEOGRAPHY.prototype._stringify = function _stringify(value, options) {
	  return `ST_GeomFromText(${options.escape(wkx.Geometry.parseGeoJSON(value).toWkt())})`;
	}
	Sequelize.GEOGRAPHY.prototype._bindParam = function _bindParam(value, options) {
	  return `ST_GeomFromText(${options.bindParam(wkx.Geometry.parseGeoJSON(value).toWkt())})`;
	}
}

async function getToken() {
	const credential = new DefaultAzureCredential();
	const tokenResponse = await credential.getToken('https://openstad-o-y6eks2r2zwsq4.mysql.database.azure.com');
	return tokenResponse.token;
}

async function configureSequelize() {
	const dialectOptions = {
		charset            : 'utf8',
		multipleStatements : dbConfig.multipleStatements,
		socketPath         : dbConfig.socketPath,
		token: await getToken(),
	}

	if (process.env.MYSQL_CA_CERT && process.env.MYSQL_CA_CERT.trim && process.env.MYSQL_CA_CERT.trim()) {
		dialectOptions.ssl = {
			rejectUnauthorized: true,
			ca: [ process.env.MYSQL_CA_CERT ]
		}
	}

	var sequelize = new Sequelize(dbConfig.database, dbConfig.user, async () => (await getAzureAuth()).dbPassword, {
		dialect        : dbConfig.dialect,
		host           : dbConfig.host,
		port					 : dbConfig.port || 3306,
		database: dbConfig.database,
		dialectOptions,
		timeZone       : config.timeZone,
		logging        : require('debug')('app:db:query'),
		 // logging				 : console.log,
		typeValidation : true,
	
		define: {
			charset        : 'utf8',
			underscored    : false, // preserve columName casing.
			underscoredAll : true, // tableName to table_name.
			paranoid       : true // deletedAt column instead of removing data.
		},
		pool: {
			min  : 0,
			max  : dbConfig.maxPoolSize,
			idle : 10000
		},
	});

	return sequelize;
}


// async () => console.log("Check azure db password:", (await getAzureAuth()).dbPassword)
// // var sequelize = new Sequelize(dbConfig.database, dbConfig.user, process.env.AZURE_CLIENT_ID ? (await util.getAzureAuth()).dbPassword : dbConfig.password, {
// var sequelize = new Sequelize(dbConfig.database, dbConfig.user, async () => (await getAzureAuth()).dbPassword, {
// 	dialect        : dbConfig.dialect,
// 	host           : dbConfig.host,
// 	port					 : dbConfig.port || 3306,
// 	dialectOptions,
// 	timeZone       : config.timeZone,
// 	logging        : require('debug')('app:db:query'),
//  	// logging				 : console.log,
// 	typeValidation : true,

// 	define: {
// 		charset        : 'utf8',
// 		underscored    : false, // preserve columName casing.
// 		underscoredAll : true, // tableName to table_name.
// 		paranoid       : true // deletedAt column instead of removing data.
// 	},
// 	pool: {
// 		min  : 0,
// 		max  : dbConfig.maxPoolSize,
// 		idle : 10000
// 	},
// });




// Define models.
var db     = {sequelize: configureSequelize()};
var models = require('./models')(db, sequelize, Sequelize.DataTypes);

// authentication mixins
const mixins = require('./lib/sequelize-authorization/mixins');
Object.keys(models).forEach((key) => {
  let model = models[key];
  model.can = model.prototype.can = mixins.can;
  model.prototype.toJSON = mixins.toAuthorizedJSON;
  model.authorizeData = model.prototype.authorizeData = mixins.authorizeData;
});

_.extend(db, models);

// Invoke associations on each of the models.
_.forEach(models, function( model ) {
	if( model.associate ) {
		model.associate(models);
	}
	if( model.scopes ) {
		_.forEach(model.scopes(), function( scope, name ) {
			model.addScope(name, scope, {override: true});
		});
	}
});

module.exports = db;
