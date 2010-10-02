sendtonotifo.onFirefoxLoad = function(event) {
  document.getElementById("contentAreaContextMenu")
          .addEventListener("popupshowing", function (e){ sendtonotifo.showFirefoxContextMenu(e); }, false);
};

sendtonotifo.showFirefoxContextMenu = function(event) {
  // show or hide the menuitem based on what the context menu is on
  document.getElementById("context-sendtonotifo").hidden = gContextMenu.onImage;
};

window.addEventListener("load", sendtonotifo.onFirefoxLoad, false);
