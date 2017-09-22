module.exports = {
    state: [
        {
            name: "test",
            channel: "#mystdev",
            date: new Date()
        }
    ],
    addOrUpdate: addOrUpdate,
    onPart: onPart,
    onQuit: onQuit,
    onKick: onKick,
    onKill: onKill,
    onNick: onNick
};
function addOrUpdate(name, channel) {
    var existingObject = getFromState(name, channel);
    if (existingObject)
        existingObject.date = new Date();
    else
        module.exports.state.push({
            name: name,
            channel: channel,
            date: new Date()
        });
}
function getFromState(name, channel) {
    for (var i = 0; i < module.exports.state.length; i++) {
        var obj = module.exports.state[i];
        if (obj.name === name && obj.channel === channel)
            return obj;
    }
    return undefined;
}
function onPart(channel, nick) {
    addOrUpdate(nick, channel);
}
function onQuit(nick, reason, channels) {
    for (var i = 0; i < channels.length; i++)
        addOrUpdate(nick, channels[i]);
}
function onKick(channel, nick) {
    addOrUpdate(nick, channel);
}
function onKill(nick, reason, channels) {
    for (var i = 0; i < channels.length; i++)
        addOrUpdate(nick, channels[i]);
}
function onNick(oldNick, newNick, channels) {
    for (var i = 0; i < channels.length; i++)
        addOrUpdate(oldNick, channels[i]);
}