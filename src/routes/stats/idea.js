const config    = require('config');
const dbConfig  = config.get('database');
const mysql = require('mysql2/promise');
const express = require('express');
const createError = require('http-errors')
const getAzureAuthToken = require('../../util/azure-auth')

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
    console.log('Error while initialising SQL connection: ', e);
    return next(createError(500, 'Error while initialising SQL connection: ', e));
  }
}

let router = express.Router({mergeParams: true});

// for all get requests
router
	.all('*', function(req, res, next) {
    return next();
	})

router.route('/total')

// count ideas
// -----------
	.get(async (req, res, next) => {

    let query = "SELECT count(ideas.id) AS counted FROM ideas WHERE ideas.publishDate < NOW() AND ideas.deletedAt IS NULL AND ideas.siteId=?";
    let bindvars = [req.params.siteId]

    const pool = await createPool()
    pool
      .promise()
      .query(query, bindvars)
      .then( ([rows,fields]) => {
        let counted = rows && rows[0] && rows[0].counted || -1;
        res.json({count: counted})
      })
      .catch(err => {
        next(err);
      })

  })

module.exports = router;
