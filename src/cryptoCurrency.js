var request = require("request");

var _clientInfo;
var _searchString = "";

module.exports = function (clientInfo, searchString) {
    _clientInfo = clientInfo;
    _searchString = searchString.toLowerCase();
    request("https://api.coinmarketcap.com/v1/ticker/?limit=20&convert=EUR", onResponse);
}

function onResponse(error, response, body) {
    if (!error) {
        try {
            var ticker = JSON.parse(body);
            var matchingCurrencies = ticker.filter(function(currency) {
                return currency.name.toLowerCase() == _searchString || currency.symbol.toLowerCase() == _searchString;
            });

            if (matchingCurrencies.length > 0) {
                var resultCurrency = matchingCurrencies[0];

                var message = "Price " + resultCurrency.price_eur + "€" + " | Change (24h) " + resultCurrency.percent_change_24h + "%";
                _clientInfo.client.say(_clientInfo.channel, message);
            }
        }
        catch (e) {
        }
    }
}
