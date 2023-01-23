const { Sequelize, Op } = require('sequelize');
const log = require('debug')('app:cron');
const config = require('config');
const Notifications = require('../notifications');
const db = require('../db');
const UseLock = require('../lib/use-lock');
const sitesWithIssues = require('../services/sites-with-issues');

// Purpose
// -------
// Send emails to projectmanagers just before the enddate of their project is reached
// 
// Runs every day
module.exports = {
  // cronTime: '*/10 * * * * *',
  // runOnInit: true,
  cronTime: '0 15 4 * * *',
  runOnInit: false,
  onTick: UseLock.createLockedExecutable({
    name: 'send-site-issues-notifications',
    task: async (next) => {

      try {

        let notificationsToBeSent = {};

        // sites that should be ended but are not
        let result = await sitesWithIssues.shouldHaveEndedButAreNot({});
        let shouldHaveEndedButAreNot = result.rows;

        // for each site
        for (let i=0; i < shouldHaveEndedButAreNot.length; i++) {
          let site = shouldHaveEndedButAreNot[i];
          if (!site.adminIsNotified || site.adminIsNotified.getTime() < Date.now() - 23 * 60 * 60 * 1000) {
            if (!notificationsToBeSent[ site.id ]) notificationsToBeSent[ site.id ] = { site, messages: [] };
            notificationsToBeSent[ site.id ].messages.push(`Site ${ site.title } (${ site.domain }) has an endDate in the past but projectHasEnded is not set.`);
          }
        }

        // sites that have ended but are not anonymized
        result = await sitesWithIssues.endedButNotAnonymized({})
        let endedButNotAnonymized = result.rows;

        // for each site
        for (let i=0; i < endedButNotAnonymized.length; i++) {
          let site = endedButNotAnonymized[i];
          if (!site.adminIsNotified || site.adminIsNotified.getTime() < Date.now() - 23 * 60 * 60 * 1000) {
            if (!notificationsToBeSent[ site.id ]) notificationsToBeSent[ site.id ] = { site, messages: [] };
            notificationsToBeSent[ site.id ].messages.push(`Project ${ site.title } (${ site.domain }) has ended but is not yet anonymized.`);
          }
        }

        // aggregate notifications to the same address
        let aggregatedNotificationsToBeSent = [];
        Object.keys(notificationsToBeSent).forEach(id => {
          let target = notificationsToBeSent[ id ];
          let toAddress = target.site.config.notifications.siteadminAddress || target.site.config.notifications.projectmanagerAddress;
          if ( aggregatedNotificationsToBeSent[ toAddress ] ) {
            aggregatedNotificationsToBeSent[ toAddress ].data.template += '<br/>\r\n' + target.messages.join('<br/>\r\n');
          } else {
            aggregatedNotificationsToBeSent[ toAddress ] = {
              site: target.site,
              data: {
                from: target.site.config.notifications.fromAddress,
                to: toAddress,
                subject: 'Sites with issues',
                template: target.messages.join('<br/>\r\n'),
              }
            };
          }
          target.site.update({ adminIsNotified: new Date() })
        });

        // send notifications
        Object.values(aggregatedNotificationsToBeSent).forEach(target => {
          Notifications.sendMessage({ site: target.site, data: target.data });
        })

        return next();

      } catch (err) {
        console.log('error in send-site-issues-notifications cron');
        next(err); // let the locked function handle this
      }
      
    }
  })

};

