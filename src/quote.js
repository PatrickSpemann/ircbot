var fs = require("fs-extra");
var chance = require("chance").Chance();

const quotesFilePath = "./quotes.json";

module.exports = {
    add: function (_clientInfo, parameters) {
        var quotesObject = getQuotesFromFile();
        var quoteString = parameters.trim();
        if (quoteString === "")
            return;
        quotesObject.push(parameters);
        writeQuotesToFile(quotesObject);
    },
    getRandom: function (_clientInfo, parameters) {
        var quotesObject = getQuotesFromFile();
        if (!quotesObject || quotesObject.length === 0)
            return;
        var quote = chance.pickone(quotesObject);
        _clientInfo.client.say(_clientInfo.channel, quote);
    }
};

function getQuotesFromFile() {
    try {
        return fs.readJsonSync(quotesFilePath);
    }
    catch (e) {
        return [];
    }
}
function writeQuotesToFile(quotesObject) {
    try {
        fs.writeJsonSync(quotesFilePath, quotesObject);
    }
    catch (e) {
        console.log("error writing quotes to file: " + e);
    }
};