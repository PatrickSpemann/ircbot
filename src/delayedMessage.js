var fs = require("fs-extra");

var _client = undefined;
var _clientInfo = undefined;
var _userName = "";
var _namesRequested = false;
var _message = "";
var _stateFilePath = "./messages.json";
var _maxMessagesForUser = 1;
var _maxMessageLength = 200;

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
            _clientInfo.client.say(_clientInfo.channel, "Messages can at most be 200 characters.");
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
        if (state[_userName].length > _maxMessagesForUser) {
            _clientInfo.client.say(_clientInfo.channel, _userName + " cannot have more than " + _maxMessagesForUser + " messages waiting for them.");
            return;
        }
        state[_userName].push({
            sender: _clientInfo.userName,
            channel: _clientInfo.channel,
            message: _message
        });
        writeStateToFile(state);
        _clientInfo.client.say(_clientInfo.channel, "Message for " + _userName + " received.");
    },
    onJoin: function (channel, userName) {
        var state = getStateFromFile();
        if (!state[userName])
            return;
        for (var i = 0; i < state[userName].length; i++) {
            var messageObject = state[userName][i];
            if (messageObject.channel === channel)
                _client.say(channel, "Message for " + userName + " from " + messageObject.sender + ": " + messageObject.message);
        }
        delete state[userName];
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
        return fs.readJsonSync(_stateFilePath);
    }
    catch (e) {
        return {};
    }
}