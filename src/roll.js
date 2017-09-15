module.exports = function (clientInfo, range) {
    var range = getRangeFromInput(range);
    var result = getRandomInteger(range.min, range.max);
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
function getRandomInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function numOk(num) {
    return !isNaN(num) && isFinite(num);
}