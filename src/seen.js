var Duration = require("duration");
var SeenState = require("./seenState");
var utils = require("./ircbot-utils");

var _clientInfo = undefined;
var _requestedName = "";
var _namesRequested = false;

module.exports = {
    get: get,
    onNames: onNames
};

function get(clientInfo, name) {
    _clientInfo = clientInfo;
    _requestedName = name.toLowerCase();
    if (_requestedName.length < 3) {
        _clientInfo.client.notice(_clientInfo.userName, "Names must have at least 3 characters!");
        return;
    }
    _namesRequested = true;
    _clientInfo.client.send("NAMES", _clientInfo.channel);
}
function onNames(channel, names) {
    if (!_namesRequested)
        return;
    _namesRequested = false;
    var result = getFromNames(channel, names);
    if (!result)
        result = getFromState();
    if (result) {
        if (result.date) { //taken from state
            var formattedDuration = formatDuration(result.date);
            _clientInfo.client.say(_clientInfo.channel, "I have last seen " + result.name + " here " + formattedDuration + " ago.");
        } else  //is present in channel
            _clientInfo.client.say(_clientInfo.channel, result.name + " is right here.");
    }
    else
        _clientInfo.client.say(_clientInfo.channel, "I haven't seen anyone with that name.");
}
function getFromNames(channel, names) {
    if (channel !== _clientInfo.channel)
        return undefined;
    var nameArray = utils.convertKeysToArray(names);
    var index = getBestMatchingIndex(nameArray, _requestedName);
    return index !== -1 ? { name: nameArray[index] } : undefined;
}
function getFromState() {
    var names = SeenState.state.filter(function (item) {
        return item.channel === _clientInfo.channel;
    }).map(function (item) {
        return item.name;
    });
    var index = getBestMatchingIndex(names, _requestedName);
    return index !== -1 ? SeenState.state[index] : undefined;
}
function getBestMatchingIndex(names, name) {
    var firstPartMatchIndex = -1;
    for (var i = 0; i < names.length; i++) {
        var lowerCaseName = names[i].toLowerCase();
        if (lowerCaseName === _requestedName)
            return i;
        else if (firstPartMatchIndex === -1 && lowerCaseName.indexOf(_requestedName) !== -1)
            firstPartMatchIndex = i;
    }
    return firstPartMatchIndex;
}
function formatDuration(date) {
    var now = new Date();
    var duration = new Duration(date, now); //old date must be first or the duration will be negative
    return duration.toString(1, 1);
}