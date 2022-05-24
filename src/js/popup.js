let record = null;

chrome.tabs.executeScript({file: '/js/contentscript.js'});

chrome.runtime.onMessage.addListener((request) => {
  if (request.type === 'error') {
    document.getElementById(
      'container'
    ).innerHTML = `Error!<br/><br>${request.text}`;
  } else if (request.type === 'data') {
    // remove leading '<?xml version="1.0" encoding="UTF-8"?>'
    let xml = request.text.substring(39);
    let result = new X2JS().xml_str2json(xml);
    record = formatRecord(result);
    renderRecord();

    updateLinks();
  }
});

document.addEventListener('DOMContentLoaded', function() {
  let searchbox = document.getElementById('searchbox');
  searchbox.focus();
  searchbox.addEventListener('keyup', renderRecord);
});

function formatRecord(object) {
  let baseRecord;

  if (!object) {
    return null;
  } else if (object.hasOwnProperty('nlapiResponse')) {
    baseRecord = object.nlapiResponse.record;
  } else if (object.hasOwnProperty('nsResponse')) {
    baseRecord = object.nsResponse.record;
  } else {
    return null;
  }

  if (!baseRecord) {
    return null;
  }

  return _.transform(
    baseRecord,
    (memo, value, key) => {
      switch (key) {
        case 'machine':
          if (!_.isArray(value)) {
            memo.lineFields[value._name] = value.line;
          } else {
            _.forEach(value, (sublist) => {
              memo.lineFields[sublist._name] = sublist.line;
            });
          }
          break;

        case '_recordType':
          memo.recordType = value;
          break;

        case '_id':
          memo.id = value;
          break;

        case '_fields':
          addFieldsWhichAreEmpty(value);
          break;

        default:
          memo.bodyFields[key] = value;
      }

      function addFieldsWhichAreEmpty(fieldsAttributeValue) {
        const fields = fieldsAttributeValue.split(',');
        fields.forEach((f) => {
          if (!memo.hasOwnProperty(f)) {
            memo[f] = undefined;
          }
        });
      }
    },
    {recordType: null, id: null, bodyFields: {}, lineFields: {}}
  );
}

function filterRecord(object, searchTerm) {
  searchTerm = searchTerm.toUpperCase();
  const objectWithOnlyMatchingKeysOrValues = _.transform(object,
    function deepFilter(memo, value, key) {

    const keyMatches = key.toString().toUpperCase().includes(searchTerm);
    const valueMatches = value &&
      value.toString().toUpperCase().includes(searchTerm);
    if (typeof value !== 'object') {
      if (keyMatches || valueMatches) {
        memo[key] = value;
      }
    } else {
      let filtered = _.transform(value, deepFilter);
      if (_.keys(filtered).length || keyMatches) {
        memo[key] = filtered;
      }
    }
  });

  return objectWithOnlyMatchingKeysOrValues;
}

function escapeRegex(str) {
  let regex = /([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g;
  return (str + '').replace(regex, '\\$1');
}

function renderRecord() {
  let container = document.getElementById('container');

  if (!record) {
    container.innerHTML = `Error!<br/><br>Are you on a record page?`;
    return;
  }

  let searchTerm = document.getElementById('searchbox').value;
  let [filteredRecord, expandLevels] = searchTerm
    ? [filterRecord(record, searchTerm), Infinity]
    : [record, 2];

  let formatter = new JSONFormatter(filteredRecord, expandLevels, {
    theme: 'dark',
  });

  container.innerHTML = '';
  container.appendChild(formatter.render());

  if (searchTerm) {
    let regex = new RegExp('(' + escapeRegex(searchTerm) + ')', 'gi');
    let elements = document.querySelectorAll(
      '.json-formatter-key, .json-formatter-string'
    );
    [...elements].forEach(
      (elem) =>
        elem.innerHTML = elem.innerHTML.replace(
          regex,
          '<span class="searchresult">$1</span>'
        )
    );
  }
}

function updateLinks() {
  const RECORDS_BROWSER_URL =
    'https://system.netsuite.com/help/helpcenter/en_US/srbrowser/Browser2020_1/script/record';
  const RECORDS_CATALOG_URL =
    'https://system.netsuite.com/app/recordscatalog/rcbrowser.nl?whence=#/record_ss';

  const recordsBrowserUrl = `${RECORDS_BROWSER_URL}/${record.recordType}.html`;
  document.getElementById('records_browser').style.visibility = 'visible';
  document.querySelector('#records_browser > a').href = recordsBrowserUrl;

  const recordsCatalogUrl = `${RECORDS_CATALOG_URL}/${record.recordType}`;
  document.getElementById('records_catalog').style.visibility = 'visible';
  document.querySelector('#records_catalog > a').href = recordsCatalogUrl;
}
