var fs = require("fs-extra");

var _client = undefined;
var _clientInfo = undefined;
var _userName = "";
var _namesRequested = false;
var _message = "";
var _stateFilePath = "./messages.json";
var _maxMessagesForUser = 3;
var _maxMessageLength = 200;
var _messageDurationMsec = 1000 * 60 * 60 * 24 * 7; //7 days

module.exports = {
    setClient: function (clientObject) {
        _client = clientObject;
    },
    register: function (clientInfo, parameters) {
        _clientInfo = clientInfo;
        if (parameters.split(" ").length < 2)
            return;
        _userName = parameters.split(" ")[0].toLowerCase();
        _message = parameters.substring(parameters.indexOf(" ") + 1);
        if (_message.length > _maxMessageLength) {
            _clientInfo.client.say(_clientInfo.channel, "Messages can at most be " + _maxMessageLength + " characters.");
            return;
        }
        _namesRequested = true;
        _clientInfo.client.send("NAMES", _clientInfo.channel);
    },
    onNames: function (channel, names) {
        if (!_namesRequested)
            return;
        _namesRequested = false;
        if (userIsInChannel(names))
            return;
        var state = getStateFromFile();
        if (!state[_userName])
            state[_userName] = [];
        if (state[_userName].length >= _maxMessagesForUser) {
            _clientInfo.client.say(_clientInfo.channel, _userName + " cannot have more than " + _maxMessagesForUser + " messages waiting for them.");
            return;
        }
        state[_userName].push({
            sender: _clientInfo.userName,
            channel: _clientInfo.channel,
            message: _message,
            expires: new Date().getTime() + _messageDurationMsec
        });
        writeStateToFile(state);
        _clientInfo.client.say(_clientInfo.channel, "Message for " + _userName + " received.");
    },
    onJoin: function (channel, userName) {
        lowerCaseUserName = userName.toLowerCase();
        var state = getStateFromFile();
        if (!state[lowerCaseUserName])
            return;
        for (var i = 0; i < state[lowerCaseUserName].length; i++) {
            var messageObject = state[lowerCaseUserName][i];
            if (messageObject.channel === channel)
                _client.say(channel, "Message for " + userName + " from " + messageObject.sender + ": " + messageObject.message);
        }
        delete state[lowerCaseUserName];
        writeStateToFile(state);
    }
};

function userIsInChannel(names) {
    var namesArray = Object.keys(names);
    namesArray = namesArray.map(function (e) {
        return e.toLowerCase();
    });
    return namesArray.indexOf(_userName) !== -1;
}
function removeExpiredMessages(state) {
    var currentTime = new Date().getTime();
    for (var name in state) {
        if (!state.hasOwnProperty(name))
            continue;
        var indicesToRemove = [];
        for (var i = 0; i < state[name].length; i++)
            if (state[name][i].expires <= currentTime)
                indicesToRemove.push(i);
        for (var i = indicesToRemove.length - 1; i >= 0; i--) //go backwards to not mess up order when removing multiples
            state[name].splice(indicesToRemove[i], 1);
    }
}
function writeStateToFile(state) {
    try {
        fs.writeJsonSync(_stateFilePath, state);
    }
    catch (e) {
        console.log("error writing state to file: " + e);
    }
}
function getStateFromFile() {
    try {
        var state = fs.readJsonSync(_stateFilePath);
        removeExpiredMessages(state);
        return state;
    }
    catch (e) {
        return {};
    }
}