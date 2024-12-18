var _            = require('lodash')
  , config       = require('config')
  , express      = require('express');

// Misc
var util         = require('./util');
var log          = require('debug')('app:http');
const morgan     = require('morgan')

var reportErrors = config.sentry && config.sentry.active;

const { setupPoolRefresh, getPool } = require('./db-mysql-raw-sql')

module.exports  = {
	app: undefined,

	init: async function() {
      log('initializing...');

      // var Raven       = require('../config/raven');
      var compression = require('compression');
      // var cors        = require('cors');

      this.app = express();
      this.app.disable('x-powered-by');
      this.app.set('trust proxy', true);
      this.app.set('view engine', 'njk');
      this.app.set('env', process.env.NODE_APP_INSTANCE || 'development');

      if (process.env.REQUEST_LOGGING === 'ON') {
        this.app.use(morgan('dev'));
      }

      if( reportErrors ) {
          // this.app.use(Raven.requestHandler());
      }
      this.app.use(compression());

  //  this
      // this.app.use(cors());

      // Register statics first...
      this._initStatics();

      // ... then middleware everyone needs...
      this._initBasicMiddleware();
      this._initSessionMiddleware();
    
      var middleware = config.express.middleware;

      middleware.forEach(( entry ) => {
          if (typeof entry == 'object' ) {
              // nieuwe versie: use route
              this.app.use(entry.route, require(entry.router));
          } else {
              // oude versie: de file doet de app.use
              require(entry)(this.app);
          }
      });

      if( reportErrors ) {
          // this.app.use(Raven.errorHandler());
      }

      require('./middleware/error_handling')(this.app);

      const gracefulShutdownPool = (signal) => {
        console.log(`Received signal ${signal}, closing MySQL connection pool`);
        const mysqlConnectionPool = getPool();
        mysqlConnectionPool.end((err) => {
          if (err) {
            console.error(err);
          }
          console.log('MySQL connection pool closed');
          process.exit(0);
        })
      }

      try {
        const passwordExpirationInterval = process.env.MYSQL_PASSWORD_ROTATION_INTERVAL_MS ?? 30 * 60 * 1000
        await setupPoolRefresh(passwordExpirationInterval)
        console.log('MySQL connection pool created');

        process.on('SIGINT', gracefulShutdownPool);
        process.on('SIGTERM', gracefulShutdownPool);
        process.on('SIGQUIT', gracefulShutdownPool);
      } catch (e) {
        console.log('Failed to create MySQL connection pool', e)
      }
	},

	start: function( port ) {
		this.app.listen(port, function() {
		  log('listening on port %s', port);
		});
	},

	_initStatics: function() {


		var headerOptions = {
			setHeaders: function( res ) {
				res.set({
					'Cache-Control': 'private'
				});
			}
		};

    this.app.use(express.static('public'));

	//	this.app.use('/js',  express.static('js', headerOptions));
	},
	_initBasicMiddleware: function() {
		var bodyParser         = require('body-parser');
		var methodOverride     = require('method-override');

		// Middleware to fill `req.site` with a `Site` instance.
		const reqSite = require('./middleware/site');
		this.app.use(reqSite);

		this.app.use(require('./middleware/security-headers'));

		this.app.use(bodyParser.json({limit: '10mb'}));
		this.app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));
		this.app.use(methodOverride(function( req, res ) {
			var method;
			if( req.body && req.body instanceof Object && '_method' in req.body ) {
				method = req.body._method;
				delete req.body._method;
			} else {
				method = req.get('X-HTTP-Method') ||
				         req.get('X-HTTP-Method-Override') ||
				         req.get('X-Method-Override');
			}
			if( method ) {
				log('method override: '+method);
			}
			return method;
		}));
	},
  _initSessionMiddleware: function() {
    // Middleware to fill `req.user` with a `User` instance.
    const getUser = require('./middleware/user');
    this.app.use(getUser);
  },
};
