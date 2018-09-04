const functions = require('firebase-functions');
const admin = require('firebase-admin');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });


/** This file is now for Google Cloud Functions. If you want to run it manually, use manualrun.js or run "npm start". */

const _cron = '0 00 19 * * 1-5'; //7:00pm weeknights
// const _cron = '*/3 * * * * *'; //test for 3 seconds
// const _cron = '04 19 * * 7'; //test for specific time (min, hour, <any day>,<any month>,<weekdays>)

admin.initializeApp();

// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

exports.executePSEW = functions.region('asia-northeast1').https.onRequest((req, res) => {
    var Executor = require('./executor');
    //first param was { url:fburl,key:fbserveacc }
	var _x = new Executor(admin, _cron);
	_x.load().then(() => {
        let message = 'Executed.';
        res.send(message);
		// res.status(200).send(message);
	});
});

const newListnr = () => {
	var Listenor = require('./listenor');
	return new Listenor(admin, _cron);
};

exports.newItemToWatchlist = functions.region('asia-northeast1').database.ref('/watchlist/{pushId}')
    .onCreate((snap, context) => {
      // Grab the current value of what was written to the Realtime Database.
      var _x = newListnr();
      return _x.load().then(() => {
		return _x.addToWatchlist(snap);
	  });
    });

/* exports.newItemToWatchlist = (snap,context) => {
	var _x = newListnr();
	_x.load().then(() => {
		return _x.addToWatchlist(snap);
	}).then(() => {
		let message = 'Added.';
		res.status(200).send(message);
	});
} */

exports.delItemFromWatchlist = functions.region('asia-northeast1').database.ref('/watchlist/{pushId}')
    .onDelete((snap, context) => {
        var _x = newListnr();
        return _x.load(true).then(() => {
            return _x.removeFromWatchlist(snap);
        });
    });
        


// exports.delItemFromWatchlist = (snap,context) => {
// 	var _x = newListnr();
// 	_x.load().then(() => {
// 		return _x.removeFromWatchlist(snap);
// 	}).then(() => {
// 		let message = 'Removed.';
// 		res.status(200).send(message);
// 	});
// }