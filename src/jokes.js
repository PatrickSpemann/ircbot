var chance = require("chance").Chance();
var fs = require("fs-extra");

var jokes = [];
try {
    jokes = fs.readJsonSync("jokes.json");
}
catch (e) {
    console.log("no jokes.json found!");
}
var cooldownActive = false;

module.exports = {
    get: function (clientInfo, parameters) {
        if (cooldownActive)
            return;
        var joke = chance.pickone(jokes);
        clientInfo.client.say(clientInfo.channel, joke.title);
        clientInfo.client.say(clientInfo.channel, joke.body);
        cooldownActive = true;
        setTimeout(function () {
            cooldownActive = false;
        }, 20 * 1000);
    }
};