/**
 * JSONFormatter allows you to render JSON objects in HTML with a
 * **collapsible** navigation.
 */

var JSONFormatter = (function() {
  var DATE_STRING_REGEX = /(^\d{1,4}[\.|\\/|-]\d{1,2}[\.|\\/|-]\d{1,4})(\s*(?:0?[1-9]:[0-5]|1(?=[012])\d:[0-5])\d\s*[ap]m)?$/;
  var PARTIAL_DATE_REGEX = /\d{2}:\d{2}:\d{2} GMT-\d{4}/;
  var JSON_DATE_REGEX = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
  // When toggleing, don't animated removal or addition of more than a few items
  var MAX_ANIMATED_TOGGLE_ITEMS = 10;
  var requestAnimationFrame =
    window.requestAnimationFrame ||
    function(cb) {
      cb();
      return 0;
    };

  var _defaultConfig = {
    hoverPreviewEnabled: false,
    hoverPreviewArrayCount: 100,
    hoverPreviewFieldCount: 5,
    animateOpen: true,
    animateClose: true,
    theme: null,
  };

  /**
     * @param {object} json The JSON object you want to render. It has to be an
     * object or array. Do NOT pass raw JSON string.
     *
     * @param {number} [open=1] his number indicates up to how many levels the
     * rendered tree should expand. Set it to `0` to make the whole tree collapsed
     * or set it to `Infinity` to expand the tree deeply
     *
     * @param {object} [config=defaultConfig] -
     *  defaultConfig = {
     *   hoverPreviewEnabled: false,
     *   hoverPreviewArrayCount: 100,
     *   hoverPreviewFieldCount: 5
     * }
     *
     * Available configurations:
     *  #####Hover Preview
     * * `hoverPreviewEnabled`:  enable preview on hover
     * * `hoverPreviewArrayCount`: number of array items to show in preview Any
     *    array larger than this number will be shown as `Array[XXX]` where `XXX`
     *    is length of the array.
     * * `hoverPreviewFieldCount`: number of object properties to show for object
     *   preview. Any object with more properties that thin number will be
     *   truncated.
     *
     * @param {string} [key=undefined] The key that this object in it's parent
     * context
    */
  function JSONFormatter(json, open, config, key) {
    if (open === void 0) {
      open = 1;
    }
    if (config === void 0) {
      config = _defaultConfig;
    }
    this.json = json;
    this.open = open;
    this.config = config;
    this.key = key;
    // Hold the open state after the toggler is used
    this._isOpen = null;
    // Setting default values for config object
    if (this.config.hoverPreviewEnabled === undefined) {
      this.config.hoverPreviewEnabled = _defaultConfig.hoverPreviewEnabled;
    }
    if (this.config.hoverPreviewArrayCount === undefined) {
      this.config.hoverPreviewArrayCount =
        _defaultConfig.hoverPreviewArrayCount;
    }
    if (this.config.hoverPreviewFieldCount === undefined) {
      this.config.hoverPreviewFieldCount =
        _defaultConfig.hoverPreviewFieldCount;
    }
  }
  Object.defineProperty(JSONFormatter.prototype, 'isOpen', {
    /*
     * is formatter open?
     */
    get: function() {
      if (this._isOpen !== null) {
        return this._isOpen;
      } else {
        return this.open > 0;
      }
    },
    /*
     * set open state (from toggler)
     */
    set: function(value) {
      this._isOpen = value;
    },
    enumerable: true,
    configurable: true,
  });
  Object.defineProperty(JSONFormatter.prototype, 'isDate', {
    /*
     * is this a date string?
     */
    get: function() {
      return (
        this.type === 'string' &&
        (DATE_STRING_REGEX.test(this.json) ||
          JSON_DATE_REGEX.test(this.json) ||
          PARTIAL_DATE_REGEX.test(this.json))
      );
    },
    enumerable: true,
    configurable: true,
  });
  Object.defineProperty(JSONFormatter.prototype, 'isUrl', {
    /*
     * is this a URL string?
     */
    get: function() {
      return this.type === 'string' && this.json.indexOf('http') === 0;
    },
    enumerable: true,
    configurable: true,
  });
  Object.defineProperty(JSONFormatter.prototype, 'isArray', {
    /*
     * is this an array?
     */
    get: function() {
      return Array.isArray(this.json);
    },
    enumerable: true,
    configurable: true,
  });
  Object.defineProperty(JSONFormatter.prototype, 'isObject', {
    /*
     * is this an object?
     * Note: In this context arrays are object as well
     */
    get: function() {
      return isObject(this.json);
    },
    enumerable: true,
    configurable: true,
  });
  Object.defineProperty(JSONFormatter.prototype, 'isEmptyObject', {
    /*
     * is this an empty object with no properties?
     */
    get: function() {
      return !this.keys.length && !this.isArray;
    },
    enumerable: true,
    configurable: true,
  });
  Object.defineProperty(JSONFormatter.prototype, 'isEmpty', {
    /*
     * is this an empty object or array?
     */
    get: function() {
      return (
        this.isEmptyObject || (this.keys && !this.keys.length && this.isArray)
      );
    },
    enumerable: true,
    configurable: true,
  });
  Object.defineProperty(JSONFormatter.prototype, 'hasKey', {
    /*
     * did we recieve a key argument?
     * This means that the formatter was called as a sub formatter of a parent formatter
     */
    get: function() {
      return typeof this.key !== 'undefined';
    },
    enumerable: true,
    configurable: true,
  });
  Object.defineProperty(JSONFormatter.prototype, 'constructorName', {
    /*
     * if this is an object, get constructor function name
     */
    get: function() {
      return getObjectName(this.json);
    },
    enumerable: true,
    configurable: true,
  });
  Object.defineProperty(JSONFormatter.prototype, 'type', {
    /*
     * get type of this value
     * Possible values: all JavaScript primitive types plus "array" and "null"
     */
    get: function() {
      return getType(this.json);
    },
    enumerable: true,
    configurable: true,
  });
  Object.defineProperty(JSONFormatter.prototype, 'keys', {
    /*
     * get object keys
     * If there is an empty key we pad it wit quotes to make it visible
     */
    get: function() {
      if (this.isObject) {
        return Object.keys(this.json).map(function(key) {
          return key ? key : '""';
        });
      } else {
        return [];
      }
    },
    enumerable: true,
    configurable: true,
  });

  /**
   * Toggles `isOpen` state
   *
   */

  JSONFormatter.prototype.toggleOpen = function() {
    this.isOpen = !this.isOpen;
    if (this.element) {
      if (this.isOpen) {
        this.appendChildren(this.config.animateOpen);
      } else {
        this.removeChildren(this.config.animateClose);
      }
      this.element.classList.toggle(cssClass('open'));
    }
  };

  /**
    * Open all children up to a certain depth.
    * Allows actions such as expand all/collapse all
    *
    */

  JSONFormatter.prototype.openAtDepth = function(depth) {
    if (depth === void 0) {
      depth = 1;
    }
    if (depth < 0) {
      return;
    }
    this.open = depth;
    this.isOpen = depth !== 0;
    if (this.element) {
      this.removeChildren(false);
      if (depth === 0) {
        this.element.classList.remove(cssClass('open'));
      } else {
        this.appendChildren(this.config.animateOpen);
        this.element.classList.add(cssClass('open'));
      }
    }
  };

  /**
   * Generates inline preview
   *
   * @returns {string}
   */

  JSONFormatter.prototype.getInlinepreview = function() {
    var _this = this;
    if (this.isArray) {
      // if array length is greater then 100 it shows "Array[101]"
      if (this.json.length > this.config.hoverPreviewArrayCount) {
        return 'Array[' + this.json.length + ']';
      } else {
        return '[' + this.json.map(getPreview).join(', ') + ']';
      }
    } else {
      var keys = this.keys;
      // the first five keys (like Chrome Developer Tool)
      var narrowKeys = keys.slice(0, this.config.hoverPreviewFieldCount);
      // json value schematic information
      var kvs = narrowKeys.map(function(key) {
        return key + ':' + getPreview(_this.json[key]);
      });
      // if keys count greater then 5 then show ellipsis
      var ellipsis = keys.length >= this.config.hoverPreviewFieldCount
        ? '…'
        : '';
      return '{' + kvs.join(', ') + ellipsis + '}';
    }
  };

  /**
   * Renders an HTML element and installs event listeners
   *
   * @returns {HTMLDivElement}
   */

  JSONFormatter.prototype.render = function() {
    // construct the root element and assign it to this.element
    this.element = createElement('div', 'row');
    // construct the toggler link
    var togglerLink = createElement('a', 'toggler-link');
    // if this is an object we need a wrapper span (toggler)
    if (this.isObject) {
      togglerLink.appendChild(createElement('span', 'toggler'));
    }
    // if this is child of a parent formatter we need to append the key
    if (this.hasKey) {
      togglerLink.appendChild(createElement('span', 'key', this.key + ':'));
    }
    // Value for objects and arrays
    if (this.isObject) {
      // construct the value holder element
      var value = createElement('span', 'value');
      // we need a wrapper span for objects
      var objectWrapperSpan = createElement('span');
      // get constructor name and append it to wrapper span
      var constructorName = createElement(
        'span',
        'constructor-name',
        this.constructorName
      );
      objectWrapperSpan.appendChild(constructorName);
      // if it's an array append the array specific elements like brackets and length
      if (this.isArray) {
        var arrayWrapperSpan = createElement('span');
        arrayWrapperSpan.appendChild(createElement('span', 'bracket', '['));
        arrayWrapperSpan.appendChild(
          createElement('span', 'number', this.json.length)
        );
        arrayWrapperSpan.appendChild(createElement('span', 'bracket', ']'));
        objectWrapperSpan.appendChild(arrayWrapperSpan);
      }
      // append object wrapper span to toggler link
      value.appendChild(objectWrapperSpan);
      togglerLink.appendChild(value);

      // Primitive values
    } else {
      // make a value holder element
      var value = this.isUrl ? createElement('a') : createElement('span');
      // add type and other type related CSS classes
      value.classList.add(cssClass(this.type));
      if (this.isDate) {
        value.classList.add(cssClass('date'));
      }
      if (this.isUrl) {
        value.classList.add(cssClass('url'));
        value.setAttribute('href', this.json);
      }
      // Append value content to value element
      var valuePreview = getValuePreview(this.json, this.json);
      value.appendChild(document.createTextNode(valuePreview));
      // append the value element to toggler link
      togglerLink.appendChild(value);
    }
    // if hover preview is enabled, append the inline preview element
    if (this.isObject && this.config.hoverPreviewEnabled) {
      var preview = createElement('span', 'preview-text');
      preview.appendChild(document.createTextNode(this.getInlinepreview()));
      togglerLink.appendChild(preview);
    }
    // construct a children element
    var children = createElement('div', 'children');
    // set CSS classes for children
    if (this.isObject) {
      children.classList.add(cssClass('object'));
    }
    if (this.isArray) {
      children.classList.add(cssClass('array'));
    }
    if (this.isEmpty) {
      children.classList.add(cssClass('empty'));
    }
    // set CSS classes for root element
    if (this.config && this.config.theme) {
      this.element.classList.add(cssClass(this.config.theme));
    }
    if (this.isOpen) {
      this.element.classList.add(cssClass('open'));
    }
    // append toggler and children elements to root element
    this.element.appendChild(togglerLink);
    this.element.appendChild(children);
    // if formatter is set to be open call appendChildren
    if (this.isObject && this.isOpen) {
      this.appendChildren();
    }
    // add event listener for toggling
    if (this.isObject) {
      togglerLink.addEventListener('click', this.toggleOpen.bind(this));
    }
    return this.element;
  };

  /**
   * Appends all the children to children element
   * Animated option is used when user triggers this via a click
   */

  JSONFormatter.prototype.appendChildren = function(animated) {
    var _this = this;
    if (animated === void 0) {
      animated = false;
    }
    var children = this.element.querySelector('div.' + cssClass('children'));
    if (!children || this.isEmpty) {
      return;
    }
    if (animated) {
      var index_1 = 0;
      var addAChild_1 = function() {
        var key = _this.keys[index_1];
        var formatter = new JSONFormatter(
          _this.json[key],
          _this.open - 1,
          _this.config,
          key
        );
        children.appendChild(formatter.render());
        index_1 += 1;
        if (index_1 < _this.keys.length) {
          if (index_1 > MAX_ANIMATED_TOGGLE_ITEMS) {
            addAChild_1();
          } else {
            requestAnimationFrame(addAChild_1);
          }
        }
      };
      requestAnimationFrame(addAChild_1);
    } else {
      this.keys.forEach(function(key) {
        var formatter = new JSONFormatter(
          _this.json[key],
          _this.open - 1,
          _this.config,
          key
        );
        children.appendChild(formatter.render());
      });
    }
  };

  /**
   * Removes all the children from children element
   * Animated option is used when user triggers this via a click
   */

  JSONFormatter.prototype.removeChildren = function(animated) {
    if (animated === void 0) {
      animated = false;
    }
    var childrenElement = this.element.querySelector(
      'div.' + cssClass('children')
    );
    if (animated) {
      var childrenRemoved_1 = 0;
      var removeAChild_1 = function() {
        if (childrenElement && childrenElement.children.length) {
          childrenElement.removeChild(childrenElement.children[0]);
          childrenRemoved_1 += 1;
          if (childrenRemoved_1 > MAX_ANIMATED_TOGGLE_ITEMS) {
            removeAChild_1();
          } else {
            requestAnimationFrame(removeAChild_1);
          }
        }
      };
      requestAnimationFrame(removeAChild_1);
    } else {
      if (childrenElement) {
        childrenElement.innerHTML = '';
      }
    }
  };

  /*
  * Escapes `"` charachters from string
  */

  function escapeString(str) {
    return str.replace('"', '"');
  }

  /*
  * Determines if a value is an object
  */

  function isObject(value) {
    var type = typeof value;
    return !!value && type == 'object';
  }

  /*
  * Gets constructor name of an object.
  * From http://stackoverflow.com/a/332429
  */

  function getObjectName(object) {
    if (object === undefined) {
      return '';
    }
    if (object === null) {
      return 'Object';
    }
    if (typeof object === 'object' && !object.constructor) {
      return 'Object';
    }
    var funcNameRegex = /function ([^(]*)/;
    var results = funcNameRegex.exec(object.constructor.toString());
    if (results && results.length > 1) {
      return results[1];
    } else {
      return '';
    }
  }

  /*
  * Gets type of an object. Returns "null" for null objects
  */

  function getType(object) {
    if (object === null) {
      return 'null';
    }
    return typeof object;
  }

  /*
  * Generates inline preview for a JavaScript object based on a value
  */

  function getValuePreview(object, value) {
    var type = getType(object);
    if (type === 'null' || type === 'undefined') {
      return type;
    }
    if (type === 'string') {
      value = '"' + escapeString(value) + '"';
    }
    if (type === 'function') {
      // Remove content of the function
      return (
        object.toString().replace(/[\r\n]/g, '').replace(/\{.*\}/, '') + '{…}'
      );
    }
    return value;
  }

  /*
  * Generates inline preview for a JavaScript object
  */

  function getPreview(object) {
    var value = '';
    if (isObject(object)) {
      value = getObjectName(object);
      if (Array.isArray(object)) value += '[' + object.length + ']';
    } else {
      value = getValuePreview(object, object);
    }
    return value;
  }

  /*
  * Generates a prefixed CSS class name
  */

  function cssClass(className) {
    return 'json-formatter-' + className;
  }

  /*
  * Creates a new DOM element wiht given type and class
  * TODO: move me to helpers
  */

  function createElement(type, className, content) {
    var el = document.createElement(type);
    if (className) {
      el.classList.add(cssClass(className));
    }
    if (content !== undefined) {
      if (content instanceof Node) {
        el.appendChild(content);
      } else {
        el.appendChild(document.createTextNode(String(content)));
      }
    }
    return el;
  }

  return JSONFormatter;
})();
