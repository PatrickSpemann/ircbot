var ircbot = require("./src/ircbot");
var fs = require("fs");

var options = JSON.parse(fs.readFileSync("settings.json"));
ircbot.start(options);