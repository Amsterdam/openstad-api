const config = require('config');
const fuzzysort = require('fuzzysort');

//middleware for adding search to
module.exports = function( req, res, next ) {
  let { dbQuery } = req;
  let { search } = dbQuery;

  if (search) {
    let list = req.results;

    if ( !Array.isArray(search) ) search = [ search ];

    let results = [];
    search.forEach((searchObject) => {
      let searchResult = fuzzysort.go(searchObject.needle, list, {
        threshold: req.threshold || -300,
        keys: searchObject.haystack,
      });

      searchResult.forEach((result) => {
        results.push( result.obj );
      })
    });

    req.results = results.slice(search.offset, search.limit);

    return next();
  }
  next();
}
// mergen van de resultaten
// TODO: dit is heel dom en bot en (dus) traag; denk er eens echt over na
// let merged = [];
// if (results.length == 1) {
//   merged = results[0];
// } else {
//   if (search.options.andOr == 'and') {
//
//     merged = [];
//     for (let i=0; i<results.length; i++) {
//       results[i].map( result => {
//
//         let foundScore = -10000000000000;
//         for (let j=i+1; j<results.length; j++) {
//           let found = results[j].find( elem => elem.obj.id == result.obj.id );
//           if (found && foundScore) {
//             foundScore = Math.max(foundScore, found.score);
//           } else {
//             foundScore = undefined;
//           }
//         }
//
//         if (foundScore && foundScore != -10000000000000) {
//           // use highest score
//           result.score = Math.max(result.score, foundScore);
//           let found = merged.find( elem => elem.obj.id == result.obj.id );
//           if (!found) {
//             merged.push(result)
//           }
//         }
//
//       })
//     }
//   } else {
//     merged = [];
//     for (let i=0; i<results.length; i++) {
//       results[i].map( result => {
//         let found = merged.find( elem => elem.obj.id == result.obj.id );
//         if (found) {
//           // use highest score
//           found.score = Math.max(found.score, result.score)
//         } else {
//           merged.push(result)
//         }
//       })
//     }
//   }
//
// }
//
// merged = merged.sort( (a,b) => b.score - a.score )
// merged = merged.map(elem => elem.obj);
//
