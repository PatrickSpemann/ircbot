var request = require("request");

var apiKey = "AIzaSyAZBBM385fHBqisa08eHpXABjGzyNB07vg";
var searchUrl = "https://www.googleapis.com/customsearch/v1?&cx=014923301120244368640%3Atlcrb8ryaey&safe=off&num=1&key=" + apiKey + "&q=";

var _clientInfo = undefined;
var _searchString = "";

module.exports = function (clientInfo, imageSearch, searchString) {
    _clientInfo = clientInfo;
    _searchString = encodeURI(searchString);
    var url = searchUrl + _searchString;
    if (imageSearch)
        url += "&searchType=image";
    request(url, onGoogleResponse);
}

function onGoogleResponse(error, response, body) {
    if (!error) {
        try {
            var json = JSON.parse(body);
            if (json.items.length > 0) {
                var firstResult = json.items[0];
                var url = firstResult.link;
                _clientInfo.client.say(_clientInfo.channel, url);
            }
        }
        catch (e) {
        }
    }
}
