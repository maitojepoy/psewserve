const puppeteer = require('puppeteer');

class BrowseRequest {
	constructor (url_domain,url_home) {
		this.domainurl = url_domain;
		this.homeurl = url_home;
		this.requests = 0;
		this.launched = !1;
	}

	get hasRequests() {
		return this.requests > 0;
	}

	begin() {
		return puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']}).then(function (b) {
			this.browser = b;
			this.launched = !0;
			return b.newPage();
		}.bind(this)).then(function(p){
			this.page = p;
			console.log('beginning session at ',this.domainurl+this.homeurl);
			return this.page.goto(this.domainurl+this.homeurl);
		}.bind(this)).then(function(r){
			console.log('response arrive. get text');
			return r.text();
		}).then(function(txt){
			//console.log(txt);
			return this;
		}.bind(this));
	}

	close() {
		this.launched = !1;
		return this.browser.close();
	}

	requestPost (child_url, postvars, as_json=!1, method="POST") {
		// this.requests++;
		return this.page.evaluate(function(url,pvars,asjson,method) {
			var params = { method };
			if (pvars != null) {
				var f = new FormData();
				for (var p in pvars) {
					f.append(p, pvars[p]);
				}
				params['body'] = f;
			}
			return fetch(url, params).then(r => {
				//--this.requests;
				return asjson ? r.json() : r.text();
			});
		},this.domainurl+child_url,postvars,as_json,method)
		.catch(e => {
			console.log(e);
			// --this.requests;
			return e;
		});
	}
}

module.exports = BrowseRequest;