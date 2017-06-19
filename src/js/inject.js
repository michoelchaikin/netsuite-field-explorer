window.postMessage({type: 'ready'}, '*');

window.addEventListener(
  'message',
  function(event) {
    function sendMessageToExtension(type, text = null) {
      window.postMessage({dest: 'extension', type, text}, '*');
    }

    if (!(event.data.type && event.data.type == 'getRecord')) return;

    try {
      if (typeof nlapiGetRecordType === 'undefined') {
        sendMessageToExtension('error', 'Are you on a NetSuite page?');
        return;
      }

      let id = nlapiGetRecordId();
      let type = nlapiGetRecordType();
      let url;
      let payload;

      if (type && id) {
        url = '/app/common/scripting/nlapihandler.nl';
        payload = `<nlapiRequest type="nlapiLoadRecord" id="${id}" recordType="${type}"/>`; // eslint-disable-line max-len
      } else {
        url = window.location + '&xml=T';
      }

      nlapiRequestURL(url, payload, null, (response) => {
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
