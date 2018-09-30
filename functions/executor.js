var crontime = require('cron-parser');
var fbadmin = require('firebase-admin');
var Gatherer = require('./gatherps');
var Gunner = require('./gunner');
var PSEWCore = require('./psewcore');

class Executor extends PSEWCore{
	constructor(firebase, croninf) {
		super(firebase,croninf);
		this.justcreated = !1;
		this.watchlist = [];
	}

	_preload() {
		return Promise.all([this.getLastUpdate(),this._g.establish()]).then(upds => {
			//oh its nothing new
			this.lastupdate = upds[0];
			return this.lastupdate;
		}).catch(() => {
			//means first time data
			//this is your starting point
			this.lastupdate = crontime.parseExpression(this._cinf).prev();
			this.justcreated = !0;
			return this._createNewData().then(() => this.lastupdate);
		});
	}

	_datapreload() {
		return this._preload().then(() => {
			return Promise.all([
				this._watchlistInit(),
				this._stockDataInit(),
				this._infoInit(),
				this.calculateDayDifference()
			]);
		})
		.then(() => this._metasInit())
		.then(() => this._detailsInit());
	}

	load() {
		console.log('beginning load.');
		return this._preload().then(() => {
			if (!this.justcreated){
				console.log('beginning preloads.');
				return this._datapreload()
					.then(() => {
						console.log('preload stuffs done');
						if (this.daydiffs.length > 0) 
							return this._execute();
						else
							return true;
					});
			} else {
				//this._kickgunner();
				return true;
			}
		});
	}

	_kickgunner() {
		this.gunner = new Gunner(this._cinf, this._execute.bind(this));
	}

	_execute() {
		return this.stockDataRequest().then(function(sdata) {
			this.sd.set(sdata);
			let detcalls = [];
			for (var i in this.watchlist) {
			//for (var i=0; i<this.watchlist.length; i++){
				let x=this.watchlist[i];
				detcalls.push(this._requestSymbol(x));
			}
			return Promise.all(detcalls).then(function(res){
				var _pcalls = [];
				for (var i=0; i<res.length; i++) {
					let sym = res[i].symbol, iref = this.inf.child(sym);
					let lref = this.dt.child(sym), lres = res[i].result.info, hres = res[i].result.history;
					iref.set(lres);
					_pcalls.push(this._pushFireBAsGroup(lref,hres,this.details[sym]));
					this.info[sym] = {...lres};
				}
				return Promise.all(_pcalls);
			}.bind(this)).then(() => {
				return this.writeLast5ToInfo();
			});
		}.bind(this));
	}

	_watchlistInit() {
		//get the values
		return this.wl.once('value').then(function(s) {
			this.watchlist = s.val();
			return this.watchlist;
		}.bind(this));
	}

	_stockDataInit() {
		return this.sd.once('value').then(function(snap){
			this.stockdata = snap.val();
			return this.stockdata;
		}.bind(this));
	}

	_metasInit() {
		return this.mt.once('value').then(function(snap){
			this.metas = snap.val();
			if (!this.metas) {
				this.metas = {};
				Object.keys(this.info).forEach(sym => {
					this.metas[sym] = {'prenums': [], 'values': {}};
				});
				this.mt.set(this.metas);
			}
			return this.metas;
		}.bind(this));
	}

	_infoInit() {
		return this.inf.once('value').then(function(snap){
			this.info = snap.val();
			return this.info;
		}.bind(this));
	}

	_detailsInit(lastrecords=15) {
		this.details = {};
		var _prcs = [], _lr = lastrecords;

		console.log('getting last',_lr);

		Object.keys(this.info).forEach(sym => {
			let _s = sym,
			_ot = this.dt.child(_s).limitToLast(_lr).once('value').then(snap => {
				let _vals = snap.val();
				this.details[_s] = _vals;
				return _vals;
			});
			_prcs.push(_ot);
		});

		return Promise.all(_prcs).then(() => this.details);
	}

	writeLast5ToInfo() {
		var _prcs = [];
		Object.keys(this.info).forEach(sym => {
			let res = this._grabPrenums(this.details[sym]);
			this.metas[sym].prenums = res;
			// console.log(sym,'result:',this.info[sym]);
			_prcs.push(this.mt.child(`${sym}/prenums`).set(res));
		});
		return Promise.all(_prcs);
	}

	stockDataRequest() {
		return Promise.all([this._g.get_ticker(),this._g.get_pse_list()]).then(function(arr){
			//stock data first
			var _ao = arr[0].shift();
			var sdate = new Date(_ao.securityAlias);
			var ndate = new Date(sdate.toDateString() +' 19:00:00');
			this.fbdb.ref('as_of').set(ndate.toString());
			var tick = arr[0], plist = arr[1].records, secsyms = plist.map(x => x.securitySymbol);
			var res = {};
			for (let i=0; i<tick.length; i++) {
				let sym = tick[i]['securitySymbol'];
				let iof = secsyms.indexOf(sym);
				res[sym] = { ...tick[i], ...plist[iof] };
			}
			this.stockdata = res;
			return res;
		}.bind(this));
	}

	_createNewData() {
		var dwl = require('./defwatchlist.json');
		var defwatchlist = dwl.list;
		var defcats = dwl.categories;
		//place the default list
		return this._pushFireBAsGroup(this.wl,defwatchlist,this.watchlist)
		.then(this._pushFireBAsGroup(this.ct,defcats))
		.then(this.stockDataRequest.bind(this))
		//create blanks for details
		.then(function(sdata){
			//save stockdata
			this.sd.set(sdata);

			var reqs = [];
			for (var i=0; i<defwatchlist.length; i++){
				let x=defwatchlist[i];
				reqs.push(this._requestSymbol(x,!0));
			}
			//load all info and history
			let _nsd = {}, _pfirst = {};
			this.details = {};
			return Promise.all(reqs).then(function(res){
				let promhist = [];
				for (let i=0; i<res.length; i++) {
					let sym = res[i]['symbol'];
					_nsd[sym] = res[i].result;
					this.inf.child(sym).set(_nsd[sym].info);
					promhist.push(this._pushFireBAsGroup(this.dt.child(sym),_nsd[sym].history,this.details[sym]));
				}
				return Promise.all(promhist).then(function(){
					return _nsd;
				});
			}.bind(this));
		}.bind(this));
	}
}

module.exports = Executor;