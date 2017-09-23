var URL = require("url-parse");
var YouTube = require("youtube-node");
var utils = require("./ircbot-utils");

var youtube = new YouTube();
youtube.setKey("AIzaSyB1OOSpTREs85WUMvIgJvLTZKye4BVsoFU");

var _clientInfo = undefined;

module.exports = function (clientInfo, url) {
    _clientInfo = clientInfo;
    var videoId = getVideoId(new URL(url));
    if (videoId)
        youtube.getById(videoId, onYoutubeResult);
}
function getVideoId(urlObject) {
    switch (urlObject.hostname) {
        case "youtu.be":
            return getVideoIdFromBE(urlObject);
        case "youtube.com":
            return getVideoIdFromCOM(urlObject);
        default:
            return undefined;
    }
}
function getVideoIdFromBE(urlObject) {
    var withoutSlash = urlObject.pathname.substring(1);
    return withoutSlash;
}
function getVideoIdFromCOM(urlObject) {
    var withoutQuestionMark = urlObject.query.substring(1);
    var pairs = withoutQuestionMark.split("&");
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split("=");
        if (pair.length === 2 && pair[0] === "v")
            return pair[1];
    }
    return undefined;
}
function onYoutubeResult(error, result) {
    if (error)
        console.log(error);
    else
        for (var i = 0; i < result.items.length; i++)
            processYoutubeResult(result.items[i]);
}
function processYoutubeResult(youtubeResult) {
    var title = youtubeResult.snippet.title;
    var channelTitle = youtubeResult.snippet.channelTitle;
    var durationString = utils.formatDuration(youtubeResult.contentDetails.duration);
    _clientInfo.client.say(_clientInfo.channel, channelTitle + ": " + title + " [" + durationString + "]");
}