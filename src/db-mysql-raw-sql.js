const config    = require('config');
const dbConfig  = config.get('database');
const mysql = require('mysql2/promise');
const getAzureAuthToken = require('./util/azure-auth')

let pool;

const createPool = async () => {
    try {
      const dbPassword = process.env.AZURE_CLIENT_ID ? await getAzureAuthToken() : dbConfig.password
      return mysql.createPool({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbPassword,
        database: dbConfig.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ssl: {
          require: true
        }
      });
    } catch (e) {
      console.log('Error while initialising MySQL connection: ', e);
      return next(createError(500, 'Error while initialising MySQL connection: ', e));
    }
}

const setPool = (newPool) => pool = newPool

const getPool = () => pool

module.exports = { createPool, setPool, getPool }