const Sequelize = require('sequelize');
const express = require('express');
const moment			= require('moment');
const createError = require('http-errors')
const config = require('config');
const db = require('../../db');
const auth = require('../../middleware/sequelize-authorization-middleware');
const mail = require('../../lib/mail');
const pagination = require('../../middleware/pagination');
const searchResults = require('../../middleware/search-results');

const router = express.Router({mergeParams: true});

// scopes: for all get requests
router
	.all('*', function(req, res, next) {

		req.scope = ['api'];

		var sort = (req.query.sort || '').replace(/[^a-z_]+/i, '') || (req.cookies['article_sort'] && req.cookies['article_sort'].replace(/[^a-z_]+/i, ''));
		if (sort) {
			res.cookie('article_sort', sort, { expires: 0 });
			req.scope.push({ method: ['sort', req.query.sort]});
		}

		if (req.query.mapMarkers) {
			req.scope.push('mapMarkers');
		}

		if (req.query.running) {
			req.scope.push('selectRunning');
		}

		if (req.query.includePosterImage) {
			req.scope.push('includePosterImage');
		}

		if (req.query.includeUser) {
			req.scope.push('includeUser');
		}

		return next();

	})

router.route('/')

// list articles
// ----------
	.get(auth.can('Article', 'list'))
	.get(pagination.init)
	// add filters
	.get(function(req, res, next) {

		let queryConditions = req.queryConditions ? req.queryConditions : {};
		queryConditions = Object.assign(queryConditions, { siteId: req.params.siteId });

		db.Article
			.scope(...req.scope)
			.findAndCountAll({ where: queryConditions, offset: req.pagination.offset, limit: req.pagination.limit })
			.then(function( result ) {
        req.results = result.rows;
        req.pagination.count = result.count;
        return next();
			})
			.catch(next);
	})
	.get(searchResults)
	.get(pagination.paginateResults)
	.get(function(req, res, next) {
		res.json(req.results);
  })

// create article
// -----------
	.post(auth.can('Article', 'create'))
	.post(function(req, res, next) {
		if (!req.site) return next(createError(401, 'Site niet gevonden'));
		return next();
	})
	.post(function( req, res, next ) {
		if (!(req.site.config && req.site.config.articles && req.site.config.articles.canAddNewArticles)) return next(createError(401, 'Inzenden is gesloten'));
		return next();
	})
	.post(function(req, res, next) {

		let data = {
      ...req.body,
			siteId      : req.params.siteId,
			userId      : req.user.id,
		  startDate:  new Date(),
		}

    // TODO: dit moet ook nog ergens in auth
    if (auth.hasRole(req.user, 'editor')) {
      if (data.modBreak) {
        data.modBreakUserId = req.body.modBreakUserId = req.user.id;
        data.modBreakDate = req.body.modBreakDate = new Date().toString();
      } else {
        data.modBreak = '';
				data.modBreakUserId = null;
				data.modBreakDate = null;
      }
    }

		try {
			data.location = JSON.parse(data.location || null);
		} catch(err) {}

    let responseData;
		db.Article
			.authorizeData(data, 'create', req.user)
			.create(data)
			.then(articleInstance => {
				req.results = articleInstance;
        return next();
			})
			.catch(function( error ) {
				// todo: dit komt uit de oude routes; maak het generieker
				if( typeof error == 'object' && error instanceof Sequelize.ValidationError ) {
					let errors = [];
					error.errors.forEach(function( error ) {
						// notNull kent geen custom messages in deze versie van sequelize; zie https://github.com/sequelize/sequelize/issues/1500
						// TODO: we zitten op een nieuwe versie van seq; vermoedelijk kan dit nu wel
						errors.push(error.type === 'notNull Violation' && error.path === 'location' ? 'Kies een locatie op de kaart' : error.message);
					});
					res.status(422).json(errors);
				} else {
					next(error);
				}
			});

	})
	.post(function(req, res, next) {

    // tags
    if (!req.body.tags) return next();

 		let articleInstance = req.results;
		articleInstance
		  .setTags(req.body.tags)
			.then(articleInstance => {
		    // refetch. now with tags
		    let scope = [...req.scope, 'includeTags']
			  return db.Article
				  .scope(...scope)
				  .findOne({
					  where: { id: articleInstance.id, siteId: req.params.siteId }
				  })
				  .then(found => {
					  if ( !found ) throw new Error('Article not found');
					  req.results = found;
		        return next();
				  })
				  .catch(next);
		  })
	})
	.post(function(req, res, next) {
		res.json(req.results);
		mail.sendThankYouMail(req.results, req.user, req.site) // todo: optional met config?
	})

// one article
// --------
router.route('/:articleId(\\d+)')
	.all(function(req, res, next) {
		var articleId = parseInt(req.params.articleId) || 1;

		db.Article
			.scope(...req.scope)
			.findOne({
				where: { id: articleId, siteId: req.params.siteId }
			})
			.then(found => {
				if ( !found ) throw new Error('Article not found');
				req.article = found;
		    req.results = req.article;
				next();
			})
			.catch(next);
	})

// view article
// ---------
	.get(auth.can('Article', 'view'))
	.get(auth.useReqUser)
	.get(function(req, res, next) {
		res.json(req.results);
	})

// update article
// -----------
	.put(auth.useReqUser)
	.put(function(req, res, next) {
    req.tags = req.body.tags;
    return next()
	})
	.put(function(req, res, next) {

    var article = req.results;
    if (!( article && article.can && article.can('update') )) return next( new Error('You cannot update this Article') );

		let data = {
      ...req.body,
		}

    // TODO: dit moet ook nog ergens in auth
    if (auth.hasRole(req.user, 'editor')) {
      if (data.modBreak) {
        data.modBreakUserId = req.body.modBreakUserId = req.user.id;
        data.modBreakDate = req.body.modBreakDate = new Date().toString();
      } else {
        data.modBreak = '';
				data.modBreakUserId = null;
				data.modBreakDate = null;
      }
    }

		article
			.authorizeData(data, 'update')
			.update(data)
			.then(result => {
				req.results = result;
        next()
			})
			.catch(next);
	})
	.put(function(req, res, next) {

    // tags
    if (!req.tags) return next();

    let tagIds = [];
    let responseData;
    let articleInstance = req.results;

		articleInstance
			.setTags(req.tags)
			.then(articleInstance => {
        // refetch. now with tags
        let scope = [...req.scope, 'includeTags']
		    return db.Article
			    .scope(...scope)
			    .findOne({
				    where: { id: articleInstance.id, siteId: req.params.siteId }
			    })
			    .then(found => {
				    if ( !found ) throw new Error('Article not found');
				    req.results = found;
            next();
			    })
			    .catch(next);
	    })

	})
	.put(function(req, res, next) {
		res.json(req.results);
	})

// delete article
// ---------
	.delete(auth.can('Article', 'delete'))
	.delete(function(req, res, next) {
		req.results
			.destroy()
			.then(() => {
				res.json({ "article": "deleted" });
			})
			.catch(next);
	})

module.exports = router;
