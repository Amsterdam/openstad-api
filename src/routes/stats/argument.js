const express = require('express');
const { getPool } = require('../../db-mysql-raw-sql')

let router = express.Router({mergeParams: true});

// for all get requests
router
	.all('*', function(req, res, next) {
    return next();
	})

router.route('/total')

// count arguments
// ---------------
	.get(function(req, res, next) {

    let ideaId = req.query.ideaId;
    let sentiment = req.query.sentiment;

    let query = `SELECT count(arguments.id) AS counted FROM ideas LEFT JOIN arguments ON arguments.ideaId = ideas.id `;
    let bindvars = []
    if (sentiment) {
      query += `AND arguments.sentiment = ? `;
      bindvars.push(sentiment);
    }
    query += "WHERE ideas.deletedAt IS NULL AND ideas.siteId = ? ";
    bindvars.push(req.params.siteId);
    if (ideaId) {
      query += "AND ideas.id = ? ";
      bindvars.push(ideaId);
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
