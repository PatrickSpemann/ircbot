var utils = require("./ircbot-utils");
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
            break;
        case "imdb":
            sendImdbInfo(message);
            break;
        case "uman":
            _clientInfo.client.say(_clientInfo.channel, "?");
            break;
        default:
            break;
    }
}
function sendHelp() {
    var helpString = "Available commands:\n";
    helpString += "!help or !commands: show this help\n";
    helpString += "!imdb: search imdb for movies. Example usage: !imdb back to the future\n";
    helpString += "!uman: ?";
    var lines = helpString.split("\n");
    for (var i = 0; i < lines.length; i++)
        _clientInfo.client.notice(_clientInfo.userName, lines[i]);
}
function sendImdbInfo(message) {
    _clientInfo.client.say(_clientInfo.channel, "coming soon!");
}