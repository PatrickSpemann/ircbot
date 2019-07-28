var request = require("request");
var URL = require("url-parse");

var _clientInfo = undefined;
var _headers = { "Client-ID": "mmq1seoi7p2atbsuvap7vzr1spwx9i" }

//Todo refactor: code re-use
module.exports = function (clientInfo, url) {
    _clientInfo = clientInfo;
    var urlHandled = handleTwitchUrl(new URL(url));
    return urlHandled;
}
function handleTwitchUrl(urlObject) {
    switch (urlObject.hostname) {
        case "go.twitch.tv":
        case "twitch.tv":
            var pathParts = urlObject.pathname.split("/");
            for (var i = 0; i < pathParts.length; i++)
                if (pathParts[i] !== "")
                    request({
                        url: "https://api.twitch.tv/helix/streams?user_login=" + pathParts[i],
                        headers: _headers
                    }, onStreamsResponse);
            return true;
        case "clips.twitch.tv":
            var pathParts = urlObject.pathname.split("/");
            for (var i = 0; i < pathParts.length; i++)
                if (pathParts[i] !== "")
                    request({
                        url: "https://api.twitch.tv/helix/clips?id=" + pathParts[i],
                        headers: _headers
                    }, onClipsResponse);
            return true;
        default:
            return false;
    }
}
function onStreamsResponse(error, response, body) {
    if (!error) {
        try {
            var json = JSON.parse(body);
            if (json.data.length > 0) {
                var stream = json.data[0];
                var title = stream.title;
                var viewers = stream.viewer_count;
                var message = title + " [" + viewers + "]";
                request({
                    url: "https://api.twitch.tv/helix/games?id=" + stream.game_id,
                    headers: _headers
                }, function (error2, response2, body2) {
                    if (!error2) {
                        try {
                            var json2 = JSON.parse(body2);
                            if (json2.data.length > 0) {
                                message += " [" + json2.data[0].name + "]";
                            }
                            _clientInfo.client.say(_clientInfo.channel, message);
                        }
                        catch (e) {

                        }
                    }
                });
            }
        }
        catch (e) {
        }
    }
}
function onClipsResponse(error, response, body) {
    if (!error) {
        try {
            var json = JSON.parse(body);
            if (json.data.length > 0) {
                var clipInfo = json.data[0];
                var message = clipInfo.broadcaster_name + ": " + clipInfo.title + " [" + clipInfo.view_count + "]";

                request({
                    url: "https://api.twitch.tv/helix/games?id=" + clipInfo.game_id,
                    headers: _headers
                }, function (error2, response2, body2) {
                    if (!error2) {
                        try {
                            var json2 = JSON.parse(body2);
                            if (json2.data.length > 0) {
                                message += " [" + json2.data[0].name + "]";
                            }
                            _clientInfo.client.say(_clientInfo.channel, message);
                        }
                        catch (e) {

                        }
                    }
                });
            }
        }
        catch (e) {
        }
    }
}