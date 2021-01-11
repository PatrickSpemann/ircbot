var utils = require("./ircbot-utils");
var quote = require("./quote");
var ignoreList = require("./commandIgnoreList")
var _client = undefined;

module.exports = function (clientInfo, message) {
    _clientInfo = clientInfo;
    handleCommand(message);
};
function handleCommand(message) {
    var command = utils.extractCommand(message);
    var parameters = utils.extractParameters(message);
    switch (command) {
        case "join":
            _clientInfo.client.join(parameters);
            break;
        case "part":
            _clientInfo.client.part(parameters);
            break;
        case "say":
            var firstSpace = parameters.indexOf(" ");
            var target = parameters.substring(0, firstSpace);
            var message = parameters.substring(firstSpace + 1);
            _clientInfo.client.say(target, message);
            break;
        case "nick":
            _clientInfo.client.send("NICK", parameters);
            break;
        case "removequote":
            quote.remove(_clientInfo, parameters);
            break;
        case "ignore":
            ignoreList.addToList(parameters);
            break;
        case "unignore":
            ignoreList.removeFromList(parameters);
            break;
        default:
            break;
    }
}