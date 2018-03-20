var fs = require("fs-extra");
var schedule = require("node-schedule");

const timersFilePath = "./timers.json";

module.exports = {
		add: function(clientInfo, parameters) {
			var parameterarray = parameters.split(' ');
			var time = 0;
			if (parameterarray.length > 1) {
				time = parseDate(parameterarray[0]);
				var message = clientInfo.userName + ': ' + parseMessage(parameterarray);
			}
			if (time === 0)
				return;
			addTimer(clientInfo, time, message);
			clientInfo.client.say(clientInfo.channel, 'Timer added.');
		},
		
		restore: function (client) {
			var timersObject = getTimersFromFile();
			var now = Date.now();
			var toBeRemoved = [];
			
			for(var i = 0; i < timersObject.length; i++) {
				var job = timersObject[i];
				if(job.time < now) {
					toBeRemoved.push(job);
				} else {
					schedule.scheduleJob(new Date(job.time), function () {
						client.say(job.channel, job.message);
					});
				}
			}
			
			for(var i = 0; i < toBeRemoved.length; i++) {
				timersObject.splice(timersObject.indexOf(toBeRemoved[i]), 1);
			}
			
			writeTimersToFile(timersObject);
		}
};

function parseDate(dateString) {
	var days = 0;
	var hours = 0;
	var minutes = 0;
	var seconds = 0;

	var time = '0';

	for(var i = 0; i < dateString.length; i++) {
		var char = dateString.charAt(i);
		
		switch (char) {
			case 'd':
				days = parseInt(time) * 86400000;
				time = '0';
				break;
			case 'h':
				hours = parseInt(time) * 3600000;
				time = '0';
				break;
			case 'm':
				minutes = parseInt(time) * 60000;
				time = '0';
				break;
			case 's':
				seconds = parseInt(time) * 1000;
				time = '0';
				break;
			default:
				time += char;
		}
	}

	if (days === 0 && hours === 0 && minutes === 0 && seconds === 0)
		return 0;

	var time = Date.now() + days + hours + minutes + seconds;
	return time;
}

function parseMessage(array) {
	var message = array.splice(1);
    return message.join(' ');
}

function addTimer(clientInfo, _time, _message) {
	var date = new Date(_time);
	schedule.scheduleJob(date, function () {
			clientInfo.client.say(clientInfo.channel, _message);
		});
	
	var timersObject = getTimersFromFile();
	var job = {
			time: _time,
			message: _message,
			channel: clientInfo.channel
		}
	timersObject.push(job);
	writeTimersToFile(timersObject);
}

function getTimersFromFile() {
    try {
        return fs.readJsonSync(timersFilePath);
    }
    catch (e) {
        return [];
    }
}
function writeTimersToFile(timersObject) {
    try {
        fs.writeJsonSync(timersFilePath, timersObject);
    }
    catch (e) {
        console.log("error writing timers to file: " + e);
    }
};