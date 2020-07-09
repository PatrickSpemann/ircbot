const util = require("util");
const request = require("request");
const requestPostP = util.promisify(request.post);
const URL = require("url-parse");

var _clientInfo = undefined;
var _clientID = undefined;
var _clientSecret = undefined;
var _auth = undefined;

//Todo refactor: code re-use
module.exports = {
    initCredentials,
    handleTwitchUrl
}

function initCredentials (options) {
    if (!options.twitchClientID || !options.twitchClientSecret)
        console.log("Twitch API: missing credentials in settings.")
    _clientID = options.twitchClientID;
    _clientSecret = options.twitchClientSecret;
}

function handleTwitchUrl(clientInfo, url) {
    _clientInfo = clientInfo;
    var urlObject = new URL(url);
    var path = urlObject.pathname.split("/")[1];
    if (!path || path === "")
        return false;

    switch (urlObject.hostname) {
        case "go.twitch.tv":
        case "twitch.tv":
            sendRequest("https://api.twitch.tv/helix/streams?user_login=" + path, onStreamsResponse);
            return true;
        case "clips.twitch.tv":
            sendRequest("https://api.twitch.tv/helix/clips?id=" + path, onClipsResponse);
            return true;
        default:
            return false;
    }
}

function sendRequest(url, callback) {
    request({
        url: url,
        headers: getRequestHeaders()
    }, callback);
}

function getRequestHeaders() {
    return {
        "Authorization": _auth,
        "Client-ID": _clientID
	}
}

function onStreamsResponse(error, response, body) {
        try {
            var json = JSON.parse(body);
            if (json.error) {
                console.log("Twitch API: " + json.message);
                if (json.status === 401) // Unauthorized
                    requestAccessToken().then(() => sendRequest(response.request.href, onStreamsResponse)).catch(() => {});
                return;
            }
            if (json.data.length > 0) {
                var stream = json.data[0];
                var title = stream.title;
                var viewers = stream.viewer_count;
                var message = title + " [" + viewers + "]";
                request({
                    url: "https://api.twitch.tv/helix/games?id=" + stream.game_id,
                    headers: getRequestHeaders()
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
function onClipsResponse(error, response, body) {
    try {
        var json = JSON.parse(body);
        if (json.error) {
            console.log("Twitch API: " + json.message);
            if (json.status === 401) // Unauthorized
                requestAccessToken().then(() => sendRequest(response.request.href, onClipsResponse)).catch(() => {});
            return;
        }
        if (json.data.length > 0) {
            var clipInfo = json.data[0];
            var message = clipInfo.broadcaster_name + ": " + clipInfo.title + " [" + clipInfo.view_count + "]";

            request({
                url: "https://api.twitch.tv/helix/games?id=" + clipInfo.game_id,
                headers: getRequestHeaders()
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

function requestAccessToken() {
    return requestPostP({
        url: "https://id.twitch.tv/oauth2/token?client_id=" + _clientID,
        form: {client_secret: _clientSecret, grant_type: "client_credentials"},
        headers: {"content-type": "application/json"}
    }).then((response, body) => setAccessToken(response, body)).catch((error) => {});
}

function setAccessToken(response, body) {
    var json = JSON.parse(response.body);
    if (response.statusCode !== 200) {
        console.log("Twitch API: " + json.message);
        return;
    }
    _auth = "Bearer " + json.access_token;
}