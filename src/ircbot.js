var IRC = require("irc");
var getUrls = require("get-urls");

var handleCommand = require("./handleCommand");
var handleAdminCommand = require("./handleAdminCommand");
var imdbResolve = require("./imdbResolve");
var youtubeResolve = require("./youtubeResolve");
var twitchResolve = require("./twitchResolve");
var genericResolve = require("./genericResolve");
var seen = require("./seen");
var seenState = require("./seenState");
var directResponse = require("./directResponse");
var timer = require("./timer");
var cryptoCurrency = require("./cryptoCurrency");

var _client = undefined;
var lastPm = undefined;
var _options = undefined;

module.exports.start = function (options) {
    _options = options;
    _client = new IRC.Client(options.networkUrl, options.nickname, {
        channels: options.channels,
        floodProtection: true,
        floodProtectionDelay: 2000,
        stripColors: true,
        userName: options.nickname,
        realName: options.nickname
    });
    _client.addListener("pm", onPm);
    _client.addListener("message#", onMessage);
    _client.addListener("names", seen.onNames);
    seenState.registerEvents(_client);
    _client.addListener("error", onError);
    
    timer.restore(_client);
};

function onPm(userName, message) {
    lastPm = message;
    _client.whois(userName, onWhoisResult);
}
function onWhoisResult(info) {
    if (_options.adminHosts.indexOf(info.host) !== -1) {
        var clientInfo = {
            client: _client,
            userName: info.nick
        }
        handleAdminCommand(clientInfo, lastPm);
    }
    lastPm = undefined;
}
function onMessage(userName, channel, message) {
    if (userName === _options.nickname)
        return;
    var clientInfo = {
        client: _client,
        userName: userName,
        channel: channel
    };
    if (directResponse(clientInfo, message))
        return;
    if (handleCommand(clientInfo, message, _options))
        return;
    var urls = getUrls(message);
    for (var url of urls)
        resolveUrl(clientInfo, url);
}
function resolveUrl(clientInfo, url) {
    var resolvers = [imdbResolve, youtubeResolve, twitchResolve, genericResolve]; //order is important!
    for (var i = 0; i < resolvers.length; i++)
        if (resolvers[i](clientInfo, url))
            return;
}
function onError(message) {
    console.log("IRC Error: " + message);
}