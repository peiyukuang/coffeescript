// Generated by CoffeeScript 2.1.1
(function() {
  // This file contains the common helper functions that we'd like to share among
  // the **Lexer**, **Rewriter**, and the **Nodes**. Merge objects, flatten
  // arrays, count characters, that sort of thing.

  // Peek at the beginning of a given string to see if it matches a sequence.
  var attachCommentsToNode, buildLocationData, buildLocationHash, extend, flatten, ref, repeat, syntaxErrorToString;

  exports.starts = function(string, literal, start) {
    return literal === string.substr(start, literal.length);
  };

  // Peek at the end of a given string to see if it matches a sequence.
  exports.ends = function(string, literal, back) {
    var len;
    len = literal.length;
    return literal === string.substr(string.length - len - (back || 0), len);
  };

  // Repeat a string `n` times.
  exports.repeat = repeat = function(str, n) {
    var res;
    // Use clever algorithm to have O(log(n)) string concatenation operations.
    res = '';
    while (n > 0) {
      if (n & 1) {
        res += str;
      }
      n >>>= 1;
      str += str;
    }
    return res;
  };

  // Trim out all falsy values from an array.
  exports.compact = function(array) {
    var i, item, len1, results;
    results = [];
    for (i = 0, len1 = array.length; i < len1; i++) {
      item = array[i];
      if (item) {
        results.push(item);
      }
    }
    return results;
  };

  // Count the number of occurrences of a string in a string.
  exports.count = function(string, substr) {
    var num, pos;
    num = pos = 0;
    if (!substr.length) {
      return 1 / 0;
    }
    while (pos = 1 + string.indexOf(substr, pos)) {
      num++;
    }
    return num;
  };

  // Merge objects, returning a fresh copy with attributes from both sides.
  // Used every time `Base#compile` is called, to allow properties in the
  // options hash to propagate down the tree without polluting other branches.
  exports.merge = function(options, overrides) {
    return extend(extend({}, options), overrides);
  };

  // Extend a source object with the properties of another object (shallow copy).
  extend = exports.extend = function(object, properties) {
    var key, val;
    for (key in properties) {
      val = properties[key];
      object[key] = val;
    }
    return object;
  };

  // Return a flattened version of an array.
  // Handy for getting a list of `children` from the nodes.
  exports.flatten = flatten = function(array) {
    var element, flattened, i, len1;
    flattened = [];
    for (i = 0, len1 = array.length; i < len1; i++) {
      element = array[i];
      if ('[object Array]' === Object.prototype.toString.call(element)) {
        flattened = flattened.concat(flatten(element));
      } else {
        flattened.push(element);
      }
    }
    return flattened;
  };

  // Delete a key from an object, returning the value. Useful when a node is
  // looking for a particular method in an options hash.
  exports.del = function(obj, key) {
    var val;
    val = obj[key];
    delete obj[key];
    return val;
  };

  // Typical Array::some
  exports.some = (ref = Array.prototype.some) != null ? ref : function(fn) {
    var e, i, len1, ref1;
    ref1 = this;
    for (i = 0, len1 = ref1.length; i < len1; i++) {
      e = ref1[i];
      if (fn(e)) {
        return true;
      }
    }
    return false;
  };

  // Helper function for extracting code from Literate CoffeeScript by stripping
  // out all non-code blocks, producing a string of CoffeeScript code that can
  // be compiled “normally.”
  exports.invertLiterate = function(code) {
    var blankLine, i, indented, insideComment, len1, line, listItemStart, out, ref1;
    out = [];
    blankLine = /^\s*$/;
    indented = /^[\t ]/;
    listItemStart = /^(?:\t?| {0,3})(?:[\*\-\+]|[0-9]{1,9}\.)[ \t]/; // Up to one tab, or up to three spaces, or neither;
    // followed by `*`, `-` or `+`;
    // or by an integer up to 9 digits long, followed by a period;
    // followed by a space or a tab.
    insideComment = false;
    ref1 = code.split('\n');
    for (i = 0, len1 = ref1.length; i < len1; i++) {
      line = ref1[i];
      if (blankLine.test(line)) {
        insideComment = false;
        out.push(line);
      } else if (insideComment || listItemStart.test(line)) {
        insideComment = true;
        out.push(`# ${line}`);
      } else if (!insideComment && indented.test(line)) {
        out.push(line);
      } else {
        insideComment = true;
        out.push(`# ${line}`);
      }
    }
    return out.join('\n');
  };

  // Merge two jison-style location data objects together.
  // If `last` is not provided, this will simply return `first`.
  buildLocationData = function(first, last) {
    if (!last) {
      return first;
    } else {
      return {
        first_line: first.first_line,
        first_column: first.first_column,
        last_line: last.last_line,
        last_column: last.last_column
      };
    }
  };

  buildLocationHash = function(loc) {
    return `${loc.first_line}x${loc.first_column}-${loc.last_line}x${loc.last_column}`;
  };

  // This returns a function which takes an object as a parameter, and if that
  // object is an AST node, updates that object's locationData.
  // The object is returned either way.
  exports.addDataToNode = function(parserState, first, last) {
    return function(obj) {
      var i, len1, objHash, ref1, token, tokenHash;
      // Add location data
      if (((obj != null ? obj.updateLocationDataIfMissing : void 0) != null) && (first != null)) {
        obj.updateLocationDataIfMissing(buildLocationData(first, last));
      }
      // Add comments data
      if (!parserState.tokenComments) {
        parserState.tokenComments = {};
        ref1 = parserState.parser.tokens;
        for (i = 0, len1 = ref1.length; i < len1; i++) {
          token = ref1[i];
          if (!token.comments) {
            continue;
          }
          tokenHash = buildLocationHash(token[2]);
          if (parserState.tokenComments[tokenHash] == null) {
            parserState.tokenComments[tokenHash] = token.comments;
          } else {
            parserState.tokenComments[tokenHash].push(...token.comments);
          }
        }
      }
      if (obj.locationData != null) {
        objHash = buildLocationHash(obj.locationData);
        if (parserState.tokenComments[objHash] != null) {
          attachCommentsToNode(parserState.tokenComments[objHash], obj);
        }
      }
      return obj;
    };
  };

  exports.attachCommentsToNode = attachCommentsToNode = function(comments, node) {
    if ((comments == null) || comments.length === 0) {
      return;
    }
    if (node.comments == null) {
      node.comments = [];
    }
    return node.comments.push(...comments);
  };

  // Convert jison location data to a string.
  // `obj` can be a token, or a locationData.
  exports.locationDataToString = function(obj) {
    var locationData;
    if (("2" in obj) && ("first_line" in obj[2])) {
      locationData = obj[2];
    } else if ("first_line" in obj) {
      locationData = obj;
    }
    if (locationData) {
      return `${locationData.first_line + 1}:${locationData.first_column + 1}-` + `${locationData.last_line + 1}:${locationData.last_column + 1}`;
    } else {
      return "No location data";
    }
  };

  // A `.coffee.md` compatible version of `basename`, that returns the file sans-extension.
  exports.baseFileName = function(file, stripExt = false, useWinPathSep = false) {
    var parts, pathSep;
    pathSep = useWinPathSep ? /\\|\// : /\//;
    parts = file.split(pathSep);
    file = parts[parts.length - 1];
    if (!(stripExt && file.indexOf('.') >= 0)) {
      return file;
    }
    parts = file.split('.');
    parts.pop();
    if (parts[parts.length - 1] === 'coffee' && parts.length > 1) {
      parts.pop();
    }
    return parts.join('.');
  };

  // Determine if a filename represents a CoffeeScript file.
  exports.isCoffee = function(file) {
    return /\.((lit)?coffee|coffee\.md)$/.test(file);
  };

  // Determine if a filename represents a Literate CoffeeScript file.
  exports.isLiterate = function(file) {
    return /\.(litcoffee|coffee\.md)$/.test(file);
  };

  // Throws a SyntaxError from a given location.
  // The error's `toString` will return an error message following the "standard"
  // format `<filename>:<line>:<col>: <message>` plus the line with the error and a
  // marker showing where the error is.
  exports.throwSyntaxError = function(message, location) {
    var error;
    error = new SyntaxError(message);
    error.location = location;
    error.toString = syntaxErrorToString;
    // Instead of showing the compiler's stacktrace, show our custom error message
    // (this is useful when the error bubbles up in Node.js applications that
    // compile CoffeeScript for example).
    error.stack = error.toString();
    throw error;
  };

  // Update a compiler SyntaxError with source code information if it didn't have
  // it already.
  exports.updateSyntaxError = function(error, code, filename) {
    // Avoid screwing up the `stack` property of other errors (i.e. possible bugs).
    if (error.toString === syntaxErrorToString) {
      error.code || (error.code = code);
      error.filename || (error.filename = filename);
      error.stack = error.toString();
    }
    return error;
  };

  syntaxErrorToString = function() {
    var codeLine, colorize, colorsEnabled, end, filename, first_column, first_line, last_column, last_line, marker, ref1, ref2, ref3, start;
    if (!(this.code && this.location)) {
      return Error.prototype.toString.call(this);
    }
    ({first_line, first_column, last_line, last_column} = this.location);
    if (last_line == null) {
      last_line = first_line;
    }
    if (last_column == null) {
      last_column = first_column;
    }
    filename = this.filename || '[stdin]';
    codeLine = this.code.split('\n')[first_line];
    start = first_column;
    // Show only the first line on multi-line errors.
    end = first_line === last_line ? last_column + 1 : codeLine.length;
    marker = codeLine.slice(0, start).replace(/[^\s]/g, ' ') + repeat('^', end - start);
    // Check to see if we're running on a color-enabled TTY.
    if (typeof process !== "undefined" && process !== null) {
      colorsEnabled = ((ref1 = process.stdout) != null ? ref1.isTTY : void 0) && !((ref2 = process.env) != null ? ref2.NODE_DISABLE_COLORS : void 0);
    }
    if ((ref3 = this.colorful) != null ? ref3 : colorsEnabled) {
      colorize = function(str) {
        return `\x1B[1;31m${str}\x1B[0m`;
      };
      codeLine = codeLine.slice(0, start) + colorize(codeLine.slice(start, end)) + codeLine.slice(end);
      marker = colorize(marker);
    }
    return `${filename}:${first_line + 1}:${first_column + 1}: error: ${this.message}\n${codeLine}\n${marker}`;
  };

  exports.nameWhitespaceCharacter = function(string) {
    switch (string) {
      case ' ':
        return 'space';
      case '\n':
        return 'newline';
      case '\r':
        return 'carriage return';
      case '\t':
        return 'tab';
      default:
        return string;
    }
  };

}).call(this);
