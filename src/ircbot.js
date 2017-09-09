var IRC = require("irc");
var getUrls = require("get-urls");

var youtubeResolve = require("./youtubeResolve");
var handleCommand = require("./handleCommand");

const networkUrl = "irc.quakenet.org";
const nickname = "MystBot";
const channels = ["#barakthul"];

var _client = undefined;

module.exports.start = function () {
    _client = new IRC.Client(networkUrl, nickname, {
        channels: channels,
        floodProtection: true,
        stripColors: true,
        userName: nickname,
        realName: nickname
    });
    _client.addListener("message", onMessage);
    _client.addListener("error", onError);
};
function onMessage(userName, channel, message) {
    var clientInfo = {
        client: _client,
        userName: userName,
        channel: channel
    };
    if (handleCommand(clientInfo, message))
        return;
    var urls = getUrls(message);
    for (var url of urls)
        youtubeResolve(clientInfo, url);
}
function onError(message) {
    console.log("IRC Error: " + message);
}