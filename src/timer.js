/**
 * 
 */

var times = [];
var messages = [];

module.exports = {
	addTimer : function(clientInfo, parameters) {

		var parameterarray = parameters.split(' ');
		var time = 0;
		if (parameterarray.length > 1) {
			time = parseDate(parameterarray[0]);
			var message = parseMessage(parameterarray);
		}
		if (time === 0)
			return;
		addTimer(time, message);
		clientInfo.client.say(clientInfo.channel, 'Timer added.');

	},

	checkTimers : function(clientInfo) {
		var now = Date.now();
		for (i = 0; i < times.length; i++) {
			if (now >= times[i])
				postReminder(clientInfo, i);
		}
	}
};

function parseDate(dateString) {
	var days = 0;
	var hours = 0;
	var minutes = 0;
	var seconds = 0;

	var substring = dateString.split('d');
	if (substring.length === 2) {
		days = substring[0] * 86400000;
		substring.splice(0, 1);
	}
	substring.join();

	substring.split('h');
	if (substring.length === 2) {
		hours = substring[0] * 3600000;
		substring.splice(0, 1);
	}
	substring.join();

	substring.split('m');
	if (substring.length === 2) {
		minutes = substring[0] * 60000;
		substring.splice(0, 1);
	}
	substring.join();

	substring.split('s');
	if (substring.length === 2) {
		seconds = substring[0] * 1000;
	}

	if (days === 0 && hours === 0 && minutes === 0 && seconds === 0)
		return 0;

	var time = Date.now() + days + hours + minutes + seconds;
	return time;

}

function parseMessage(array) {
	var message = array.splice(0, 1);
	message.join();
	return message;
}

function addTimer(time, message) {
	times.push(time);
	messages.push(message);
}

function postReminder(clientInfo, index) {
	clientInfo.client.say(clientInfo.channel, messages[index]);
	times.splice(index, 1);
	messages.splice(index, 1);
}