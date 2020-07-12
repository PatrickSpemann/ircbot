const util = require("util");
const request = require("request");
const requestPostP = util.promisify(request.post);
const URL = require("url-parse");
const schedule = require("node-schedule");
const fs = require("fs-extra");

const ip = require("ip");
const express = require("express");
const expressApp = express();
const crypto = require("crypto");
const port = 80;
const _callbackBaseUrl = "http://4e9e6bf43e90.ngrok.io";

const subsFilePath = "./twitchSubs.json";

var _clientInfo = undefined;
var _clientID = undefined;
var _clientSecret = undefined;
var _auth = undefined;

module.exports = {
    initCredentials,
    handleTwitchUrl,
    handleSubscription,
    listActiveSubscriptions
};

function initCredentials(clientInfo, options) {
    _clientInfo = clientInfo;
    if (!options.twitchClientID || !options.twitchClientSecret)
        console.log("Twitch API: missing credentials in settings.")
    _clientID = options.twitchClientID;
    _clientSecret = options.twitchClientSecret;

    initExp();
    restoreSubscriptions();
}

// TODO rate limits
// TODO subs may be temporarily lost if ip changes

let knownLiveStreams = {};
let pendingResubs = new Map();
let pendingCommands = new Map();

function restoreSubscriptions() {
    // we only immediately resubscribe if the old subscription has expired, this does mean we may lose some events if the callback url changed
	try {
        let subData = fs.readJsonSync(subsFilePath);
        for (let channelName in subData) {
            const channelInfo =subData[channelName];
            if (channelInfo.time < Date.now())
                subscribe(channelName);
            else
                scheduleResub(channelInfo.time, channelInfo.id, channelName);
        }
	}
	catch (e) {
		console.log("no twitch subscriptions to restore");
	}
}
function saveSubscriptionToFile(time, id, channelName) {
	try {
        let subData = fs.readJsonSync(subsFilePath, {throws: false});
        if (!subData)
            subData = {};
        subData[channelName] = {id: id, time: time };
		fs.writeJsonSync(subsFilePath, subData);
	}
	catch (e) {
		console.log("error writing twitch subscriptions to file: ", e);
	}
}

function deleteSubscriptionFromFile (id) {
    try {
        let subData = fs.readJsonSync(subsFilePath, {throws: false});
        if (!subData)
            subData = {};
        let channels = [];
         for (let channel in subData) {
           if (subData[channel].id === id)
               channels.push(channel);
        }
        channels.forEach(c => delete subData[c]);
		fs.writeJsonSync(subsFilePath, subData);
	}
	catch (e) {
		console.log("error writing twitch subscriptions to file: ", e);
	}
}

function isSubscribed(channelName) {
        let subData = fs.readJsonSync(subsFilePath, {throws: false});
        if (!subData)
            subData = {};
        return subData[channelName] !== undefined;
}

function onSubscriptionScheduleResub(userId, lease_seconds) {
    if (!pendingResubs.has(userId))
        return;
    let stream = pendingResubs.get(userId);
    console.log("Scheduling resub for: ", stream.login);
    let time = Date.now() + lease_seconds * 1000;
    saveSubscriptionToFile(time, stream.id, stream.login);
    scheduleResub(time, stream.id, stream.login);
    pendingResubs.delete(userId);
}

function scheduleResub (time, id, login) {
    schedule.scheduleJob(id.toString(), time, () => subscribe(login));
}

function onUnsubscriptionCancelResub(id) {
    deleteSubscriptionFromFile(id);
    schedule.cancelJob(id.toString());
}

