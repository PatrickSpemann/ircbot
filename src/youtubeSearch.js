var utils = require("./ircbot-utils");
var YouTube = require("youtube-node");
var youtube = new YouTube();
youtube.setKey("AIzaSyB1OOSpTREs85WUMvIgJvLTZKye4BVsoFU");

var _clientInfo = undefined;

module.exports = function (clientInfo, searchString) {
    _clientInfo = clientInfo;
    youtube.search(searchString, 1, onYoutubeSearchResult);
}
function onYoutubeSearchResult(error, result) {
    if (error)
        console.log(error);
    else {
        if (result.items.length > 0)
            youtube.getById(result.items[0].id.videoId, onYoutubeResult);
    }
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
    var durationString = utils.formatDuration(youtubeResult.contentDetails.duration);
    _clientInfo.client.say(_clientInfo.channel, title + " [" + durationString + "] https://www.youtube.com/watch?v=" + youtubeResult.id);
}
