var utils = require("./ircbot-utils");
module.exports = function (clientInfo, message, ownNickname) {
    var trimmed = message.trim();
    if (trimmed.toLowerCase().indexOf("danke " + ownNickname.toLowerCase()) === 0) {
        clientInfo.client.say(clientInfo.channel, "Bitte, " + clientInfo.userName);
        return true;
    }
    if (trimmed.indexOf("~") !== -1) {
        clientInfo.client.say(clientInfo.channel, "Welle");
        return true;
    }
    return false;
};