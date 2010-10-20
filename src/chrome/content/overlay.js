function debug(msg) {
  var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                                 .getService(Components.interfaces.nsIConsoleService);

  consoleService.logStringMessage(stringify(msg));
}

function stringify(obj) {
	if( typeof obj == 'object' ) {
		var tostr = '';
		for( var key in obj ) {
			tostr += key + ":\t" + obj[key] + "\n"
		}
		obj = tostr;
	}
	return '' + obj;
}

function cleanURI(str, p1) { return decodeURIComponent(p1.replace(/\+/g, ' ')); }
function capitalise(str, p1, p2) { return (p2 ? p2.clean().capitalise() : p1.clean().capitalise()); }
	

var sendtonotifo = {

	defaultTitle: 'Send to Notifo',
	
	notificationBarId: 'sendtonotifo-popupbar',
	
	notifo_api_url: 'https://api.notifo.com/v1/send_notification',
	
	defaultTruncationLength: 10,
	
	substitutions: {
			google_directions: { title: 'Directions', url_regex: 'http://maps\.google\.[a-z\.]{2,6}/maps\?(.*(?=saddr=([^&]+)).*(?=daddr=([^&]+)).*)', url: 'http://maps.google.com/maps?$1', msg: function(str, p1, p2, p3) { return p2.clean().capitalise() + ' -> ' + p3.clean().capitalise(); } },	// http://maps.google.co.uk/maps?f=d&source=s_d&saddr=reading&daddr=london&hl=en&geocode=FUEkEQMdgDbx_ym3PT3ZeCB0SDGUefrOf5_hKg%3BFXjUEQMd5BL-_yl13iGvC6DYRzGZKtXdWjqWUg&mra=ls&sll=53.800651,-4.064941&sspn=18.514185,57.084961&ie=UTF8&t=h&z=11
			google_goto: { title: 'Directions', url_regex: 'http://maps\.google\.[a-z\.]{2,6}/maps\?(.*(?=daddr=([^&]+)).*)', url: 'http://maps.google.com/maps?$1', msg: capitalise },	// http://maps.google.co.uk/maps?f=d&source=s_d&saddr=reading&daddr=london&hl=en&geocode=FUEkEQMdgDbx_ym3PT3ZeCB0SDGUefrOf5_hKg%3BFXjUEQMd5BL-_yl13iGvC6DYRzGZKtXdWjqWUg&mra=ls&sll=53.800651,-4.064941&sspn=18.514185,57.084961&ie=UTF8&t=h&z=11
			google_maps: { title: 'Map', url_regex: 'http://maps\.google\.[a-z\.]{2,6}/maps\?(.*q=([^&]+).*)', url: 'http://maps.google.com/maps$1', msg: capitalise },	// http://maps.google.co.uk/maps?q=reading
			twitter: { title: 'Twitter', url_regex: 'http://twitter\.com/([^/\?]+).*', url: 'twitter://user?screen_name=$1', msg: '@$1' },	// http://twitter.com/tayles
			app_store: { title: 'App Store', url_regex: 'http://itunes\.apple\.com/[a-z]{2}/app/([^/]+)?/?id([0-9]+).*', url: 'http://phobos.apple.com/WebObjects/MZStore.woa/wa/viewSoftware?id=$2', msg: function(str, p1, p2) { return (p1 ? p1.clean().capitalise() + ' (#' + p2 + ')' : 'App #' + p2); } },	// http://itunes.apple.com/us/app/pages/id361309726?mt=8&uo=4
			google_qr_code: { title: 'QR Code', url_regex: 'http://chart\.apis\.google\.com/chart\?(?=.*cht=qr).*chl=([^&]+).*', url: '$1', msg: cleanURI },	// http://chart.apis.google.com/chart?chs=200x200&cht=qr&chl=http%3A%2F%2Ftayles.co.uk
			itunes: { title: 'iTunes', url_regex: 'http://(phobos|itunes).apple.com/.*' },
			email: { title: 'Email', url_regex: 'mailto:(.*)', msg: '$1' },
			tel: { title: 'Phone Number', url_regex: 'tel:(.*)', msg: '$1' },
			skype: { title: 'Skype', url_regex: 'skype:([^\?]+).*', msg: '$1' },
			youtube: { title: 'YouTube Video', url_regex: 'http://www.youtube.com/(.*)' },
			facebook: { title: 'Facebook', url_regex: "http://www\.facebook\.com/.*id=([\\d]+).*", url: 'fb://profile/$1', msg: '#$1' },
		},

	handleLoad: function() {
			// initialization code
			this.initialized = true;
			this.strings = document.getElementById('sendtonotifo-strings');
			
			// listen for context menu opening
			document.getElementById('contentAreaContextMenu')
		        .addEventListener('popupshowing', function(evt) { sendtonotifo.handleContextMenuPopupShowing(evt); }, false);
			
			// listen for toolbar dropdown opening
			document.getElementById('sendtonotifo-toolbarbutton-menu')
		        .addEventListener('popupshowing', function(evt) { sendtonotifo.handleToolbarMenuPopupShowing(evt); }, false);
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
	
	getSelectedText: function(truncate) {
			var selTxt = window.content.getSelection().toString().trim();
			
			if( truncate === true ) truncate = this.defaultTruncationLength;
			
			if( truncate && selTxt.length > truncate )
				selTxt = selTxt.substring(0, truncate).trim() + '...';

			return selTxt
		},

	getCurrentUrl: function() {
			return window.top.getBrowser().selectedBrowser.contentWindow.location.href;
		},
		
	getCurrentTitle: function() {
			return window.content.document.title;
		},

	getCredentials: function() {
			var prefs = this.getPrefs();
			
			var u = prefs.getCharPref('userName');
			var a = prefs.getCharPref('apiSecret');
			return { userName: u, apiSecret: a };
		},

	post: function(evt) {
			debug("post");
			var selTxt = this.getSelectedText();
			var curUrl = this.getCurrentUrl();
			var docTitle = this.getCurrentTitle();
			
			var notification = {
				msg:	( selTxt.length > 0 ? selTxt : curUrl ),
				title:	docTitle,
				label:	'Firefox',
				uri:	curUrl
			};
			
			if( true ) {
				notification = this.performSubstitutions(notification);
			}
			
			this.send(notification);
		},
	
	performSubstitutions: function(notification) {
			
			debug("performSubstitutions");
			
			notification = this.performUrlSubstitutions(notification);
		
			notification = this.performMsgSubstitutions(notification);
		
			//debug(notification);		
		
			return notification;
		},
	
	performMsgSubstitutions: function(notification) {
			return notification;
		},
		
	performUrlSubstitutions: function(notification) {
			// make a copy
			var uri = notification.uri;
			for( var key in this.substitutions ) {
				var subst = this.substitutions[key];
				var regexp = new RegExp( '^' + subst.url_regex + '$' , 'i');
				if( regexp.test(uri) ) {
					debug("matched on " + subst.title);
					// match found. replace title, url and possibly msg
					if( subst.url ) notification.uri = uri.replace(regexp, subst.url);
					if( subst.title ) notification.title = subst.title;
					if( subst.msg ) notification.msg = uri.replace(regexp, subst.msg);
					break;
				}
			}
	
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
			debug("send");
			var req = new XMLHttpRequest();
			var creds = this.getCredentials();
			var auth = 'Basic ' + Base64.encode(creds.userName + ':' + creds.apiSecret);
			var params = {
				to:		creds.userName,
				msg:	notification.msg,
				uri:	notification.uri,
				label:	notification.label,
				title:	notification.title,
			};
			
			//this.displayAlert(stringify(notification));
			
			//*/
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
			req.open('POST', this.notifo_api_url, true);
			req.setRequestHeader('Authorization', auth);
			req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			req.send(params);
			//*/
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


		
	handleContextMenuPopupShowing: function(evt) {
			debug("handleContextMenuPopupShowing");
			var menuItem = document.getElementById('sendtonotifo-contextmenuitem');
			
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
					var selTxt = this.getSelectedText(true);

					menuItem.label = 'Send "' + selTxt + '" to Notifo';
					return;
				}
				
				menuItem.label = 'Send Page to Notifo';
			}
		},
		
	handleToolbarMenuPopupShowing: function(evt) {
			var selTxt = this.getSelectedText(true);
			var menuItem = document.getElementById('sendtonotifo-menuitem-sendselectedtext');
			menuItem.hidden = (!selTxt);
			if( selTxt ) menuItem.label = 'Send selected text ("' + selTxt + '")';
		},
		
	handleContextMenuCommand: function(evt) {
			debug("handleContextMenuCommand");
			var el = document.popupNode;
			var isImage = (el instanceof Components.interfaces.nsIImageLoadingContent && el.currentURI);

			if( isImage ) {
				var notification = {
					msg:	( el.alt ? el.alt : el.src ),
					title:	'Image',
					label:	'Firefox',
					uri:	el.src
				};

				// publish
				this.send(notification); 
			}
			else {
				this.post(evt);
			}
		},

	handleToolbarButtonCommand: function(evt) {
			debug("handleToolbarButtonCommand");
			this.post(evt);
		},
		
	updateToolbarTooltip: function(evt) {
			// update tooltip based on selected text, current page url etc
			var bttn = document.getElementById('sendtonotifo-toolbarbutton');
			
			var selTxt = this.getSelectedText(true);
			//var curUrl = this.getCurrentUrl();
			
			if( selTxt ) bttn.tooltipText = 'Send select text ("' + selTxt + '") and URL to Notifo';
			else bttn.tooltipText = 'Send webpage to Notifo';
		},
	
	handleToolbarDragEnter: function(evt) {
			debug(evt.dataTransfer.types);
		},
		
	handleToolbarDragOver: function(evt) {
			// drop accepted
			evt.preventDefault();
			return false;
		},
		
	handleToolbarDragDrop: function(evt) {
			var txt = evt.dataTransfer.getData("text/plain");
			var curUrl = this.getCurrentUrl();
			
			var notification;
			
			if( evt.dataTransfer.types.contains('application/x-moz-nativeimage') ) {
				// image
				notification = {
					msg:	txt,
					title:	'Image',
					label:	'Firefox',
					uri:	txt
				};
			}
			else if( evt.dataTransfer.types.contains('application/x-moz-tabbrowser-tab') ) {
				// tab
				var tabUrl = evt.dataTransfer.getData("text/x-moz-text-internal");
				debug(tabUrl);
				notification = {
					msg:	tabUrl,
					title:	'Link',
					label:	'Firefox',
					uri:	tabUrl
				};
			}
			else if( evt.dataTransfer.types.contains('text/uri-list') || evt.dataTransfer.types.contains('text/x-moz-url') ) {
				// link
				notification = {
					msg:	txt,
					title:	'Link',
					label:	'Firefox',
					uri:	txt
				};
			}
			else if( evt.dataTransfer.types.contains('text/html') ) {
				// html text - assume this is selected text from the current url
				notification = {
					msg:	txt,
					title:	'Link',
					label:	'Firefox',
					uri:	curUrl
				};
			}
			else {
				// plain text - could have come from anywhere and could be a link - set the uri = txt to allow potential substitutions
				notification = {
					msg:	txt,
					title:	'Text',
					label:	'Firefox',
					uri:	txt
				};
			}
			
			if( notification ) {
				debug(notification);
				notification = this.performSubstitutions(notification);
				debug("after");
				debug(notification);
				this.send(notification);
				evt.preventDefault();
			}
		},

		
	handleSendPageCommand: function(evt) {
			this.post(evt);
			evt.stopPropagation();
		},
		
	handleSendSelectedTextCommand: function(evt) {
			this.post(evt);
			evt.stopPropagation();
		},
		
	handleSendAnythingCommand: function(evt) {
			var defaultText = '';//'selected text';
			var params = { input: {defaultText: defaultText}, output: null };
			window.openDialog(
					'chrome://sendtonotifo/content/inputbox.xul',
					'',
					'chrome, dialog, modal, resizable=no',
					params
				).focus();
			if( params.output ) {
				// User clicked OK

				var msg = params.output.enteredText;
				
				// create notification from entered text
				var notification = {
					msg:	msg,
					title:	'Text',
					label:	'Firefox',
					uri:	msg
				};
				
				notification = this.performSubstitutions(notification);

				// publish
				this.send(notification);
			}
			else {
				// User cancelled
			}
			evt.stopPropagation();
		},
};


window.addEventListener('load', sendtonotifo.handleLoad, false);

String.prototype.trim = function() { return this.replace(/^\s+|\s+$/, ''); };

String.prototype.capitalise = function(){ //v1.0
    return this.replace(/\w+/g, function(a){
        return a.charAt(0).toUpperCase() + a.substr(1).toLowerCase();
    });
};

String.prototype.clean = function() { return decodeURIComponent(this.replace(/\+/g, ' ')); };

