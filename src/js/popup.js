let record = null;

chrome.tabs.executeScript({ file: '/js/contentscript.js' });

chrome.runtime.onMessage.addListener(request => {
  if (request.type === 'recordError') {
    document.getElementById('container').innerHTML =
      'Error! Are you on a record page?';
  } else if (request.type === 'recordData') {
    // remove leading '<?xml version="1.0" encoding="UTF-8"?>'
    let xml = request.text.substring(39);
    let result = new X2JS().xml_str2json(xml);
    record = formatRecord(result);
    renderRecord();
  }
});

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('searchbox').addEventListener('keyup', renderRecord);
});

function formatRecord(object) {
  return _.reduce(
    object.nlapiResponse.record,
    (result, value, key) => {
      if (key === 'machine') {
        if (!_.isArray(value)) {
          result.lineFields[value._name] = value.line;
        } else {
          _.forEach(
            value,
            sublist => result.lineFields[sublist._name] = sublist.line
          );
        }
      } else if (key !== '_fields') {
        result.bodyFields[key] = value;
      }

      return result;
    },
    { bodyFields: {}, lineFields: {} }
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
  return (str + '').replace(
    /([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g,
    '\\$1'
  );
}

function renderRecord() {
  if (!record) {
    return;
  }

  let searchTerm = document.getElementById('searchbox').value;
  let [filteredRecord, expandLevels] = searchTerm
    ? [filterRecord(record, searchTerm), Infinity]
    : [record, 2];

  let formatter = new JSONFormatter(filteredRecord, expandLevels, {
    theme: 'dark',
  });

  let container = document.getElementById('container');
  container.innerHTML = '';
  container.appendChild(formatter.render());

  if (searchTerm) {
    let regex = new RegExp('(' + escapeRegex(searchTerm) + ')', 'gi');
    let elements = document.querySelectorAll(
      '.json-formatter-key, .json-formatter-string'
    );
    [...elements].forEach(
      elem =>
        elem.innerHTML = elem.innerHTML.replace(
          regex,
          '<span class="searchresult">$1</span>'
        )
    );
  }
}
