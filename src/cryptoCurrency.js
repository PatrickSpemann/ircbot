var request = require("request");
var chance = require("chance").Chance();

var _clientInfo;
var _searchString = "";
var _isGromb = false;

module.exports = function (clientInfo, searchString) {
    _clientInfo = clientInfo;
    _searchString = searchString.toLowerCase();
    _isGromb = false;
    if (isGromb(searchString))
        _isGromb = true;
    request("https://api.coinmarketcap.com/v1/ticker/?limit=50", onResponse);
}

function isGromb(searchString) {
    var strings = ["grmb", "gromb", "grombcoin", "grmbcoin", "grmbc"];
    return strings.indexOf(searchString) !== -1;
}

function onResponse(error, response, body) {
    if (!error) {
        try {
            var ticker = JSON.parse(body);
            var c = getMatchingCurrency(ticker);
            if (c)
                postCryptoMessage(c.price_usd, c.percent_change_1h, c.percent_change_24h, c.percent_change_7d);
        }
        catch (e) {
        }
    }
}

function getMatchingCurrency(ticker) {
    var randomCurrency = chance.pickone(ticker);
    var result = randomCurrency;
    if (!_isGromb)
        result = ticker.filter(function (currency) {
            return currency.name.toLowerCase() == _searchString || currency.symbol.toLowerCase() == _searchString;
        });
    if (result.length > 0)
        result = result[0];
    return result;
}

function postCryptoMessage(price_usd, percent_change_1h, percent_change_24h, percent_change_7d) {
    var message = "Price: $" + price_usd
        + " | Change: " + percent_change_1h + "% (1h)"
        + " / " + percent_change_24h + "% (24h)"
        + " / " + percent_change_7d + "% (7d)";
    _clientInfo.client.say(_clientInfo.channel, message);
}
