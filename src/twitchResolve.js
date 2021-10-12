const util = require("util");
const request = require("request");
const requestPostP = util.promisify(request.post);
const URL = require("url-parse");
const fs = require("fs-extra");
const publicIp = require("public-ip");
const express = require("express");
const expressApp = express();
const crypto = require("crypto");
const { json } = require("express");
const https = require('https');

const _subsFilePath = "./twitchSubs.json";
const _route = "/TwitchSubs/";
const _verboseLogs = false;

const _liveNotificationTimeout = 600000; // 10m

let _clientInfo = undefined;
let _clientID = undefined;
let _clientSecret = undefined;
const _sessionSecret = crypto.randomBytes(30).toString('hex');
let _auth = undefined;
let _callbackBaseUrl = undefined;
const _portExpress = 80;
const _port = 443; // port 443 must be used according to spec
let _httpsOptions = undefined;

let _knownLiveStreams = {};
let _recentLiveNotifications = {};
let _pendingSubscriptionRequests = new Map();
let _pendingSubCommands = new Map();
let _pendingUnsubCommands = [];

// TODO handle rate limits

module.exports = {
    initTwitchApi,
    handleTwitchUrl,
    handleSubscription,
    listActiveSubscriptions,
    listKnownLiveStreams,
    setCallbackUrl,
    restoreSubscriptions
};

function setCallbackUrl(url) {
    _callbackBaseUrl = url;

}

async function initTwitchApi(clientInfo, options) {
    _clientInfo = clientInfo;
    if (!options.twitchClientID || !options.twitchClientSecret)
        console.log("Twitch API - missing credentials in settings.")
    _clientID = options.twitchClientID;
    _clientSecret = options.twitchClientSecret;
    _callbackBaseUrl = (options.callbackBaseUrl) ? (options.callbackBaseUrl) : `https://${await publicIp.v4().catch(e => console.log(e))}`;
    try {
        _httpsOptions = {
            key: fs.readFileSync(options.httpsKeyPath),
            cert: fs.readFileSync(options.httpsCertificatePath)
        };
    } catch (e) {
        _clientInfo.channels.forEach(channel => _clientInfo.client.say(channel, `Failed to load certificates. ${e}`));
    }

    initExpressApp();
    requestAccessToken().then(() => restoreSubscriptions()).catch((error) => console.log(error));
}

function initExpressApp() {
    let appRoute = _route + '*';
    expressApp.use(appRoute, express.json({
        verify: function (req, res, buf, encoding) {
            if (_verboseLogs)
                console.log("Verifying request...");
            // https://dev.twitch.tv/docs/eventsub#verify-a-signature
            req.twitch_hub = false;
            if (!req.headers)
                return;

            const xHubSignature = req.headers["twitch-eventsub-message-signature"];
            if (!xHubSignature)
                return;
            req.twitch_hub = true;
            let xHub = xHubSignature.split('=');
            let method = xHub[0];
            let hmac_message = req.headers["twitch-eventsub-message-id"] + req.headers["twitch-eventsub-message-timestamp"] + buf;
            req.twitch_hex = crypto.createHmac(method, _sessionSecret).update(hmac_message).digest('hex');
            req.twitch_signature = xHub[1];
        }
    }));

    expressApp.route(appRoute).get((req, res) => {
        if (_verboseLogs) {
            console.log("Twitch API - GET received");
            console.log(req.path);
            console.log(req.query);
        }
        res.status("200").send();
    }).post((req, res) => {
        if (_verboseLogs) {
            console.log("Twitch API - POST received");
            console.log(req.path);
            console.log(req.body);
        }
        try {
            if (!isRequestVerified(req)) {
                res.status(403).send();
                if (_verboseLogs)
                    console.log("Failed to handle POST, unverified request");
                return;
            }

            const data = req.body.subscription;
            const requestId = req.path.split("/")[2];
            if (!requestId)
                throw "No request id";

            switch (req.headers["twitch-eventsub-message-type"]) {
                case "webhook_callback_verification":
                    const challenge = req.body.challenge;
                    if (!challenge) {
                        throw "No challenge string.";
                    }
                    if (data.type !== "stream.online")
                        throw `Subscription type ${data.type} not implemented.`;
                    onSubscriptionSaveToFile(requestId, data.id);
                    pendingCommandHandled(requestId, `Successfully subscribed.`);
                    res.status(200).type('text/plain').send(challenge);
                    return;
                case "notification":
                    const eventData = req.body.event;
                    const liveType = "live";
                    // post a going live message if the user wasn't live before
                    if (data && data.type === "stream.online" && eventData.type === liveType && !_recentLiveNotifications[requestId] && (!_knownLiveStreams[requestId] || _knownLiveStreams[requestId].event.type !== liveType)) {
                        _clientInfo.channels.forEach(channel => _clientInfo.client.say(channel, `https://twitch.tv/${eventData.broadcaster_user_name.toLowerCase()} just went live!`));
                        _recentLiveNotifications[requestId] = true;
                        setTimeout(() => {
                            _recentLiveNotifications[requestId] = false;
                        }, _liveNotificationTimeout);
                    }
                    _knownLiveStreams[requestId] = req.body;
                    res.status(200).send();
                    handleStreamsUrl(eventData.broadcaster_user_name);
                    return;
                case "revocation":
                    if (_verboseLogs)
                        console.log("Revocation request received.");
                    res.status(200).type();
                    subscribeByUserId(data.condition.broadcaster_user_id);
                    return;
                default:
                    throw `Unhandled request type ${req.headers["twitch-eventsub-message-type"]}`;
            }
        } catch (e) {
            console.log("Twitch API - failed handling post: ", e);
            res.status(500).send();
        }
    });

    function isRequestVerified(req) {
        return req.twitch_hub && req.twitch_hex === req.twitch_signature;
    }

    expressApp.listen(_portExpress, "0.0.0.0", () => console.log("Listening on port: " + _portExpress)).on("error", function (error) {
        console.log("Twitch API - failed to init server:", error);
    });
    https.createServer(_httpsOptions, expressApp).listen(_port, "0.0.0.0", () => console.log("Listening on port: " + _port)).on("error", function (error) {
        console.log("Twitch API - failed to init server:", error);
    });
}

