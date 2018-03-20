var schedule = require("node-schedule");

module.exports = function(clientInfo, parameters) {
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

function addTimer(clientInfo, time, message) {
	var date = new Date(time);
	var job = schedule.scheduleJob(date, function () {
			clientInfo.client.say(clientInfo.channel, message);
		});
}