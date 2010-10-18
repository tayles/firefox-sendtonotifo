var sendtonotifo = {

	defaultTitle: 'Send to Notifo',
	
	notificationBarId: 'sendtonotifo-popupbar',

	onLoad: function() {
			// initialization code
			this.initialized = true;
			this.strings = document.getElementById('sendtonotifo-strings');
			
			document.getElementById('contentAreaContextMenu')
		        .addEventListener('popupshowing', function(e) { sendtonotifo.showContextMenu(e); }, false);
		},

	onMenuItemCommand: function(e) {
			this.post(e);
		},

	onToolbarButtonCommand: function(e) {
			this.post(e);
		},

	getPrefs: function() {
			if( !this.prefs ) {
				this.prefs = Components.classes["@mozilla.org/preferences-service;1"]
									.getService(Components.interfaces.nsIPrefBranch)
									.getBranch("extensions.sendtonotifo.");
			}
			return this.prefs;
		},
		
	getPromptService: function() {
			if( !this.promptService ) {
				this.promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
											.getService(Components.interfaces.nsIPromptService);
			}
			return this.promptService;
		},
	
	getSelectedText: function() {
			return window.content.getSelection().toString();
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
				msg:	( selTxt.length > 0 ? selTxt : curUrl ),
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
			
			this.displayNotificationBar('Submitting to Notifo...', 'info');
			
			params = this.serialiseParams(params);
			
			var self = this;
			req.onreadystatechange = function() {
				if (this.readyState == 4) {
					//self.clearNotificationBar();
					var resp = this.responseText;
					switch (req.status) {
						case 200:
							//self.displayToast('Notification sent successfully');
							self.displayNotificationBar('Sent!', 'info');
							self.clearNotificationBarWithTimeout(500);
							break;
						default:
							self.displayNotificationBar('Failed to send item to Notifo: ' + resp, 'error');
							self.clearNotificationBarWithTimeout(4000);
							break;
					}
				}
			};
			req.open('POST', 'https://api.notifo.com/v1/send_notification', true);
			req.setRequestHeader('Authorization', auth);
			req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			req.send(params);
		},
		
	displayAlert: function(msg, title) {
			title = title || this.defaultTitle;
			var promptService = this.getPromptService();
			promptService.alert(window, title, msg);
		},
	
	displayToast: function(msg, title) {
			title = title || this.defaultTitle;
			try {
				Components.classes['@mozilla.org/alerts-service;1']
					.getService(Components.interfaces.nsIAlertsService)
					.showAlertNotification(
							'chrome://sendtonotifo/skin/notifo_logo_32x32.png',
							title,
							msg,
							false,
							'',
							null
						);
			}
			catch(e) {
				// prevents runtime error on platforms that don't implement nsIAlertsService
				this.displayAlert(title, msg);
			}
		},
		
	displayNotificationBar: function(msg, priorityLevel) {
			var nb = gBrowser.getNotificationBox();
			var n = nb.getNotificationWithValue(sendtonotifo.notificationBarId);
			
			var priority;
			switch(priorityLevel) {
				case 'error':
					priority = nb.PRIORITY_WARNING_LOW;
					break;
				case 'info':
				default:
					priority = nb.PRIORITY_INFO_LOW;
					break;
			}
			
			if(n) {
				if( n.priority == priority ) {
					n.label = msg;
					return;
				}
				else {
					// cannot change priority of current bar so hide and create a new one...
					sendtonotifo.clearNotificationBar();
				}
			}
			
			nb.appendNotification(
					msg,
					sendtonotifo.notificationBarId,
					'chrome://sendtonotifo/skin/notifo_logo_16x16.png',
					priority,
					null
				);
		},
		
	clearNotificationBar: function() {
			var nb = gBrowser.getNotificationBox();
			nb.removeNotification(nb.getNotificationWithValue(sendtonotifo.notificationBarId));
		},
	
	
	clearNotificationBarWithTimeout: function(millis) {
			var self = this;
			setTimeout( function() { self.clearNotificationBar(); }, millis );
		},
							
	showContextMenu: function(e) {
			var menuItem = document.getElementById('context-sendtonotifo');
			
			if(menuItem) {
				if( gContextMenu.onTextInput ) {
					menuItem.hidden = true;
					return;
				}
				
				// reset
				menuItem.hidden = false;
					
				if( gContextMenu.onImage ) {
					menuItem.label = 'Send Image to Notifo';
					return;
				}
				if( gContextMenu.onMailtoLink ) {
					menuItem.label = 'Send Email to Notifo';
					return;
				}
				if( gContextMenu.onLink ) {
					menuItem.label = 'Send Link to Notifo';
					return;
				}
				if( gContextMenu.isTextSelected ) {
					var selTxt = this.getSelectedText().trim();
					if( selTxt.length > 10 )
						selTxt = selTxt.substring(0, 10).trim() + '...';

					menuItem.label = 'Send "' + selTxt + '" to Notifo';
					return;
				}
				
				menuItem.label = 'Send Page to Notifo';
			}
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


window.addEventListener('load', sendtonotifo.onLoad, false);

String.prototype.trim = function() { return this.replace(/^\s+|\s+$/, ''); };