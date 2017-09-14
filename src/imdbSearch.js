var IMDB = require("imdb");

var _clientInfo = undefined;
var _lastImdbId = undefined;

module.exports = function (clientInfo, searchString) {
    _clientInfo = clientInfo;
    IMDB.search(searchString, onImdbSearchResult);
}
function onImdbSearchResult(error, result) {
    if (error)
        console.log(error);
    else {
        _lastImdbId = result.id;
        if (_lastImdbId !== "N/A")
            IMDB(_lastImdbId, onImdbResult);
    }
}
function onImdbResult(error, result) {
    if (error)
        console.log(error);
    else
        processImdbResult(result);
}
function processImdbResult(result) {
    var title = result.originalTitle !== "N/A" ? result.originalTitle : result.title;
    var year = result.year;
    var rating = result.rating;
    _clientInfo.client.say(_clientInfo.channel, title + " (" + year + ") Rating: " + rating + " http://www.imdb.com/title/" + _lastImdbId);
}