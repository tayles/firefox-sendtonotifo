var sendtonotifo = {

	onLoad: function() {
			// initialization code
			this.initialized = true;
			this.strings = document.getElementById("sendtonotifo-strings");
		},

	onMenuItemCommand: function(e) {
			this.post(e);
		},

	onToolbarButtonCommand: function(e) {
			this.post(e);
		},

	getPrefs: function() {
			if( !this.prefs ) {
				this.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch).getBranch("extensions.sendtonotifo.");
			}
			return this.prefs;
		},
		
	getPromptService: function() {
			if( !this.promptService ) {
				this.promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
			}
			return this.promptService;
		},
	
	getSelectedText: function() {
			return window.content.getSelection();
		},

	getCurrentUrl: function() {
			return window.top.getBrowser().selectedBrowser.contentWindow.location.href;
		},
		
	getCurrentTitle: function() {
			return window.content.document.title;
		},

	getCredentials: function() {
			var prefs = this.getPrefs();
			
			var u = prefs.getCharPref("userName");
			var a = prefs.getCharPref("apiSecret");
			return { userName: u, apiSecret: a };
		},

	post: function(e) {
			var selTxt = this.getSelectedText();
			var curUrl = this.getCurrentUrl();
			var docTitle = this.getCurrentTitle();
			
			var notification = {
				msg:	( selTxt.length ? selTxt : curUrl ),
				title:	docTitle,
				label:	"Firefox",
				uri:	curUrl
			};
			
			if( true ) {
				notification = this.performSubstitutions(notification);
			}
			
			this.send(notification);
		},
	
	performSubstitutions: function(notification) {
	
			// TODO...
		
			return notification;
		},
	
	serialiseParams: function(arr) {
			var out = '';
			for( var key in arr ) {
				if( out.length ) out += '&';
				out += key + '=' + encodeURIComponent(arr[key]);
			}
			return out;
		},
		
	send: function(notification) {
			var req = new XMLHttpRequest();
			var creds = this.getCredentials();
			var auth = "Basic " + Base64.encode(creds.userName + ":" + creds.apiSecret);
			var params = {
				to:		creds.userName,
				msg:	notification.msg,
				uri:	notification.uri,
				label:	notification.label,
				title:	notification.title,
			};
			
			params = this.serialiseParams(params);
			var promptService = sendtonotifo.getPromptService();
			promptService.alert(window, "Send to Notifo", params);
			
			req.onreadystatechange = function() {
				if (this.readyState == 4) {
					var promptService = sendtonotifo.getPromptService();
					var resp = this.responseText;
					switch (req.status) {
						case 200:
							promptService.alert(window, "Send to Notifo", "Message sent:\n" + resp);
							break;
						default:                
							promptService.alert(window, "Send to Notifo", "Failed to send to Notifo:\n" + resp);
							break;
					}
				}
			};
			req.open('POST', 'https://api.notifo.com/v1/send_notification', true);
			req.setRequestHeader('Authorization', auth);
			req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			req.send(params);
		}
};


sendtonotifo.substitutions = {
	"twitter":		{ title: "Twitter", url: "twitter://user?screen_name={[0]}", msg: "@{[0]}" },
	"url":			{ title: "URL" },
	"txt":			{ title: "Text" },
	"tel":			{ title: "Phone", url: "tel:{[0]}" },
	"skype":		{ title: "Skype", url: "skype:{[0]}" },
	"itunes":		{ title: "iTunes", url: "itms://ax.itunes.apple.com/WebObjects/MZSearch.woa/wa/search?term={[0]}", capitalise: true },
	"app":			{ title: "App Store", url: "itms://ax.search.itunes.apple.com/WebObjects/MZContentLink.woa/wa/link?path=apps/{[0]}", capitalise: true },
	"map":			{ title: "Map", url: "http://maps.google.com/maps?q={[0]}", capitalise: true },
	"directions":	{ title: "Directions", url: "http://maps.google.com/maps?saddr={0[0]}&daddr={0[1]}", msg: "{0[0]} -> {0[1]}", capitalise: true },
	"goto":			{ title: "Directions", url: "http://maps.google.com/maps?daddr={[0]}", msg: "{[0]}", capitalise: true },
	"todo":			{ title: "Todo", url: "appigotodo://phonepipe/import?name={[0]}", msg: "{[0]}", encode: true },
};


window.addEventListener("load", sendtonotifo.onLoad, false);