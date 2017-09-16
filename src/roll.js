var utils = require("./ircbot-utils");
var chance = require("chance").Chance();
module.exports = function (clientInfo, range) {
    var range = getRangeFromInput(range);
    var result = chance.integer({ min: range.min, max: range.max });
    clientInfo.client.say(clientInfo.channel, "(" + range.min + "-" + range.max + "): " + result);
}
function getRangeFromInput(rangeAsString) {
    var result = {
        min: 1,
        max: 20
    }
    rangeAsString = rangeAsString.replace(/ /g, "").trim();
    var num = parseInt(rangeAsString);
    if (numOk(num))
        result.max = num;
    var parts = rangeAsString.split("-");
    if (parts.length === 2) {
        var min = parseInt(parts[0]);
        var max = parseInt(parts[1]);
        if (numOk(min) && numOk(max)) {
            result.min = min;
            result.max = max;
        }
    }
    return result;
}
function numOk(num) {
    return !isNaN(num) && isFinite(num);
}