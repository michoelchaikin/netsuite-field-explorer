/* globals _, X2JS, JSONFormatter */

let record = null;

chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
  const response = await fetch(`${tab.url}&xml=T`);
  const data = await response.text();

  const parsedRecord = parseRecord(data);
  record = formatRecord(parsedRecord);
  renderRecord();
  updateLinks();
});

document.addEventListener("DOMContentLoaded", function () {
  const searchBox = document.getElementById("searchbox");
  searchBox.focus();
  searchBox.addEventListener("keyup", renderRecord);
});

/**
 * Parse the XML response from the server into a JSON object
 *
 * @param {string} recordXML The response from the server
 * @return {object} The parsed JSON object
 */
function parseRecord(recordXML) {
  // remove the <?xml ... ?> header
  const xml = recordXML.substring(39);
  return new X2JS().xml_str2json(xml);
}

/**
 * Format the JSON object into a more readable format
 *
 * @param {object} object The JSON object to format
 * @return {object} The formatted JSON object
 */
function formatRecord(object) {
  if (!object?.nsResponse?.record) {
    return null;
  }

  return _.transform(
    object.nsResponse.record,
    (memo, value, key) => {
      switch (key) {
        case "machine":
          if (!_.isArray(value)) {
            memo.lineFields[value._name] = value.line;
          } else {
            _.forEach(value, (sublist) => {
              memo.lineFields[sublist._name] = sublist.line;
            });
          }
          break;

        case "_recordType":
          memo.recordType = value;
          break;

        case "_id":
          memo.id = value;
          break;

        case "_fields":
          break;

        default:
          memo.bodyFields[key] = value;
      }
    },
    { recordType: null, id: null, bodyFields: {}, lineFields: {} },
  );
}

/**
 * Filter the JSON object to only include the search term
 *
 * @param {object} object
 * @param {string} searchTerm
 * @return {object} The filtered JSON object
 */
function filterRecord(object, searchTerm) {
  searchTerm = searchTerm.toUpperCase();

  return _.transform(object, function deepFilter(memo, value, key) {
    if (typeof value !== "object") {
      if (
        key.toString().toUpperCase().includes(searchTerm) ||
        (value && value.toString().toUpperCase().includes(searchTerm))
      ) {
        memo[key] = value;
      }
    } else {
      const filtered = _.transform(value, deepFilter);
      if (_.keys(filtered).length) {
        memo[key] = filtered;
      }
    }
  });
}

/**
 * Escape regex characters in a string
 *
 * @param {string} str
 * @return {string} The escaped string
 */
function escapeRegex(str) {
  const regex = /([\\.+*?[^\]$(){}=!<>|:])/g;
  return (str + "").replace(regex, "\\$1");
}

/**
 * Render the JSON object into the popup
 */
function renderRecord() {
  const container = document.getElementById("container");

  if (!record) {
    container.innerHTML = `Error!<br/><br>Are you on a record page?`;
    return;
  }

  const searchTerm = document.getElementById("searchbox").value;
  const [filteredRecord, expandLevels] = searchTerm
    ? [filterRecord(record, searchTerm), Infinity]
    : [record, 2];

  const formatter = new JSONFormatter(filteredRecord, expandLevels, {
    theme: "dark",
  });

  container.innerHTML = "";
  container.appendChild(formatter.render());

  if (searchTerm) {
    const regex = new RegExp("(" + escapeRegex(searchTerm) + ")", "gi");
    const elements = document.querySelectorAll(
      ".json-formatter-key, .json-formatter-string",
    );
    [...elements].forEach(
      (elem) =>
        (elem.innerHTML = elem.innerHTML.replace(
          regex,
          '<span class="searchresult">$1</span>',
        )),
    );
  }
}

/**
 * Update the links to the Records Browser and Records Catalog
 */
function updateLinks() {
  const RECORDS_BROWSER_URL =
    "https://system.netsuite.com/help/helpcenter/en_US/srbrowser/Browser2024_1/script/record";
  const RECORDS_CATALOG_URL =
    "https://system.netsuite.com/app/recordscatalog/rcbrowser.nl?whence=#/record_ss";

  const recordsBrowserUrl = `${RECORDS_BROWSER_URL}/${record.recordType}.html`;
  document.getElementById("records_browser").style.visibility = "visible";
  document.querySelector("#records_browser > a").href = recordsBrowserUrl;

  const recordsCatalogUrl = `${RECORDS_CATALOG_URL}/${record.recordType}`;
  document.getElementById("records_catalog").style.visibility = "visible";
  document.querySelector("#records_catalog > a").href = recordsCatalogUrl;
}
