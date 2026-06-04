/* globals _, X2JS, JSONFormatter */

const DEFAULT_EXPAND_DEPTH = 2;
const EXPAND_ALL_DEPTH = Infinity;
const COLLAPSE_ALL_DEPTH = 0;
const THEME_KEY = "nsfe-theme";

let record = null;
let formatter = null;
let displayedRecord = null;
let userExpandDepth = null;
let activeScope = "all"; // "all" | "body" | "line"

chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
  try {
    const response = await fetch(`${tab.url}&xml=T`);
    const data = await response.text();

    const parsedRecord = parseRecord(data);
    record = formatRecord(parsedRecord);
  } catch (error) {
    record = null;
  }

  updateMetaAndTabs();
  renderRecord();
  updateLinks();
});

document.addEventListener("DOMContentLoaded", function () {
  // ----- theme -----
  applyTheme(localStorage.getItem(THEME_KEY) || "light");
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const next = document.body.classList.contains("theme-dark")
      ? "light"
      : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) {
      /* storage may be unavailable */
    }
  });

  // ----- search -----
  const searchBox = document.getElementById("searchbox");
  searchBox.focus();
  searchBox.addEventListener("keyup", renderRecord);

  // ----- expand / collapse / copy -----
  document.getElementById("expand-all").addEventListener("click", function () {
    setExpandDepth(EXPAND_ALL_DEPTH);
  });
  document
    .getElementById("collapse-all")
    .addEventListener("click", function () {
      setExpandDepth(COLLAPSE_ALL_DEPTH);
    });
  document.getElementById("copy-all").addEventListener("click", copyAll);

  // ----- tabs -----
  document.querySelectorAll("#tabs .tab").forEach((tab) => {
    tab.addEventListener("click", function () {
      if (tab.disabled || tab.classList.contains("on")) return;
      activeScope = tab.dataset.scope;
      document
        .querySelectorAll("#tabs .tab")
        .forEach((t) => t.classList.toggle("on", t === tab));
      userExpandDepth = null;
      renderRecord();
    });
  });
});

/**
 * Apply the light or dark theme to the popup
 *
 * @param {string} theme "light" or "dark"
 */
function applyTheme(theme) {
  const dark = theme === "dark";
  document.body.classList.toggle("theme-dark", dark);
  document.body.classList.toggle("theme-light", !dark);
}

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
 * Scope the record to the active tab (all / body / line)
 *
 * @param {object} baseRecord The formatted NetSuite record
 * @return {object} The portion of the record to show
 */
function getScopedRecord(baseRecord) {
  if (activeScope === "body") return baseRecord.bodyFields || {};
  if (activeScope === "line") return baseRecord.lineFields || {};
  return baseRecord;
}

/**
 * Choose the data currently shown in the formatter
 *
 * @param {object} baseRecord The formatted NetSuite record
 * @param {string} searchTerm The active search term
 * @return {object} The full or filtered record
 */
function getRecordForDisplay(baseRecord, searchTerm) {
  const scoped = getScopedRecord(baseRecord);
  return searchTerm ? filterRecord(scoped, searchTerm) : scoped;
}

/**
 * Choose formatter depth based on search and explicit controls
 *
 * @param {string} searchTerm The active search term
 * @return {number} The JSONFormatter open depth
 */
function getFormatterDepth(searchTerm) {
  if (userExpandDepth !== null) {
    return userExpandDepth;
  }

  return searchTerm ? EXPAND_ALL_DEPTH : DEFAULT_EXPAND_DEPTH;
}

/**
 * Apply a manual expand/collapse depth and re-render
 *
 * @param {number} depth The JSONFormatter open depth
 */
function setExpandDepth(depth) {
  userExpandDepth = depth;

  if (formatter) {
    formatter.openAtDepth(depth);
    return;
  }

  if (record) {
    renderRecord();
  }
}

/**
 * Convert the displayed record to clipboard text
 *
 * @param {object} object The record currently shown in the popup
 * @return {string} The formatted clipboard text
 */
function getCopyText(object) {
  return JSON.stringify(object, null, 2);
}

/**
 * Update toolbar button availability
 *
 * @param {boolean} disabled Whether controls should be disabled
 */
function setToolbarDisabled(disabled) {
  document.getElementById("expand-all").disabled = disabled;
  document.getElementById("collapse-all").disabled = disabled;
  document.getElementById("copy-all").disabled = disabled;
}

/**
 * Populate the meta chips and tab counts, and enable the tabs
 */
function updateMetaAndTabs() {
  const typeEl = document.getElementById("meta-type");
  const idEl = document.getElementById("meta-id");

  if (!record) {
    typeEl.textContent = "—";
    idEl.textContent = "—";
    document.querySelectorAll("#tabs .tab").forEach((t) => (t.disabled = true));
    return;
  }

  typeEl.textContent = record.recordType || "—";
  idEl.textContent = record.id || "—";

  const bodyCount = Object.keys(record.bodyFields || {}).length;
  const lineCount = Object.keys(record.lineFields || {}).length;
  document.getElementById("count-body").textContent = bodyCount;
  document.getElementById("count-line").textContent = lineCount;

  document.getElementById("tab-all").disabled = false;
  document.getElementById("tab-body").disabled = bodyCount === 0;
  document.getElementById("tab-line").disabled = lineCount === 0;
}

/**
 * Copy text to the clipboard with a popup-compatible fallback
 *
 * @param {string} text The clipboard text
 * @return {Promise<void>}
 */
async function writeClipboardText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

/**
 * Copy the currently displayed record
 */
async function copyAll() {
  const status = document.getElementById("copy-status");

  if (!displayedRecord) {
    status.textContent = "";
    return;
  }

  try {
    await writeClipboardText(getCopyText(displayedRecord));
    status.textContent = "Copied";
  } catch (error) {
    status.textContent = "Copy failed";
  }

  clearTimeout(copyAll._t);
  copyAll._t = setTimeout(() => (status.textContent = ""), 1600);
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
    container.innerHTML =
      '<div class="errorbox"><strong>No record found</strong>' +
      "<span>Open the extension while viewing a NetSuite record page.</span></div>";
    setToolbarDisabled(true);
    return;
  }

  const searchTerm = document.getElementById("searchbox").value;
  displayedRecord = getRecordForDisplay(record, searchTerm);
  const expandLevels = getFormatterDepth(searchTerm);

  formatter = new JSONFormatter(displayedRecord, expandLevels, {
    theme: "dark",
  });

  container.innerHTML = "";
  container.appendChild(formatter.render());
  setToolbarDisabled(false);

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
  if (!record) return;

  const RECORDS_BROWSER_URL =
    "https://system.netsuite.com/help/helpcenter/en_US/srbrowser/Browser2024_1/script/record";
  const RECORDS_CATALOG_URL =
    "https://system.netsuite.com/app/recordscatalog/rcbrowser.nl?whence=#/record_ss";

  document.getElementById("links").style.visibility = "visible";

  const recordsBrowserUrl = `${RECORDS_BROWSER_URL}/${record.recordType}.html`;
  document.querySelector("#records_browser > a").href = recordsBrowserUrl;

  const recordsCatalogUrl = `${RECORDS_CATALOG_URL}/${record.recordType}`;
  document.querySelector("#records_catalog > a").href = recordsCatalogUrl;
}
