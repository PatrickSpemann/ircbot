var irc = require("irc");
var URL = require("url-parse")
var getUrls = require("get-urls");
var YouTube = require("youtube-node");
//TODO
/*
    accept youtu.be urls
    format output properly
    run as service
    add tests
    make robust
    get own api key
    add better readme
    ???
    profit
*/
var youtube = new YouTube();

youtube.setKey("AIzaSyB1OOSpTREs85WUMvIgJvLTZKye4BVsoFU");

const networkUrl = "irc.quakenet.org";
const nickname = "MystBot";
const channel = "#barakthul";

var client = new irc.Client(networkUrl, nickname, {
    channels: [channel]
});

client.addListener("message", onMessage);

function onMessage(from, to, message) {
    var urls = getUrls(message);
    for (var url of urls) {
        var urlObject = new URL(url);
        if (isYoutubeUrl(urlObject))
            handleYoutubeUrl(urlObject);
    }
}
function isYoutubeUrl(urlObject) {
    if (urlObject.hostname === "youtube.com")
        return true;
    return false;
}
function handleYoutubeUrl(urlObject) {
    var videoId = getVideoId(urlObject.query);
    if (videoId) {
        youtube.getById(videoId, onYoutubeResult);
    }
}
function getVideoId(urlQuery) {
    var withoutQuestionMark = urlQuery.substring(1);
    var pairs = withoutQuestionMark.split("&");
    for (var i = 0; i < pairs.length; i++) {
        var tmp = pairs[i].split("=");
        var paramName = tmp[0];
        if (paramName === "v")
            return tmp[1];
    }
    return undefined;
}
function onYoutubeResult(error, result) {
    if (error)
        console.log(error);
    else
        processYoutubeResults(result.items);
}
function processYoutubeResults(youtubeResults) {
    for (var i = 0; i < youtubeResults.length; i++)
        processYoutubeResult(youtubeResults[i]);
}
function processYoutubeResult(youtubeResult) {
    var title = youtubeResult.snippet.title;
    var durationString = youtubeResult.contentDetails.duration;
    client.say(channel, "title: " + title + " duration: " + durationString);
}