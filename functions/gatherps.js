var BrowseRequest = require('./browserequest');

class Gatherer {
	constructor() {
		this.est = !1;
		this.lasthistdata = {};
		this.lastinfdata = {};
		this.mainurl = 'http://www.pse.com.ph/stockMarket/';
		this.browser = new BrowseRequest(this.mainurl, 'home.html');
	}
	establish(){
		return this.browser.launched ? Promise.resolve(this.browser) : this.browser.begin();
	}
	get_ticker() {
		return this.establish().then(r => 
			r.requestPost('home.html?method=getSecuritiesAndIndicesForPublic&ajax=true',null,!0))
			.then(function(ti){
				this.ticker = ti;
				return ti;
			}.bind(this));
	}
	get_pse_list() {
		return this.establish().then(r => 
			r.requestPost('companyInfoSecurityProfile.html?method=getListedRecords&common=yes&ajax=true',null,!0))
			.then(function(ti){
				this.pselist = ti;
				return ti;
			}.bind(this));
	}
	get_history_by_sec(scid) {
		return this.establish().then(r => 
			r.requestPost('companyInfoHistoricalData.html?method=getRecentSecurityQuoteData&ajax=true',
				{'security':scid},!0))
			.then(function(ti){
				//huh?
				//this.lasthistdata[ccode] = ti;
				return ti;
			}.bind(this));
	}
	get_companyinfo_by_sec(scid, cid) {
		return this.establish().then(r => 
			r.requestPost('companyInfo.html?method=fetchHeaderData&ajax=true',
				{'company':cid,'security':scid},!0))
			.then(function(ti){
				//this.lastcompinfo = ti;
				return ti;
			}.bind(this));
	}
}

module.exports = Gatherer;

/* var g = new Gatherer();
g.establish().then(function () {
	return g.get_ticker();
}).then(function (r) {
	console.log(r);
}); */