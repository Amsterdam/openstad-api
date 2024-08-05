const express = require('express');
const { getPool } = require('../../db-mysql-raw-sql')

let router = express.Router({mergeParams: true});

// for all get requests
router
	.all('*', function(req, res, next) {
    return next();
	})

router.route('/total')

// count ideas
// -----------
	.get(function(req, res, next) {

    let query = "SELECT count(ideas.id) AS counted FROM ideas WHERE ideas.publishDate < NOW() AND ideas.deletedAt IS NULL AND ideas.siteId=?";
    let bindvars = [req.params.siteId]

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
