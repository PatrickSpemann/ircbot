var request = require("request");
var URL = require("url-parse");

var _clientInfo = undefined;
var _twitchChannel = undefined;

module.exports = function (clientInfo, url) {
    _clientInfo = clientInfo;
    _twitchChannel = getTwitchChannel(new URL(url));
    if (_twitchChannel)
        makeApiCall(_twitchChannel);
    return _twitchChannel;
}
function getTwitchChannel(urlObject) {
    if (urlObject.hostname === "go.twitch.tv" || urlObject.hostname === "twitch.tv") {
        var pathParts = urlObject.pathname.split("/");
        for (var i = 0; i < pathParts.length; i++)
            if (pathParts[i] !== "")
                return pathParts[i];
    }
    return undefined;
}
function makeApiCall(channel) {
    request({
        url: "https://api.twitch.tv/helix/streams?user_login=" + channel,
        headers: {
            "Client-ID": "mmq1seoi7p2atbsuvap7vzr1spwx9i"
        }
    }, onTwitchResponse);
}
function onTwitchResponse(error, response, body) {
    if (!error) {
        try {
            var json = JSON.parse(body);
            if (json.data.length > 0) {
                var title = json.data[0].title;
                var viewers = json.data[0].viewer_count;
                _clientInfo.client.say(_clientInfo.channel, _twitchChannel + ": " + title + " [" + viewers + "]");
            }
        }
        catch (e) {
        }
    }
}