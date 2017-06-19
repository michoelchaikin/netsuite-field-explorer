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

    const RECORD_BROWSER_URL =
      'https://system.netsuite.com/help/helpcenter/en_US/srbrowser/Browser2016_2/script/record';
    let url = `${RECORD_BROWSER_URL}/${record.recordType}.html`;
    document.getElementById('recordbrowser').style.visibility = 'visible';
    document.querySelector('#recordbrowser > a').href = url;
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
          break;

        default:
          memo.bodyFields[key] = value;
      }
    },
    {recordType: null, id: null, bodyFields: {}, lineFields: {}}
  );
}

function filterRecord(object, searchTerm) {
  searchTerm = searchTerm.toUpperCase();

  return _.transform(object, function deepFilter(memo, value, key) {
    if (typeof value !== 'object') {
      if (
        key.toString().toUpperCase().includes(searchTerm) ||
        (value && value.toString().toUpperCase().includes(searchTerm))
      ) {
        memo[key] = value;
      }
    } else {
      let filtered = _.transform(value, deepFilter);
      if (_.keys(filtered).length) {
        memo[key] = filtered;
      }
    }
  });
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
