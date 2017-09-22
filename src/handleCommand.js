var utils = require("./ircbot-utils");
var imdbSearch = require("./imdbSearch");
var youtubeSearch = require("./youtubeSearch");
var eightball = require("./eightball.js");
var roll = require("./roll");
var seen = require("./seen");
var _clientInfo = undefined;

module.exports = function (clientInfo, message) {
    _clientInfo = clientInfo;
    handleCommand(message);
};
function handleCommand(message) {
    var command = utils.extractCommand(message);
    var parameters = utils.extractParameters(message);
    switch (command) {
        case "help":
        case "commands":
            sendHelp();
            return true;
        case "imdb":
            imdbSearch(_clientInfo, parameters);
            return true;
        case "youtube":
            youtubeSearch(_clientInfo, parameters);
            return true;
        case "roll":
            roll(_clientInfo, parameters);
            return true;
        case "8ball":
            eightball(_clientInfo, parameters);
            return true;
        case "seen":
            seen.get(_clientInfo, parameters);
            return true;
        case "uman":
            _clientInfo.client.say(_clientInfo.channel, "?");
            return true;
        default:
            return false;
    }
}
function sendHelp() {
    var helpString = "Available commands:\n";
    helpString += "!help or !commands: Show this help\n";
    helpString += "!imdb: search imdb for movies. Example usage: !imdb back to the future\n";
    helpString += "!youtube: search youtube for videos. Example usage: !youtube amazing horse\n";
    helpString += "!roll: generates random integer in given range. Example usage: !roll 1-10. Default: 1-20\n";
    helpString += "!8ball: will answer any yes/no question. Example usage: !8ball Am I a good person?\n";
    helpString += "!seen: checks when the given user was last seen in the channel. Example usage: !seen Kenny\n";
    helpString += "!uman: ?";
    var lines = helpString.split("\n");
    for (var i = 0; i < lines.length; i++)
        _clientInfo.client.notice(_clientInfo.userName, lines[i]);
}