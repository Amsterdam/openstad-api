const hasRole = require('../lib/hasRole');

module.exports = function toAuthorizedJSON(user) {

  let self = this;
  let isValidHash = self.hash === self.queryHash;

  if (!self.rawAttributes) return {};
  if (typeof user != 'object') user = undefined;
  if (!user) user = self.auth && self.auth.user;
  if (!user || !user.role) user = { role: 'all' };
  console.log('toAuthorizedJSON toAuthorizedJSON', self.queryHash)

  console.log(' self.hash',  self.hash)
  console.log(' hash',  self.queryHash)

  console.log('lets be real isValidHash', isValidHash)

  if (!self.can('view', user, self, self.queryHash)) return {};

  console.log('woop')

  let keys = self._options.attributes || Object.keys( self.dataValues );
  keys = keys.concat( Object.keys(self).filter( key => key != 'dataValues' && !key.match(/^_/) ) );

  let result = {};
  keys.forEach((key) => {

    let value = self.get(key);
    console.log('validate key', key)

    if (key == 'id') {
      // todo: primary keys, not id
      result[key] = value;
    } else {
      result[key] = authorizedValue(key, value, user, isValidHash);
    }

  });

  if ( self.auth && self.auth.toAuthorizedJSON ) {
    result = self.auth.toAuthorizedJSON(user, result, self);
  }

  return Object.keys(result).length ? result : undefined;

  function authorizedValue(key, value, user, isValidHash) {

    if (value && value.toJSON) {
      // TODO: for associated models this should use the association key to check the validity
      return value.toJSON(user);
    }



    if (Array.isArray(value)) {
      let aresult = [];
      aresult = value.map(val => {
        return authorizedValue(key, val, user, isValidHash);
      });

      return aresult.length ? aresult : undefined;
    }

    let testRole;
    if (self.rawAttributes[key] && self.rawAttributes[key].auth) {
      if (self.rawAttributes[key].auth.authorizeData) {
        return self.rawAttributes[key].auth.authorizeData(null, 'view', user, self, self.site, isValidHash);
      } else {
        // todo: waarom loopt dit niet via authorizeData
        testRole = self.rawAttributes[key].auth.viewableBy;
        if (Array.isArray(testRole) ? testRole.includes('detailsViewableByRole') : testRole == 'detailsViewableByRole') {
          if (self.detailsViewableByRole) {
            testRole = self.detailsViewableByRole;
          }
        }
      }
    }
    testRole = testRole || ( self.auth && self.auth.viewableBy );

    console.log('user', user);
    console.log('testRole', testRole);
    console.log('self.userId', self.userId);
    console.log('isValidHash', isValidHash);

    if ( hasRole(user, testRole, self.userId, isValidHash)) {
      return value;
    }

  }

}
