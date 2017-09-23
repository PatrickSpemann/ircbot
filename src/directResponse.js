var utils = require("./ircbot-utils");
module.exports = function (clientInfo, message) {
    var trimmed = message.trim();
    if (trimmed.indexOf("~") !== -1) {
        clientInfo.client.say(clientInfo.channel, "Welle");
        return true;
    }
    return false;
};