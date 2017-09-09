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