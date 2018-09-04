var crontime = require('cron-parser');
class Gunner {
	constructor(cronstring, fxn) {
		this._cron = cronstring;
		if (fxn) this._fxn = fxn;
		this.makeCron();
	}
	set fxn(_f) { 
		this._fxn = _f; 
		if (this._fxn) this._startTimer();
	}
	get fxn() { return this._fxn; }
	get next() {
		return this._next;
	}
	makeCron() {
		this._cronr = this.genCron();
		this._next = this._cronr.next();
		console.log('will execute in',this._next.toString());
		if (this._fxn) this._startTimer();
	}
	_startTimer() {
		this._now = Date.now();
		this.createTimer(this._next.getTime()-this._now).then(this._fxn);
	}
	genCron() {
		return crontime.parseExpression(this._cron);
	}
	createTimer(ms) {
		return new Promise(function (rs) {
			this._st = setTimeout(function(){
				rs();
				this.makeCron();
			}.bind(this),ms);
		}.bind(this));
	}
}

module.exports = Gunner;