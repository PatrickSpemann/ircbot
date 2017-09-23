var utils = require("./ircbot-utils");
module.exports = function (clientInfo, message) {
    var trimmed = message.trim();
    var tildeCount = utils.countSubStringInString(trimmed, "~");
    if (tildeCount === trimmed.length) {
        var response = "";
        for (var i = 0; i < tildeCount; i++)
            response += "Welle";
        clientInfo.client.say(clientInfo.channel, response);
        return true;
    }
    return false;
};