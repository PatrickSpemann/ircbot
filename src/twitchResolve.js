const util = require("util");
const request = require("request");
const requestP = util.promisify(request);
const requestPostP = util.promisify(request.post);
const URL = require("url-parse");
const path = require("path");
const schedule = require("node-schedule");

const ip = require("ip");
const express = require("express");
const expressApp = express();
const port = 80;
const _callbackBaseUrl = "http://6fa1c55e69df.ngrok.io";

var _clientInfo = undefined;
var _clientID = undefined;
var _clientSecret = undefined;
var _auth = undefined;

module.exports = {
    initCredentials,
    handleTwitchUrl,
    handleSubscription
}

function initCredentials(clientInfo, options) {
    _clientInfo = clientInfo;
    if (!options.twitchClientID || !options.twitchClientSecret)
        console.log("Twitch API: missing credentials in settings.")
    _clientID = options.twitchClientID;
    _clientSecret = options.twitchClientSecret;

    initExp();
}

let knownLiveStreams = {};
let pendingResubs = new Map();
let pendingCommands = new Map();

function scheduleResub(userId, lease_seconds) {
    console.log("entered resub");
    if (!pendingResubs.has(userId))
        return;
    console.log("resubbing...");
    let stream = pendingResubs.get(userId);
    var time = Date.now() + lease_seconds * 1000;
    schedule.scheduleJob(time, () => subscribe(stream.login));
    pendingResubs.delete(userId);
}

function initExp() {
    expressApp.use(express.json());
    expressApp.get("/*", (req, res) => {
        console.log("get received");
        console.log(req.query);
        try {
            const requestId = req.path.split("/")[1];
            if (!requestId)
                throw "No request id";
            const mode = req.query["hub.mode"];
            switch (mode) {
                case "denied":
                    console.log("Twitch API - subscription denied, reason: " + req.query["hub.reason"]);
                    postPendingCommandHandledMessage(requestId, `Failed to (un)subscribe: ${req.query["hub.reason"]}`);
                    break;
                case "subscribe":
                    scheduleResub(requestId, req.query["hub.lease_seconds"]);
                    // fall-through
                case "unsubscribe":
                    postPendingCommandHandledMessage(requestId, `Successfully ${mode}d.`)
                    res.status(200).type('text/plain').send(req.query["hub.challenge"]);
                    break;
                default:
                    throw "Unexpected mode: " + mode;
            }
        } catch (e) {
            console.log("failed handling get: ", e.message);
            res.status(500).send();
        }
    });

    expressApp.post("/*", (req, res) => {
        console.log("post received");
        console.log(req.body);
        try {
            const data = req.body.data[0];
            const requestId = req.path.split("/")[1];
            if (!requestId)
                throw "No request id";
            // post a going live message if the user wasn't live before
            if (data && data.type === "live" && (!knownLiveStreams[requestId] || knownLiveStreams[requestId].type !== "live"))
                _clientInfo.channels.forEach(channel => _clientInfo.client.say(channel, data.user_name + " just went live!"));
            knownLiveStreams[requestId] = data;
            res.status(200).send();
        } catch (e) {
            console.log("failed handling post: ", e);
            res.status(500).send();
        }
    });

    expressApp.listen(port, () => console.log("Listening on port: " + port));
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

function handleSubscription(clientInfo, mode, params) {
    console.log(params);
    _clientInfo = clientInfo;
    const userLogin = params.split(" ")[0];
    if (!userLogin) {
        _clientInfo.client.say(_clientInfo.channel, `Usage: !${mode} <channelName>`);
        return;
    }

    pendingCommands.set(userLogin.toLowerCase(), clientInfo);

    switch (mode) {
        case "subscribe":
            subscribe(userLogin, true);
            break;
        case "unsubscribe":
            unsubscribe(userLogin);
            break;
        default:
            console.log("Twitch API - Unknown subscription mode.");
            break;
    }
}

function subscribe(userLogin) {
    sendRequest("https://api.twitch.tv/helix/users?login=" + userLogin, onSubscriptionResponse);
}

function unsubscribe(userLogin) {
    sendRequest("https://api.twitch.tv/helix/users?login=" + userLogin, onUnsubscriptionResponse);
}

function onSubscriptionResponse(error, response, body) {
    sendSubscriptionRequest(error, response, body, "subscribe", onSubscriptionResponse);
}

function onUnsubscriptionResponse(error, response, body) {
    sendSubscriptionRequest(error, response, body, "unsubscribe", onUnsubscriptionResponse);
}

function sendSubscriptionRequest(error, response, body, mode, callback) {
    console.log("userid\n", JSON.stringify(response));
    let stream = getResponseData(error, response, body, callback);
    if (!stream)
        return;
        
    if (!pendingResubs.has(stream.id))
        pendingResubs.set(stream.id, stream);

    const loginToLower = stream.login.toLowerCase();
    if (pendingCommands.has(loginToLower)) {
        pendingCommands.set(stream.id, pendingCommands.get(loginToLower));
        pendingCommands.delete(loginToLower);
    }

    const url = new URL(`/${stream.id}`, _callbackBaseUrl);
    console.log("path\n", url.href);
    request.post({
        url: "https://api.twitch.tv/helix/webhooks/hub",
        form: {
            "hub.callback": url.href,
            "hub.mode": mode,
            "hub.topic": "https://api.twitch.tv/helix/streams?user_id=" + stream.id,
            "hub.lease_seconds": 10, // max 864000
            "hub.secret": "lmao"
        },
        headers: getRequestHeaders()
    }, function (error, response, body) {
        console.log("stream\n", stream);
        if (response.statusCode === 202)
            knownLiveStreams[stream.id] = stream;
        else {
            console.log("Twitch API - failed to subscribe to channel: " + stream.login + ", " + JSON.parse(body).message);
            postPendingCommandHandledMessage(stream.id, `Failed to ${mode}.`)
        }
    });
}

function postPendingCommandHandledMessage(streamId, message) {
    if (pendingCommands.has(streamId)) {
        const clientInfo = pendingCommands.get(streamId)
        clientInfo.client.say(clientInfo.channel, message);
        pendingCommands.delete(streamId);
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

function getResponseData(error, response, body, errorCallback = undefined) {
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
        form: { client_secret: _clientSecret, grant_type: "client_credentials" },
        headers: { "content-type": "application/json" }
    }).then((response, body) => setAccessToken(response, body));
}

function setAccessToken(response, body) {
    var json = JSON.parse(response.body);
    if (response.statusCode !== 200)
        throw "Twitch API - failed to set access token: " + json.message;
    _auth = "Bearer " + json.access_token;
}