var irc = require("irc");
var URL = require("url-parse")
var getUrls = require("get-urls");
var isoHelp = require("iso8601-duration");
var YouTube = require("youtube-node");
//TODO
/*
    run as service
    add tests
    make robust
    get own api key
    add better readme
    !imdb command
    ???
    profit
*/
var youtube = new YouTube();

youtube.setKey("AIzaSyB1OOSpTREs85WUMvIgJvLTZKye4BVsoFU");

const networkUrl = "irc.quakenet.org";
const nickname = "MystBot";
const channels = ["#barakthul"];

var client = new irc.Client(networkUrl, nickname, {
    channels: channels
});

client.addListener("message", onMessage);

function onMessage(userName, channel, message) {
    _channel = channel;
    if (message.toLowerCase().indexOf("!imdb") === 0)
        client.say(_channel, "coming soon!");
    if (message.toLowerCase().indexOf("!uman") === 0)
        client.say(_channel, "?");
    var urls = getUrls(message);
    for (var url of urls) {
        var videoId = getVideoId(new URL(url));
        if (videoId)
            youtube.getById(videoId, onYoutubeResult);
    }
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
    else if (result && result.items)
        for (var i = 0; i < result.items.length; i++)
            processYoutubeResult(result.items[i]);
}
function processYoutubeResult(youtubeResult) {
    try {
        var title = youtubeResult.snippet.title;
        var durationString = formatDuration(youtubeResult.contentDetails.duration);
        client.say(_channel, title + " [" + durationString + "]");

    }
    catch (error) {
        console.log(error);
    }
}
function formatDuration(durationString) {
    var durationObj = isoHelp.parse(durationString);
    var hh = pad(durationObj.hours);
    var mm = pad(durationObj.minutes);
    var ss = pad(durationObj.seconds);
    if (hh === "00")
        return mm + ":" + ss;
    return hh + ":" + mm + ":" + ss;
}
function pad(numAsString) {
    var num = parseInt(numAsString);
    return num >= 10 ? num : "0" + num;
}