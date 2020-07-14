const util = require("util");
const request = require("request");
const requestPostP = util.promisify(request.post);
const URL = require("url-parse");

var _clientInfo = undefined;
var _clientID = undefined;
var _clientSecret = undefined;
var _auth = undefined;

let _clientInfo = undefined;
let _clientID = undefined;
let _clientSecret = undefined;
let _auth = undefined;
let _callbackBaseUrl = undefined;
let _port = 80;

let _knownLiveStreams = {};
let _pendingResubs = new Map();
let _pendingCommands = new Map();

// TODO handle rate limits

module.exports = {
    initCredentials,
    handleTwitchUrl
}

function initCredentials (options) {
    if (!options.twitchClientID || !options.twitchClientSecret)
        console.log("Twitch API: missing credentials in settings.")
    _clientID = options.twitchClientID;
    _clientSecret = options.twitchClientSecret;
    if (!options.port)
        console.log("Twitch API - missing port.");
    else
        _port = options.port;

    _callbackBaseUrl = (options.callbackBaseUrl) ? (options.callbackBaseUrl) : `http://${options.ipv6 ? await publicIp.v6() : await publicIp.v4()}`;
    initExpressApp();
    requestAccessToken().then(() => restoreSubscriptions()).catch((error) => console.log(error));
}

function initExpressApp() {
    let appRoute = _route + '*';
    expressApp.use(appRoute, express.json({
        verify: function (req, res, buf, encoding) {
            // https://www.w3.org/TR/websub/#authenticated-content-distribution
            req.twitch_hub = false;
            if (!req.headers)
                return;

            const xHubSignature = req.headers["x-hub-signature"];
            if (!xHubSignature)
                return;
            req.twitch_hub = true;
            let xHub = xHubSignature.split('=');
            let method = xHub[0];
            req.twitch_hex = crypto.createHmac(method, _clientSecret).update(buf).digest('hex');
            req.twitch_signature = xHub[1];
        }
    }));

    expressApp.route(appRoute).get((req, res) => {
        if (_verboseLogs) {
            console.log("Twitch API - GET received");
            console.log(req.path);
            console.log(req.query);
        }
        try {
            const requestId = req.path.split("/")[2];
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

                pendingCommandHandled(requestId, `Successfully ${mode}d.`);
                res.status(200).type('text/plain').send(req.query["hub.challenge"]);
            } else
                throw "Unexpected mode: " + mode;

        } catch (e) {
            console.log("Twitch API - failed handling get: ", e);
            res.status(500).send();
        }
    }).post((req, res) => {
        if (_verboseLogs) {
            console.log("Twitch API - POST received");
            console.log(req.path);
            console.log(req.body);
        }
        try {
            if (!isRequestVerified(req))
                throw "Unverified request";

            const data = req.body.data[0];
            const requestId = req.path.split("/")[2];
            if (!requestId)
                throw "No request id";
            // post a going live message if the user wasn't live before
            if (data && data.type === "live" && (!_knownLiveStreams[requestId] || _knownLiveStreams[requestId].type !== "live"))
                _clientInfo.channels.forEach(channel => _clientInfo.client.say(channel, `https://twitch.tv/${data.user_name.toLowerCase()} just went live! Title: ${data.title}`));
            _knownLiveStreams[requestId] = data;
            res.status(200).send();
        } catch (e) {
            console.log("Twitch API - failed handling post: ", e);
            res.status(500).send();
        }
    });

    function isRequestVerified(req) {
        return req.twitch_hub && req.twitch_hex === req.twitch_signature;
    }

    expressApp.listen(_port, () => console.log("Listening on port: " + _port));
}

function onSubscriptionScheduleResub(userId, lease_seconds) {
    if (!_pendingResubs.has(userId))
        return;
    let stream = _pendingResubs.get(userId);
    let time = Date.now() + lease_seconds * 1000;
    saveSubscriptionToFile(time, stream.id, stream.login);
    scheduleResubJob(time, stream.id, stream.login);
    _pendingResubs.delete(userId);
}

function saveSubscriptionToFile(time, id, channelName) {
    try {
        let subData = fs.readJsonSync(_subsFilePath, { throws: false });
        if (!subData)
            subData = {};
        subData[channelName] = { id: id, time: time };
        fs.writeJsonSync(_subsFilePath, subData);
    }
    catch (e) {
        console.log("Error writing twitch subscriptions to file: ", e);
    }
}

function scheduleResubJob(time, id, login) {
    schedule.scheduleJob("twitchResub" + id, time, () => subscribe(login));
}

function onUnsubscriptionCancelResub(id) {
    deleteSubscriptionFromFile(id);
    schedule.cancelJob("twitchResub" + id);
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

function restoreSubscriptions() {
    // we only immediately resubscribe if the old subscription has expired, this does mean we may lose some events if the callback url changed
    try {
        let subData = fs.readJsonSync(_subsFilePath);
        for (let channelName in subData) {
            const channelInfo = subData[channelName];
            if (channelInfo.time < Date.now())
                subscribe(channelName);
            else
                scheduleResubJob(channelInfo.time, channelInfo.id, channelName);
        }
    }
    catch (e) {
        console.log("No twitch subscriptions to restore.");
    }
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