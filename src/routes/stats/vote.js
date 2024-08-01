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

        const pool = await createPool()
        pool()
            .promise()
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

        const pool = await createPool()
        pool
            .promise()
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
