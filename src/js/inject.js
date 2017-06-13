window.addEventListener(
  'message',
  function(event) {
    if (event.source != window) return;

    if (event.data.type && event.data.type == 'getRecord') {
      const url ='/app/common/scripting/nlapihandler.nl';
      let type = nlapiGetRecordType();
      let id = nlapiGetRecordId();
      let payload = `<nlapiRequest type="nlapiLoadRecord" id="${id}" recordType="${type}"/>`;

      if (!type || !id) {
        window.postMessage({ type: 'recordError' }, '*');
      } else {
        nlapiRequestURL(url, payload, null, response =>
          window.postMessage(
            { type: 'recordData', text: response.getBody() },
            '*'
          )
        );
      }
    }
  },
  false
);
