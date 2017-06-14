window.postMessage({ type: 'ready' }, '*');

window.addEventListener(
  'message',
  function(event) {
    const url = '/app/common/scripting/nlapihandler.nl';

    function sendMessageToExtension(type, text = null) {
      window.postMessage({ dest: 'extension', type, text }, '*');
    }

    if (!(event.data.type && event.data.type == 'getRecord')) return;

    try {
      if (typeof nlapiGetRecordType === 'undefined') {
        sendMessageToExtension('error', 'Are you on a NetSuite page?');
        return;
      }

      let type = nlapiGetRecordType();
      let id = nlapiGetRecordId();
      let payload = `<nlapiRequest type="nlapiLoadRecord" id="${id}" recordType="${type}"/>`;

      if (!type || !id) {
        sendMessageToExtension('error', 'Are you on a record page?');
        return;
      }

      nlapiRequestURL(url, payload, null, response => {
        if (response.getError()) {
          sendMessageToExtension('error', 'Are you logged in?');
        } else {
          sendMessageToExtension('data', response.getBody());
        }
      });
    } catch (error) {
      sendMessageToExtension('error', error.toString());
    }
  },
  false
);