function initExp() {
    expressApp.use(express.json({
        verify: function (req, res, buf, encoding) {
            // https://www.w3.org/TR/websub/#authenticated-content-distribution
            req.twitch_hub = false;
            if (req.headers) {
                const xHubSignature = req.headers["x-hub-signature"];
                if (!xHubSignature)
                    return;
                req.twitch_hub = true;
    
                let xHub = xHubSignature.split('=');
                let method = xHub[0];
                req.twitch_hex = crypto.createHmac(method, _clientSecret).update(buf).digest('hex');
                req.twitch_signature = xHub[1];
                return req.twitch_hex === req.twitch_signature;
            }
        }
    }));

    expressApp.route("/*").get((req, res) => {
        console.log("get received");
        console.log(req.query);
        try {
            const requestId = req.path.split("/")[1];
            if (!requestId)
                throw "No request id";

            const mode = req.query["hub.mode"];
            if (mode === "denied") {
                console.log("Twitch API - subscription denied, reason: " + req.query["hub.reason"]);
                pendingCommandHandled(requestId, `Failed to (un)subscribe: ${req.query["hub.reason"]}`);
            }
            else if (mode === "subscribe" || mode === "unsubscribe") {
                if (mode === "subscribe")
                    onSubscriptionScheduleResub(requestId, req.query["hub.lease_seconds"]);
                else
                    onUnsubscriptionCancelResub(requestId);

                    pendingCommandHandled(requestId, `Successfully ${mode}d.`, true);
                    res.status(200).type('text/plain').send(req.query["hub.challenge"]);
            } else
                throw "Unexpected mode: " + mode;

        } catch (e) {
            console.log("failed handling get: ", e);
            res.status(500).send();
        }
    }).post((req, res) => {
        console.log("post received");
        console.log(req.body);
        try {
            if (!isRequestVerified(req))
                throw "Unverified request";

            const data = req.body.data[0];
            const requestId = req.path.split("/")[1];
            if (!requestId)
                throw "No request id";
            // post a going live message if the user wasn't live before
            if (data && data.type === "live" && (!knownLiveStreams[requestId] || knownLiveStreams[requestId].type !== "live"))
                _clientInfo.channels.forEach(channel => _clientInfo.client.say(channel, `https://twitch.tv/${data.user_name.toLowerCase()} just went live! Title: ${data.title}`));
            knownLiveStreams[requestId] = data;
            res.status(200).send();
        } catch (e) {
            console.log("failed handling post: ", e);
            res.status(500).send();
        }
    });

    function isRequestVerified(req) {
        return req.twitch_hub && req.twitch_hex === req.twitch_signature;
    }

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

    if (mode === "subscribe" && isSubscribed(userLogin)) {
        _clientInfo.client.say(_clientInfo.channel, `Already subscribed to ${userLogin}.`);
        return;
    }

    pendingCommands.set(userLogin.toLowerCase(), {clientInfo, mode});

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

function listActiveSubscriptions(clientInfo) {
    _clientInfo = clientInfo;
    try {
        let subData = fs.readJsonSync(subsFilePath, { throws: false });
        if (!subData)
            subData = {};
        let channels = [];
        for (let channelName in subData)
            channels.push(channelName);
        let message = channels.length > 0 ?
            `Active Twitch subscriptions: ${channels.join(", ")}`
            : "No active Twitch subscriptions.";
        _clientInfo.client.say(_clientInfo.channel, message);
	}
	catch (e) {
		console.log("oh no", e);
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
    request.post({
        url: "https://api.twitch.tv/helix/webhooks/hub",
        form: {
            "hub.callback": url.href,
            "hub.mode": mode,
            "hub.topic": "https://api.twitch.tv/helix/streams?user_id=" + stream.id,
            "hub.lease_seconds": 10, // max 864000
            "hub.secret": _clientSecret
        },
        headers: getRequestHeaders()
    }, function (error, response, body) {
        if (response.statusCode === 202) {
            console.log("(Un)subscribed to stream:\n", stream);
        } else {
            console.log("Twitch API - failed to subscribe to channel: " + stream.login + ", " + JSON.parse(body).message);
            pendingCommandHandled(stream.id, `Failed to ${mode}.`)
        }
    });
}

function pendingCommandHandled(streamId, message, success=false) {
    if (pendingCommands.has(streamId)) {
        const commandInfo = pendingCommands.get(streamId)
        commandInfo.clientInfo.client.say(commandInfo.clientInfo.channel, message);
        pendingCommands.delete(streamId);
        if (success) {
            if (commandInfo.mode === "subscribe")
                ; // save
            else if (commandInfo.mode === "unsubscribe")
                ; // delete
        }
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