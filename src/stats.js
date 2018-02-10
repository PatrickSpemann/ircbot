var fs = require("fs-extra");

const statsFilePath = "./stats.json";

module.exports = {
    registerCommand: function (_clientInfo, command, parameters) {
        var statsObject = getStatsFromFile();
        statsObject.commands.push({
            command: command,
            params: parameters,
            user: _clientInfo.userName,
            date: new Date()
        })
        writeStatsToFile(statsObject);
    },
    getTop: function (_clientInfo, parameters) {
        var statsObject = getStatsFromFile();

        var commands = statsObject.commands.map(function (e) {
            return e.command;
        });
        var topCommandObj = getMaxOfArray(commands);

        var paramsForCommand = statsObject.commands.filter(function (e) {
            return e.command === topCommandObj.elem;
        }).map(function (e) {
            return e.params;
        });
        var topParamForCommand = getMaxOfArray(paramsForCommand);

        var usersForCommandAndParam = statsObject.commands.filter(function (e) {
            return e.command === topCommandObj.elem && e.params === topParamForCommand.elem;
        }).map(function (e) {
            return e.user;
        });
        var topUserForCommandAndParam = getMaxOfArray(usersForCommandAndParam);

        var result = "Top command: !" + topCommandObj.elem + " " + topParamForCommand.elem + " (Count: " + topParamForCommand.count + " User: " + topUserForCommandAndParam.elem + "[" + topUserForCommandAndParam.count + "])";
        _clientInfo.client.say(_clientInfo.channel, result);
    }
};

function getMaxOfArray(array) {
    var max = {
        count: 0,
        elem: null
    };
    var counters = {};
    for (var i = 0; i < array.length; i++) {
        var elem = array[i];

        if (!counters[elem])
            counters[elem] = 0;
        counters[elem]++;

        if (counters[elem] > max.count) {
            max.count = counters[elem];
            max.elem = elem;
        }
    }
    return max;
}

function getStatsFromFile() {
    try {
        return fs.readJsonSync(statsFilePath);
    }
    catch (e) {
        return { commands: [] };
    }
}
function writeStatsToFile(statsObject) {
    try {
        fs.writeJsonSync(statsFilePath, statsObject);
    }
    catch (e) {
        console.log("error writing stats to file: " + e);
    }
};