var fs = require("fs-extra");

const statsFilePath = "./ignoreList.json";

module.exports = {
    contains,
    addToList,
    removeFromList
};

function contains (userName){
    var list = readFromFile();
    return list.includes(userName.toLowerCase());
}

function addToList (userName){
    userName = userName.toLowerCase();
    var list = readFromFile();
    if(!list.includes(userName))
        list.push(userName);
    writeToFile(list);
}

function removeFromList(userName){
    userName = userName.toLowerCase();
    var list = readFromFile();
    list = list.filter(function(e) {
        return e !== userName;
      });
    writeToFile(list);
}

function writeToFile(list) {
	try {
		fs.writeJsonSync(statsFilePath, list);
	}
	catch (e) {
		console.log("error writing timers to file: " + e);
	}
};

function readFromFile() {
	try {
		return fs.readJsonSync(statsFilePath);
	}
	catch (e) {
		return [];
	}
}