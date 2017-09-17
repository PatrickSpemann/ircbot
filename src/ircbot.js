var IRC = require("irc");
var getUrls = require("get-urls");

var handleCommand = require("./handleCommand");
var handleAdminCommand = require("./handleAdminCommand");
var imdbResolve = require("./imdbResolve");
var youtubeResolve = require("./youtubeResolve");

var _client = undefined;
var lastPm = undefined;
var _options = undefined;

module.exports.start = function (options) {
    _options = options;
    _client = new IRC.Client(options.networkUrl, options.nickname, {
        channels: options.channels,
        floodProtection: true,
        stripColors: true,
        userName: options.nickname,
        realName: options.nickname
    });
    _client.addListener("pm", onPm);
    _client.addListener("message#", onMessage);
    _client.addListener("error", onError);
};
function onPm(userName, message) {
    lastPm = message;
    _client.whois(userName, onWhoisResult);
}
function onWhoisResult(info) {
    if (_options.adminHosts.indexOf(info.host) !== -1)
        handleAdminCommand(_client, lastPm);
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
    if (handleCommand(clientInfo, message))
        return;
    var urls = getUrls(message);
    for (var url of urls) {
        imdbResolve(clientInfo, url);
        youtubeResolve(clientInfo, url);
    }
}
function onError(message) {
    console.log("IRC Error: " + message);
}