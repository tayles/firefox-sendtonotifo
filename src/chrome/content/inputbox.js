// Called once when the dialog displays
function handleLoad() {
  // Use the arguments passed to us by the caller
  document.getElementById('sendtonotifo-customtextinput').value = window.arguments[0].input.defaultText;
}

// Called once if and only if the user clicks OK
function handleCustomInputAccept() {
   // Return the changed arguments.
   // Notice if user clicks cancel, window.arguments[0].out remains null
   // because this function is never called
   window.arguments[0].output = { enteredText: document.getElementById('sendtonotifo-customtextinput').value };
   return true;
}

function handleKeyPress(evt) {
	const KEY_ENTER = 13;
	if( evt.ctrlKey && evt.keyCode == KEY_ENTER ) {
		// close window on ctrl + enter
		document.getElementById('sendtonotifo-customtextdialog').acceptDialog();
	}
}