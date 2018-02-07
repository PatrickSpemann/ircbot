var fs = require("fs-extra");

const statsFilePath = "./stats.json";

module.exports = {
    registerCommand: function (_clientInfo, command, parameters) {
        var statsObject = getStatsFromFile();

        if (!statsObject.commands[command])
            statsObject.commands[command] = [];

        statsObject.commands[command].push({
            name: _clientInfo.userName,
            params: parameters
        })

        writeStatsToFile(statsObject);
    },
    getTop: function (_clientInfo, parameters) {
        //TODO HOLY SHIT THIS IS UGLY
        var statsObject = getStatsFromFile();

        var maxUsedCommand = "";
        var maxCommandCount = 0;
        for (var command in statsObject.commands) {
            if (statsObject.commands[command].length > maxCommandCount) {
                maxUsedCommand = command;
                maxCommandCount = statsObject.commands[command].length
            }
        }

        var counters = {
            params: {},
            names: {}
        };
        var list = statsObject.commands[maxUsedCommand];
        for (var i = 0; i < list.length; i++) {
            var listObj = list[i];

            if (!counters.params[listObj.params])
                counters.params[listObj.params] = 0;
            counters.params[listObj.params]++;

            if (!counters.names[listObj.name])
                counters.names[listObj.name] = 0;
            counters.names[listObj.name]++;
        }

        var maxParameter = "";
        var maxParameterCount = 0;
        for (var param in counters.params) {
            if (counters.params[param] > maxParameterCount) {
                maxParameterCount = counters.params[param];
                maxParameter = param;
            }
        }

        var maxUser = "";
        var maxUserCount = 0;
        for (var name in counters.names) {
            if (counters.names[name] > maxUserCount) {
                maxUserCount = counters.names[name];
                maxUser = name;
            }
        }

        var result = "Top command: !" + maxUsedCommand + " " + maxParameter + " (Count: " + maxCommandCount + " User: " + maxUser + ")";
        _clientInfo.client.say(_clientInfo.channel, result);
    }
};

function getStatsFromFile() {
    try {
        return fs.readJsonSync(statsFilePath);
    }
    catch (e) {
        return { commands: {} };
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