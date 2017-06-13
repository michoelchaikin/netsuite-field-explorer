// Inject a script directly into the Netsuite DOM so we can access the Netsuite API

var scriptElement = document.createElement('script');
scriptElement.src = chrome.extension.getURL('js/inject.js');
scriptElement.onload = function() {
  this.remove();
};
(document.head || document.documentElement).appendChild(scriptElement);

// Forward messages from the extension to the injected script

chrome.runtime.onMessage.addListener(request =>
  window.postMessage(request, '*')
);

// Forward messages from the injected script back to extension

window.addEventListener(
  'message',
  event => chrome.runtime.sendMessage(event.data),
  false
);
