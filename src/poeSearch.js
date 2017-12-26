var request = require("request");

const basicSearchUrl = "https://pathofexile.gamepedia.com/api.php?action=opensearch&format=json&search=";
const titleSearchUrl = "https://pathofexile.gamepedia.com/api.php?action=query&list=search&format=json&srsearch=";

var _clientInfo = undefined;
var _searchString = "";
var _secondAttempt = false;

module.exports = function (clientInfo, searchString) {
    _clientInfo = clientInfo;
    _secondAttempt = false;
    _searchString = encodeURI(searchString);
    var url = basicSearchUrl + _searchString;
    request(url, onPoeResponse);
}

function onPoeResponse(error, response, body) {
    if (!error) {
        try {
            var json = JSON.parse(body);
            var lastArray = json[json.length - 1];
            var url = lastArray[0];
            if (url)
                _clientInfo.client.say(_clientInfo.channel, url);
            else if (!_secondAttempt)
                titleSearch();
        }
        catch (e) {
        }
    }
}

function titleSearch() {
    var url = titleSearchUrl + _searchString;
    request(url, onTitleSearchResponse);
}

function onTitleSearchResponse(error, response, body) {
    if (!error) {
        try {
            var json = JSON.parse(body);
            if (json.query && json.query.search.length > 0) {
                var result = json.query.search[0].title;
                var url = basicSearchUrl + encodeURI(result);
                _secondAttempt = true;
                request(url, onPoeResponse);
            }
        }
        catch (e) {
        }
    }
}