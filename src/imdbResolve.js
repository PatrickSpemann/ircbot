var utils = require("./ircbot-utils");
var URL = require("url-parse");
var IMDB = require("imdb");

var _clientInfo = undefined;

module.exports = function (clientInfo, url) {
    _clientInfo = clientInfo;
    var imdbId = getImdbId(new URL(url));
    if (imdbId)
        IMDB(imdbId, onImdbResult);
}
function getImdbId(urlObject) {
    if (urlObject.hostname !== "imdb.com")
        return undefined;
    var pathElements = urlObject.pathname.split("/");
    for (var i = 0; i < pathElements.length; i++) {
        if (pathElements[i].indexOf("tt") === 0)
            return pathElements[i];
    }
    return undefined;
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
    _clientInfo.client.say(_clientInfo.channel, title + " (" + year + ") Rating: " + rating);
}