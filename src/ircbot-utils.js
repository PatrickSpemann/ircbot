var isoHelp = require("iso8601-duration");
module.exports.formatDuration = function (durationString) {
    var durationObj = isoHelp.parse(durationString);
    var hh = module.exports.pad(durationObj.hours);
    var mm = module.exports.pad(durationObj.minutes);
    var ss = module.exports.pad(durationObj.seconds);
    if (hh === "00")
        return mm + ":" + ss;
    return hh + ":" + mm + ":" + ss;
};
module.exports.pad = function (numAsString) {
    var num = parseInt(numAsString);
    return num >= 10 ? num : "0" + num;
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