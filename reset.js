const config  = require('config');
process.env.DEBUG = config.logging;

const datafile = process.env.NODE_ENV || 'development';
const db = require('./src/db');

// check for force flag '-f' on commandline to force sync, like: node reset.js -f
const force = process.argv.includes('-f')

async function doReset() {

  try {

    console.log('Syncing...');

    await db.sequelize.sync({force})

    console.log('Adding default data...');
	  await require(`./fixtures/${datafile}`)(db);

  } catch (err) {
    console.log(err);
  } finally {
	  db.sequelize.close();
  }
  
}

doReset();
