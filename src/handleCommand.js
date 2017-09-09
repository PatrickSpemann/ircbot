var _clientInfo = undefined;

module.exports = function (clientInfo, message) {
    _clientInfo = clientInfo;
    handleCommand(message);
};
function handleCommand(message) {
    var command = extractCommand(message);
    var parameters = extractParameters(message);
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
function extractCommand(message) {
    if (message.indexOf("!") !== 0)
        return undefined;
    var spaceIndex = message.indexOf(" ");
    var end = spaceIndex === -1 ? undefined : spaceIndex;
    return message.substring(1, end);
}
function extractParameters(message) {
    var spaceIndex = message.indexOf(" ");
    if (spaceIndex === -1)
        return "";
    return message.substring(spaceIndex + 1);
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