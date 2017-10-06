var request = require("request");
var cheerio = require("cheerio");
var URL = require("url-parse");

var _clientInfo = undefined;
var _lastUrl = undefined;

module.exports = function (clientInfo, url) {
    _clientInfo = clientInfo;
    _lastUrl = new URL(url);
    request(url, requestResponse);
    return true;
}
function requestResponse(error, response, body) {
    if (error || response.statusCode !== 200)
        return;
    body = body.replace(/(\r\n|\n|\r)/gm, '').replace(/ +(?= )/g, '')
    $ = cheerio.load(body);
    var title = $("title").text().trim();
    if (_lastUrl && _lastUrl.hostname.indexOf(title.toLowerCase()) === -1)
        _clientInfo.client.say(_clientInfo.channel, "Title: " + title);
}