function onSubscriptionSaveToFile(userId, subId) {
    if (!_pendingSubscriptionRequests.has(userId))
        return;
    let stream = _pendingSubscriptionRequests.get(userId);
    saveSubscriptionToFile(stream.id, stream.login, subId);
    _pendingSubscriptionRequests.delete(userId);
}

function saveSubscriptionToFile(id, channelName, subId) {
    try {
        let subData = fs.readJsonSync(_subsFilePath, { throws: false });
        if (!subData)
            subData = {};
        subData[channelName] = { id: id, subId: subId };
        fs.writeJsonSync(_subsFilePath, subData);
    }
    catch (e) {
        console.log("Error writing twitch subscriptions to file: ", e);
    }
}

function deleteSubscriptionFromFile(id) {
    try {
        let subData = fs.readJsonSync(_subsFilePath, { throws: false });
        if (!subData)
            subData = {};
        let channels = [];
        for (let channel in subData) {
            if (subData[channel].id === id)
                channels.push(channel);
        }
        channels.forEach(c => delete subData[c]);
        fs.writeJsonSync(_subsFilePath, subData);
    }
    catch (e) {
        console.log("Error writing twitch subscriptions to file: ", e);
    }
}

function requestAccessToken() {
    return requestPostP({
        url: "https://id.twitch.tv/oauth2/token?client_id=" + _clientID,
        form: { client_secret: _clientSecret, grant_type: "client_credentials" },
        headers: { "content-type": "application/json" }
    }).then((response, body) => setAccessToken(response, body));
}

function setAccessToken(response, body) {
    let json = JSON.parse(response.body);
    if (response.statusCode !== 200)
        throw "Twitch API - failed to set access token: " + json.message;
    _auth = "Bearer " + json.access_token;
}

function restoreSubscriptions(clientInfo = undefined) {
    if (clientInfo) // only set when this is called by a user command
        _clientInfo = clientInfo;
    sendRequest("https://api.twitch.tv/helix/eventsub/subscriptions", onRestoreResponse);
}

function onRestoreResponse(error, response, body) {
    try {
        const json = JSON.parse(body);
        const data = json.data;
        let restored = [];

        let subData = fs.readJsonSync(_subsFilePath);
        for (let channelName in subData) {
            const channelInfo = subData[channelName];
            let relevantEntry = data.filter(e => e.id === channelInfo.subId)[0];
            if (!relevantEntry || relevantEntry.status !== "enabled") {
                subscribe(channelName);
                restored.push(channelname);
            }
        }

        if (restored.length > 0) {
            _clientInfo.channels.forEach(channel => _clientInfo.client.say(channel, `Restored twitch subscriptions for channels: ${restored.join(', ')}`));
        }
    }
    catch (e) {
        console.log("Failed to restore subscriptions.", e);
    }
}

