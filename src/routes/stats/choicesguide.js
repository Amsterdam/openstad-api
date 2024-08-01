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


const router = express.Router({mergeParams: true});

// for all get requests
router
  .all('*', function(req, res, next) {
    return next();
  })

router.route('/total')
  .get(async (req, res, next) => {

    let query = `
        SELECT count(choicesGuideResults.id) AS counted 
        FROM choicesGuideResults
        INNER JOIN choicesGuides ON choicesGuides.id = choicesGuideResults.choicesGuideId
        WHERE choicesGuideResults.deletedAt IS NULL 
        AND choicesGuides.siteId=?    
        AND choicesGuides.deletedAt IS NULL
    `;
    const bindvars = [req.params.siteId]

    if (req.query.choicesGuideId) {
      query += `AND choicesGuideResults.choicesGuideId=?`;
      bindvars.push(req.query.choicesGuideId);
    }

    const pool = await createPool()
    pool
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
