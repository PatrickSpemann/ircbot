var utils = require("./ircbot-utils");
var chance = require("chance").Chance();

const defaultWeight = 100;
var answers = [];
function add(text, weight) {
    weight = weight || defaultWeight;
    answers.push({
        text: text,
        weight: weight
    });
}
add("It is certain");
add("It is decidedly so");
add("Without a doubt");
add("Yes definitely");
add("You may rely on it");
add("As I see it, yes");
add("Most likely");
add("Outlook good");
add("Yes");
add("Signs point to yes");

add("Reply hazy try again", 10);
add("Ask again later", 10);
add("Better not tell you now", 10);
add("Cannot predict now", 10);
add("Concentrate and ask again", 10);

add("Don't count on it");
add("My reply is no");
add("My sources say no");
add("Outlook not so good");
add("Very doubtful");

add("Yes, but you take an arrow to the knee!", 1);
add("No, but you take an arrow to the knee!", 1);

module.exports = function (clientInfo, question) {
    if (question.trim() === "")
        return;
    clientInfo.client.say(clientInfo.channel, getResponse(question));
};
function getResponse(question) {
    var texts = answers.map(function (item) {
        return item.text;
    });
    var weights = answers.map(function (item) {
        return item.weight;
    })
    return chance.weighted(texts, weights);
}
