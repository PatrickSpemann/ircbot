const util = require("util");
const request = require("request");
const requestP = util.promisify(request);
const requestPostP = util.promisify(request.post);
const URL = require("url-parse");

const ip = require("ip");
const express = require("express");
const express_app = express();
const port = 80;

var _clientInfo = undefined;
var _clientID = undefined;
var _clientSecret = undefined;
var _auth = undefined;

module.exports = {
    initCredentials,
    handleTwitchUrl
}

function initCredentials (options) {
    if (!options.twitchClientID || !options.twitchClientSecret)
        console.log("Twitch API: missing credentials in settings.")
    _clientID = options.twitchClientID;
    _clientSecret = options.twitchClientSecret;

    initExp();
}

function initExp() {
    express_app.get("/", (req, res) => console.log("get received"));
    express_app.post("/", (req, res) => console.log("post received"));
    express_app.listen(port, () => console.log("Listening on port: " + port));
    subscribe("raizqt");
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


function subscribe(channel) {
    sendRequest("https://api.twitch.tv/helix/streams?user_login=" + channel, getUserId);
}

function getUserId(error, response, body) {
    console.log(ip.address());
    console.log("userid\n" + JSON.stringify(response));
    let stream = getResponseData(error, response, body, getUserId);
    if (!stream)
        return;
    request.post({
        url: "https://api.twitch.tv/helix/webhooks/hub",
        form: {
            "hub.callback": "http://" + ip.address(),
            "hub.mode": "subscribe",
            "hub.topic": "https://api.twitch.tv/helix/streams?user_id=" + stream.user_id,
            "hub.lease_seconds": 600,
            "hub.secret": "lmao"
        },
        headers: getRequestHeaders()
    }, function (error, response, body) {
    console.log("response:\n" + JSON.stringify(response));
    if (response.statusCode !== 202) {
        console.log("Twitch API - failed to subscribe to channel: " + stream.user_name + ", " + JSON.parse(body).message);
        } 
    });

}

function verifyResponse(error, request, body) {
    // TODO express handler
    console.log("request:\n" + JSON.stringify(request));
    if (body.reason)
        console.log("sub denied: reason " + body.reason);
    else
    request.response({
        statusCode: 200,
        challenge: body.challenge,
        headers: {"content-type": "text/plain"}
        });
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
    var stream = getResponseData(error, response, body, onStreamsResponse);
    if (!stream)
        return;
    var message = stream.title + " [" + stream.viewer_count + "]";
    postMessageWithGameCategory(stream.game_id, message);
}

function onClipsResponse(error, response, body) {
    var clipInfo = getResponseData(error, response, body, onClipsResponse);
    if (!clipInfo)
        return;
    var message = clipInfo.broadcaster_name + ": " + clipInfo.title + " [" + clipInfo.view_count + "]";
    postMessageWithGameCategory(clipInfo.game_id, message);
}

function getResponseData(error, response, body, errorCallback=undefined) {
    try {
        var json = JSON.parse(body);
        if (json.error && errorCallback)
            handleResponseError(response, json, errorCallback);            
        else
            return json.data[0];
    }
    catch (e) {
        console.log(e.message);
    }    
}

function postMessageWithGameCategory(game_id, message) {
    sendRequest("https://api.twitch.tv/helix/games?id=" + game_id, (error, response, body) => {
        var category = getResponseData(error, response, body);
        if (category)
		    message += " [" + category.name + "]";
		_clientInfo.client.say(_clientInfo.channel, message);
	});
}

function handleResponseError(response, bodyAsJson, callback) {
    console.log("Twitch API - request failed: " + bodyAsJson.message);
    if (bodyAsJson.status === 401) // Unauthorized - request a new access token and resend the original request
        requestAccessToken().then(() => sendRequest(response.request.href, callback)).catch((error) => console.log(error));
}

function requestAccessToken() {
    return requestPostP({
        url: "https://id.twitch.tv/oauth2/token?client_id=" + _clientID,
        form: {client_secret: _clientSecret, grant_type: "client_credentials"},
        headers: {"content-type": "application/json"}
    }).then((response, body) => setAccessToken(response, body));
}

function setAccessToken(response, body) {
    var json = JSON.parse(response.body);
    if (response.statusCode !== 200)
        throw "Twitch API - failed to set access token: " + json.message;
    _auth = "Bearer " + json.access_token;
}