var fs = require("fs-extra");
const stateFilePath = "./seenState.json";
module.exports = {
    registerEvents: registerEvents,
    getState: getState
};
function registerEvents(client) {
    client.addListener("part", function (channel, nick) {
        addOrUpdate(nick, channel);
    });
    client.addListener("quit", function (nick, reason, channels) {
        for (var i = 0; i < channels.length; i++)
            addOrUpdate(nick, channels[i]);
    });
    client.addListener("kick", function (channel, nick) {
        addOrUpdate(nick, channel);
    });
    client.addListener("kill", function (nick, reason, channels) {
        for (var i = 0; i < channels.length; i++)
            addOrUpdate(nick, channels[i]);
    });
    client.addListener("nick", function (oldNick, newNick, channels) {
        for (var i = 0; i < channels.length; i++)
            addOrUpdate(oldNick, channels[i]);
    });
}
function getState() {
    try {
        return fs.readJsonSync(stateFilePath);
    }
    catch (e) {
        return [];
    }
}
function writeState(stateObject) {
    try {
        fs.writeJsonSync(stateFilePath, stateObject);
    }
    catch (e) {
        console.log("error writing state to file: " + e);
    }
};
function addOrUpdate(name, channel) {
    var stateObject = getState();
    var existingObject = getFromState(stateObject, name, channel);
    if (existingObject)
        existingObject.date = new Date();
    else
        stateObject.push({
            name: name,
            channel: channel,
            date: new Date()
        });
    writeState(stateObject);
}
function getFromState(stateObject, name, channel) {
    for (var i = 0; i < stateObject.length; i++) {
        var obj = stateObject[i];
        if (obj.name === name && obj.channel === channel)
            return obj;
    }
    return undefined;
}




