const express = require('express');
const createError = require('http-errors')
const { getPool } = require('../../db-mysql-raw-sql')

let router = express.Router({mergeParams: true});

// for all get requests
router
    .all('*', function(req, res, next) {

        return next();

    })

router.route('/total')

    // count votes
    // -----------
    .get(async (req, res, next) => {

        let isViewable = req.site && req.site.config && req.site.config.votes && req.site.config.votes.isViewable;
        isViewable = isViewable || ( req.user && ( req.user.role == 'admin' || req.user.role == 'editor' || req.user.role == 'moderator' ) )
        if (!isViewable) return next(createError(401, 'Je kunt deze stats niet bekijken'));

        let query = "SELECT count(votes.id) AS counted FROM votes LEFT JOIN ideas ON votes.ideaId = ideas.id WHERE votes.deletedAt IS NULL AND  (votes.checked IS NULL OR votes.checked = 1) AND ideas.deletedAt IS NULL AND ideas.siteId=?";
        let bindvars = [req.params.siteId]

        if (req.query.opinion) {
            query += " AND votes.opinion=?"
            bindvars.push(req.query.opinion);
        }

        const mysqlConnectionPool = getPool()
        if (!mysqlConnectionPool) {
        throw new Error('MySQL connection pool is not initialized');
        }
        mysqlConnectionPool
            .query(query, bindvars)
            .then( ([rows,fields]) => {
                console.log(rows);
                let counted = rows && rows[0] && rows[0].counted || -1;
                res.json({count: counted})
            })
            .catch(err => {
                next(err);
            })

    })


router.route('/no-of-users')

    // count votes
    // -----------
    .get(async (req, res, next) => {

        let query = "SELECT count(votes.id) AS counted FROM votes LEFT JOIN ideas ON votes.ideaId = ideas.id WHERE ideas.siteId=? AND votes.deletedAt  IS NULL AND  (votes.checked IS NULL OR votes.checked = 1)  AND ideas.deletedAt IS NULL GROUP BY votes.userId";
        let bindvars = [req.params.siteId]

        const mysqlConnectionPool = getPool()
        if (!mysqlConnectionPool) {
        throw new Error('MySQL connection pool is not initialized');
        }
        mysqlConnectionPool
            .query(query, bindvars)
            .then( ([rows,fields]) => {
                console.log(rows);
                let counted = rows && rows.length || -1;
                res.json({count: counted})
            })
            .catch(err => {
                next(err);
            })

    })

module.exports = router;
