const config = require('config');
const fuzzysort = require('fuzzysort');

//middleware for adding search to
module.exports = function( req, res, next ) {
  let { dbQuery } = req;
  let { search } = dbQuery;

  if (search) {
    let list = res.results;
    // console.log(res.results)

    if ( !Array.isArray(search) ) search = [ search ];

    let results = [];
    search.forEach((criterium) => {
      let searchFields = Object.keys(criterium)[0];
      let value = criterium[key];

      let searchResult = fuzzysort.go(value, list, {
        threshold: -300, // todo: volkomen arbitrair; misschien moet je hem kunnen meesturen
        keys: searchFields,
      });

      results.push( searchResult );



      //// -- -->



      // todo: optional { fields: [], value: '' } construct


      let searchFields;
      switch (key) {

        case 'text':
          searchFields = ['title', 'summary', 'description', 'niels'];
        case 'title':
        case 'summary':
        case 'description':
          searchFields = searchFields || [ key ];
          let searchResult = fuzzysort.go(value, list, {
            threshold: -300, // todo: volkomen arbitrair; misschien moet je hem kunnen meesturen
            keys: searchFields,
          });

          results.push( searchResult );
          break;

        default:
      }
    });

    // mergen van de resultaten
    // TODO: dit is heel dom en bot en (dus) traag; denk er eens echt over na
    let merged = [];
    if (results.length == 1) {
      merged = results[0];
    } else {
      if (search.options.andOr == 'and') {

        merged = [];
        for (let i=0; i<results.length; i++) {
          results[i].map( result => {

            let foundScore = -10000000000000;
            for (let j=i+1; j<results.length; j++) {
              let found = results[j].find( elem => elem.obj.id == result.obj.id );
              if (found && foundScore) {
                foundScore = Math.max(foundScore, found.score);
              } else {
                foundScore = undefined;
              }
            }

            if (foundScore && foundScore != -10000000000000) {
              // use highest score
              result.score = Math.max(result.score, foundScore);
              let found = merged.find( elem => elem.obj.id == result.obj.id );
              if (!found) {
                merged.push(result)
              }
            }

          })
        }
      } else {
        merged = [];
        for (let i=0; i<results.length; i++) {
          results[i].map( result => {
            let found = merged.find( elem => elem.obj.id == result.obj.id );
            if (found) {
              // use highest score
              found.score = Math.max(found.score, result.score)
            } else {
              merged.push(result)
            }
          })
        }
      }

    }

    merged = merged.sort( (a,b) => b.score - a.score )
    merged = merged.map(elem => elem.obj);

    req.results = merged

    return next();
  }

  next();
}
