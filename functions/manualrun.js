var Executor = require('./executor');

const executeIt = () => {
	const _cron = '0 00 19 * * 1-5'; //7:00pm weeknights
	// var _cron = '*/3 * * * * *'; //test for 3 seconds
	// var _cron = '04 19 * * 7'; //test for specific time (min, hour, <any day>,<any month>,<weekdays>)
	var fburl = 'https://psew-a6c11.firebaseio.com';
	var fbserveacc = require('./accntkey.json');
	var _x = new Executor({ url:fburl,key:fbserveacc }, _cron);
	//_x.load();
	return _x._datapreload().then(() => _x.writeLast5ToInfo());
}

executeIt();