var utils = require("./ircbot-utils");
var _client = undefined;

module.exports = function (client, message) {
    _client = client;
    handleCommand(message);
};
function handleCommand(message) {
    var command = utils.extractCommand(message);
    var parameters = utils.extractParameters(message);
    switch (command) {
        case "join":
            _client.join(parameters);
            break;
        case "part":
            _client.part(parameters);
            break;
        case "say":
            var firstSpace = parameters.indexOf(" ");
            var target = parameters.substring(0, firstSpace);
            var message = parameters.substring(firstSpace + 1);
            _client.say(target, message);
            break;
        case "nick":
            _client.send("NICK", parameters);
        default:
            break;
    }
}