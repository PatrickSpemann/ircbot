var isoHelp = require("iso8601-duration");
var pad = require("pad");
module.exports.formatDuration = function (durationString) {
    var durationObj = isoHelp.parse(durationString);
    var hh = pad(2, durationObj.hours, "0");
    var mm = pad(2, durationObj.minutes, "0");
    var ss = pad(2, durationObj.seconds, "0");
    if (hh === "00")
        return mm + ":" + ss;
    return hh + ":" + mm + ":" + ss;
};
module.exports.extractCommand = function (message) {
    if (message.indexOf("!") !== 0)
        return undefined;
    var spaceIndex = message.indexOf(" ");
    var end = spaceIndex === -1 ? undefined : spaceIndex;
    return message.substring(1, end);
};
module.exports.extractParameters = function (message) {
    var spaceIndex = message.indexOf(" ");
    if (spaceIndex === -1)
        return "";
    return message.substring(spaceIndex + 1);
};