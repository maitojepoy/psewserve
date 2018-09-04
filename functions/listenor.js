
var crontime = require('cron-parser');
var fbadmin = require('firebase-admin');
var Gatherer = require('./gatherps');
var Gunner = require('./gunner');
var PSEWCore = require('./psewcore');

class Listenor extends PSEWCore {
	constructor(firebase, croninf) {
		super(firebase, croninf);
	}

	load(noChrome) {
		let _prcs = [this.getLastUpdate()];
		if (!noChrome) _prcs.push(this._g.establish());
		return Promise.all(_prcs).then(function(upds){
			this.lastupdate = upds[0];
			return this.lastupdate;
		}.bind(this)).then(this.calculateDayDifference.bind(this));
	}

	addToWatchlist(snap) {
		var sym = snap.val();
		return this._requestSymbol(sym,!0).then(s => {
			let _s = s.symbol;
			this.inf.child(_s).set(s.result.info);
			let prens = this._grabPrenums(s.result.history);
			let _prcs = [this.mt.child(`${_s}/prenums`).set(prens),
				this._pushFireBAsGroup(this.dt.child(_s),s.result.history)];
			return Promise.all(_prcs);
		});
	}

	removeFromWatchlist(snap) {
		var sym = snap.val();
		let _s = sym.securitySymbol;
		this.inf.child(_s).remove();
		this.mt.child(_s).remove();
		return this.dt.child(_s).remove();
	}
}

module.exports = Listenor;