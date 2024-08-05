const express = require('express');
const { getPool } = require('../../db-mysql-raw-sql')

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

    const mysqlConnectionPool = getPool()
    if (!mysqlConnectionPool) {
      throw new Error('MySQL connection pool is not initialized');
    }
    mysqlConnectionPool
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
