var utils = require("./ircbot-utils");
var chance = require("chance").Chance();

const positive = [
    "It is certain",
    "It is decidedly so",
    "Without a doubt",
    "Yes definitely",
    "You may rely on it",
    "As I see it, yes",
    "Most likely",
    "Outlook good",
    "Yes",
    "Signs point to yes"
];
const neutral = [
    "Reply hazy try again",
    "Ask again later",
    "Better not tell you now",
    "Cannot predict now",
    "Concentrate and ask again"
];
const negative = [
    "Don't count on it",
    "My reply is no",
    "My sources say no",
    "Outlook not so good",
    "Very doubtful"
];
const secret = [
    "Yes, but you take an arrow to the knee!",
    "No, but you take an arrow to the knee!"
];

module.exports = function (clientInfo, question) {
    if (question.trim() === "")
        return;
    clientInfo.client.say(clientInfo.channel, getResponse(question));
};
function getResponse(question) {
    var category = getCategory();
    return chance.pickone(category);
}
function getCategory() {
    var randomInt = chance.integer({ min: 0, max: 100 })
    if (randomInt === 0)
        return secret;
    else if (randomInt <= 20)
        return neutral;
    else if (randomInt <= 60)
        return negative;
    else
        return positive;
}
