/* If the script has already been injected in the Netsuite DOM,
   request the record data. Otherwise inject it, and wait for a 'ready'
   message once it's loaded */

if (document.getElementById('netsuite-field-explorer')) {
  window.postMessage({type: 'getRecord'}, '*');
} else {
  let script = document.createElement('script');
  script.id = 'netsuite-field-explorer';
  script.src = chrome.extension.getURL('js/inject.js');
  (document.head || document.documentElement).appendChild(script);
}

/* Listen to messages from the Netsuite DOM, and forward them back to the
   extension. If we recieve a 'ready' message, the script was just injected
   so send the request for the record. */

window.addEventListener(
  'message',
  (event) => {
    if (event.data.type === 'ready') {
      window.postMessage({type: 'getRecord'}, '*');
    } else if (event.data.dest === 'extension') {
      chrome.runtime.sendMessage(event.data);
    }
  },
  false
);
