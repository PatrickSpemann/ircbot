const request = require("request");


module.exports = function (clientInfo, searchString) {
    const queryParams = {
        APPID: "373bba379cdf83b527cd152463e0e996",
        units: "metric",
        lang: "en",
        q: searchString
    };

    request("http://api.openweathermap.org/data/2.5/weather", { qs: queryParams }, function (error, response, body) {
        if (error != null || response.statusCode != 200) {
            return;
        }

        const weatherResponse = JSON.parse(body);
        const weatherDescription = weatherResponse.weather
            .map(item => item.description)
            .join(", ");

        const message = `Temp: ${weatherResponse.main.temp}°C |` +
            ` Weather: ${weatherDescription} |` +
            ` Cloudiness: ${weatherResponse.clouds.all}% |` +
            ` Humidity: ${weatherResponse.main.humidity}% |` +
            ` Wind speed: ${weatherResponse.wind.speed} m/s`;

        clientInfo.client.say(clientInfo.channel, message);
    })
};