function handleTwitchUrl(clientInfo, url) {
    _clientInfo = clientInfo;
    let urlObject = new URL(url);
    let path = urlObject.pathname.split("/")[1];
    if (!path || path === "")
        return false;

    switch (urlObject.hostname) {
        case "go.twitch.tv":
        case "twitch.tv":
            handleStreamsUrl(path);
            return true;
        case "clips.twitch.tv":
            sendRequest("https://api.twitch.tv/helix/clips?id=" + path, onClipsResponse);
            return true;
        default:
            return false;
    }
}

function handleStreamsUrl(path) {
    sendRequest("https://api.twitch.tv/helix/streams?user_login=" + path, onStreamsResponse);
}

function handleSubscription(clientInfo, mode, params) {
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

    switch (mode) {
        case "subscribe":
            _pendingSubCommands.set(userLogin.toLowerCase(), { clientInfo, mode });
            subscribe(userLogin);
            break;
        case "unsubscribe":
            unsubscribe(userLogin);
            break;
        default:
            console.log("Twitch API - Unknown subscription mode.");
            break;
    }
}

function isSubscribed(channelName) {
    let subData = fs.readJsonSync(_subsFilePath, { throws: false });
    if (!subData)
        subData = {};
    return subData[channelName] !== undefined && subData[channelName].subId !== undefined;
}

function listActiveSubscriptions(clientInfo) {
    _clientInfo = clientInfo;
    try {
        let subData = fs.readJsonSync(_subsFilePath, { throws: false });
        if (!subData)
            subData = {};
        let channels = [];
        for (let channelName in subData)
            channels.push(channelName);
        let message = channels.length > 0 ?
            `Active Twitch subscriptions: ${channels.join(", ")}` :
            "No active Twitch subscriptions.";
        _clientInfo.client.say(_clientInfo.channel, message);
    }
    catch (e) {
        console.log(e);
    }
}

function listKnownLiveStreams(clientInfo) {
    _clientInfo = clientInfo;
    // this won't work for streams that were live before the bot was started
    try {
        let liveChannels = [];
        for (const id in _knownLiveStreams) {
            const stream = _knownLiveStreams[id];
            if (stream && stream.type === "live")
                liveChannels.push(`https://twitch.tv/${stream.user_name.toLowerCase()}`);
        }
        let message = liveChannels.length > 0 ?
            `Active live streams: ${liveChannels.join(", ")}` :
            "No channels are currently live.";
        _clientInfo.client.say(_clientInfo.channel, message);
    } catch (e) {
        console.log(e);
    }
}

function subscribe(userLogin) {
    sendRequest("https://api.twitch.tv/helix/users?login=" + userLogin, onSubscriptionResponse);
}

function subscribeByUserId(userId) {
    let subData = fs.readJsonSync(_subsFilePath, { throws: false });
    if (subData) {
        for (const userLogin in subData) {
            if (subData[userLogin].id === userId) {
                sendRequest("https://api.twitch.tv/helix/users?login=" + userLogin, onSubscriptionResponse);
                break;
            }
        }
    }
}

function unsubscribe(userLogin) {
    sendRequest("https://api.twitch.tv/helix/users?login=" + userLogin, onUnsubscribeGetSubList);
    let subData = fs.readJsonSync(_subsFilePath, { throws: false });
    if (subData && subData[userLogin]) {
        _knownLiveStreams[subData[userLogin].id] = undefined;
        deleteSubscriptionFromFile(subData[userLogin].id);
    } else {
        _clientInfo.client.say(_clientInfo.channel, "Not subscribed to " + userLogin + " locally.");
    }
}

function onUnsubscribeGetSubList(error, response, body) {
    let stream = getResponseData(error, response, body, onUnsubscribeGetSubList);
    if (!stream) {
        _clientInfo.client.say(_clientInfo.channel, "Failed to unsubscribe. No stream info received.");
        return;
    }
    _pendingUnsubCommands.push(stream.id);
    sendRequest("https://api.twitch.tv/helix/eventsub/subscriptions", onUnsubscribeDeleteSub);
}

function onUnsubscribeDeleteSub(error, response, body) {
    try {
        let json = typeof body === "string" ? JSON.parse(body) : body;
        for (let entry of _pendingUnsubCommands) {
            for (let entry2 of json.data) {
                if (entry2.status === "enabled" && entry2.condition.broadcaster_user_id === entry)
                    sendRequest("https://api.twitch.tv/helix/eventsub/subscriptions?id=" + entry2.id, onUnsubscriptionResponse, undefined, "DELETE");
            }
        }
    } catch (e) {
        _clientInfo.client.say(_clientInfo.channel, "Failed to unsubscribe. Couldn't read the subscription list.");
    }
    _pendingUnsubCommands = [];
}

