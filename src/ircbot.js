var IRC = require("irc");
var getUrls = require("get-urls");

var youtubeResolve = require("./youtubeResolve");

const networkUrl = "irc.quakenet.org";
const nickname = "MystBot2";
const channels = ["#mystdev"];

var _client = undefined;

module.exports = {
    start: start
};
function start() {
    _client = new IRC.Client(networkUrl, nickname, {
        channels: channels,
        floodProtection: true,
        stripColors: true,
        userName: nickname,
        realName: nickname
    });
    _client.addListener("message", onMessage);
    _client.addListener("error", onError);
}
function onMessage(userName, channel, message) {
    var urls = getUrls(message);
    for (var url of urls)
        youtubeResolve({
            client: _client,
            channel: channel
        }, url);
}
function onError(message) {
    console.log("IRC Error: " + message);
}