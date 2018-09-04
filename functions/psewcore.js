var crontime = require('cron-parser');
var Gatherer = require('./gatherps');
var fbadmin;

class PSEWCore {
    constructor(firebase, croninf)  {
		if ('url' in firebase && 'key' in firebase) {
			fbadmin = require('firebase-admin');
			fbadmin.initializeApp({
				credential: fbadmin.credential.cert(firebase.key),
				databaseURL: firebase.url
			});
		}else fbadmin = firebase;
        this._cinf = croninf;
        this.fbdb = fbadmin.database();

		this.ct = this.fbdb.ref('categories');
		this.wl = this.fbdb.ref('watchlist');
		this.mt = this.fbdb.ref('metas');
		this.sd = this.fbdb.ref('stockdata');
		this.dt = this.fbdb.ref('details');
		this.inf = this.fbdb.ref('info');

        this._g = new Gatherer();
    }

    _pushFireBAsGroup(ref,items,loc_arr) {
		let updates = {};
		for (var j=0; j<items.length; j++){
			let lekey = ref.push().key;
			if (loc_arr) loc_arr[lekey] = {...items[j]};
			updates[lekey] = items[j];
		}
		return ref.update(updates);
	}

    _requestSymbol(x,histmode) {
		let _put_hist = histmode || !1;
		let _u = [this._g.get_history_by_sec(x.securitySymbolId), 
				  this._g.get_companyinfo_by_sec(x.securitySymbolId, x.companyId), 
				  x.securitySymbol, 
				  _put_hist];
		return Promise.all(_u).then(function(res){
			var _hist = res[0].records, sym = res[2];
			var _inf = { ..._hist[0], ...res[1].records[0] };
			_hist[0] = { ..._inf };
			_hist = _hist.reverse();
			if (res[3]) {
				//entire given history from remote
				return {'symbol':sym,'result': {'info':_inf,'history':_hist}};
			}else{
				//only the last dates not requested
				//console.log('for sym',sym);
				//console.log('raw filt',_hist);
				var daydiffts = this.daydiffs.map(x => {
					return +new Date(new Date(x).toDateString());
				});
				var _filthist = _hist.filter(function(x) {
					return daydiffts.indexOf(+new Date(new Date(x.tradingDate).toDateString())) != -1;
				}.bind(this));
				//console.log('filtered',_filthist);
				return {'symbol':sym,'result': {'info':_inf,'history':_filthist}};
			}
		}.bind(this));
	}
	
	_grabPrenums(symobj) {
		return Object.keys(symobj).slice(-5)
				.map( key => symobj[key])
				.map( obj => ({
						'lastTradePrice': obj.lastTradePrice,
						'tradingDate': obj.tradingDate,
						'changeClose': obj.changeClose,
						'headerCurrentPe': obj.headerCurrentPe || '~',
						'totalVolume': obj.totalVolume
					})
				);
	}

	calcTime(offset, d) {
		// create Date object for current location
		if (!d) d = new Date();
	
		// convert to msec
		// subtract local time zone offset
		// get UTC time in msec
		var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
	
		// create new Date object for different city
		// using supplied offset
		return new Date(utc + (3600000*offset));
	}
	
    
    calculateDayDifference() {
		var options = {
			currentDate: this.calcTime(8,new Date(this.lastupdate)),
			endDate: this.calcTime(8),
			iterator: true
		};
		return new Promise(function(res,rej){
			let dates = [];
			try {
				let interval = crontime.parseExpression(this._cinf, options);
				let hasnext = !0;
				while (hasnext) {
					try {
						var obj = interval.next();
						dates.push(obj.value);
						hasnext = !obj.done;
					} catch (e) {
						hasnext = !1;
						//break;
					}
				}
				this.daydiffs = dates;
				console.log('the missing dates',dates);
				res(dates);
			} catch (err) {
				rej(err);
			}
		}.bind(this));

	}

    getLastUpdate() {
		return this.fbdb.ref('as_of').once('value').then(function(snap){
			var sn = snap.val();
			if (sn == null) return Promise.reject(+new Date());
			else return new Date(sn);
		});
	}
}

module.exports = PSEWCore;