function onUnsubscriptionResponse(error, response, body) {
    let msg = response.statusCode === 204 ? "Successfully unsubscribed." : "Failed to unsubscribe. Reason: " + body.message;
    _clientInfo.client.say(_clientInfo.channel, msg);
    if (_verboseLogs)
        console.log("Response to unsubscription request: " + response.statusCode);
}

function onSubscriptionResponse(error, response, body) {
    sendSubscriptionRequest(error, response, body, onSubscriptionResponse);
}

function addStreamInfoToPendingSubRequests(stream) {
    const loginToLower = stream.login.toLowerCase();
    if (_pendingSubCommands.has(loginToLower)) {
        _pendingSubCommands.set(stream.id, _pendingSubCommands.get(loginToLower));
        _pendingSubCommands.delete(loginToLower);
    }
}

function sendSubscriptionRequest(error, response, body, callback) {
    let stream = getResponseData(error, response, body, callback);
    if (!stream)
        return;

    if (!_pendingSubscriptionRequests.has(stream.id))
        _pendingSubscriptionRequests.set(stream.id, stream);

    addStreamInfoToPendingSubRequests(stream);

    const url = new URL(`${_route}${stream.id}`, `${_callbackBaseUrl}:${_port}`);
    if (_verboseLogs) {
        console.log("Callback url:", url.href);
        console.log("Session secret: ", _sessionSecret);
    }
    request.post({
        url: "https://api.twitch.tv/helix/eventsub/subscriptions",
        body: {
            "type": `stream.online`,
            "version": "1",
            "condition": {
                "broadcaster_user_id": stream.id
            },
            "transport": {
                "method": "webhook",
                "callback": url.href,
                "secret": _sessionSecret
            }
        },
        json: true,
        headers: getRequestHeaders()
    }, function (error, response, body) {
        if (response.statusCode === 202) {
            if (_verboseLogs)
                console.log("Twitch API - Updated stream subscription:\n", stream);
        } else {
            console.log("Twitch API - failed to subscribe to channel: " + stream.login + ", " + body.message);
            pendingCommandHandled(stream.id, `Failed to subscribe. Reason: ` + body.message);
        }
    });
}

function pendingCommandHandled(streamId, message) {
    if (_pendingSubCommands.has(streamId)) {
        const commandInfo = _pendingSubCommands.get(streamId);
        commandInfo.clientInfo.client.say(commandInfo.clientInfo.channel, message);
        _pendingSubCommands.delete(streamId);
    }
}

function sendRequest(url, callback, body = undefined, method = undefined) {
    let requestOptions = {
        url: url,
        headers: getRequestHeaders()
    };
    if (body) {
        requestOptions.body = body;
        requestOptions.json = true;
    }
    switch (method) {
        case "DELETE":
            request.delete(requestOptions, callback);
            break;
        default:
            request(requestOptions, callback);
            break;
    }
}

function getRequestHeaders(isJson = true) {
    return {
        "Authorization": _auth,
        "Client-ID": _clientID,
        "Content-Type": "application/json"
    };
}

function onStreamsResponse(error, response, body) {
    let stream = getResponseData(error, response, body, onStreamsResponse);
    if (!stream)
        return;
    let message = stream.title + " [" + stream.viewer_count + "]";
    postMessageWithGameCategory(stream.game_id, message);
}

function onClipsResponse(error, response, body) {
    let clipInfo = getResponseData(error, response, body, onClipsResponse);
    if (!clipInfo)
        return;
    let message = clipInfo.broadcaster_name + ": " + clipInfo.title + " [" + clipInfo.view_count + "]";
    postMessageWithGameCategory(clipInfo.game_id, message);
}

function getResponseData(error, response, body, errorCallback = undefined) {
    try {
        let json = typeof body === "string" ? JSON.parse(body) : body;
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
        let category = getResponseData(error, response, body);
        if (category)
            message += " [" + category.name + "]";
        _clientInfo.client.say(_clientInfo.channel, message);
    });
}

function handleResponseError(response, bodyAsJson, callback) {
    console.log(`Twitch API - request failed: ${bodyAsJson.status} ${bodyAsJson.error} - ${bodyAsJson.message}`);
    if (bodyAsJson.status === 401) // Unauthorized - request a new access token and resend the original request
        requestAccessToken().then(() => sendRequest(response.request.href, callback)).catch((error) => console.log(error));
}