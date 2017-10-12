var request = require("request");
var URL = require("url-parse");

var _clientInfo = undefined;
var _twitchChannel = undefined;
var _headers = {"Client-ID": "mmq1seoi7p2atbsuvap7vzr1spwx9i"}

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
        headers: _headers
    }, onTwitchResponse);
}
function onTwitchResponse(error, response, body) {
    if (!error) {
        try {
            var json = JSON.parse(body);
            if (json.data.length > 0) {
                var stream = json.data[0];
                var title = stream.title;
                var viewers = stream.viewer_count;
                var message = _twitchChannel + ": " + title + " [" + viewers + "]";

                var gameName = _gameMap[stream.game_id];
                if (gameName) {
                    message += " [" + gameName + "]"
                }
                _clientInfo.client.say(_clientInfo.channel, message);
            }
        }
        catch (e) {
        }
    }
}

const _gameMap = {};
setGames(_gameMap);

function setGames(gameMap) {
    return request({
        url: "https://api.twitch.tv/kraken/games/top?limit=100",
        headers: _headers
    }, function(error, response, body) {
        let topGames = JSON.parse(body);
        topGames.top.forEach(entry => gameMap[entry.game._id] = entry.game.name);
    })
}