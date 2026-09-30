(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/chess.js/dist/cjs/chess.js
  var require_chess = __commonJS({
    "node_modules/chess.js/dist/cjs/chess.js"(exports) {
      "use strict";
      function rootNode(comment) {
        return comment !== null ? { comment, variations: [] } : { variations: [] };
      }
      function node(move, suffix, nag, comment, variations) {
        const node2 = { move, variations };
        if (suffix) {
          node2.suffix = suffix;
        }
        if (nag) {
          node2.nag = nag;
        }
        if (comment !== null) {
          node2.comment = comment;
        }
        return node2;
      }
      function lineToTree(...nodes) {
        const [root, ...rest] = nodes;
        let parent = root;
        for (const child of rest) {
          if (child !== null) {
            parent.variations = [child, ...child.variations];
            child.variations = [];
            parent = child;
          }
        }
        return root;
      }
      function pgn(headers, game) {
        if (game.marker && game.marker.comment) {
          let node2 = game.root;
          while (true) {
            const next = node2.variations[0];
            if (!next) {
              node2.comment = game.marker.comment;
              break;
            }
            node2 = next;
          }
        }
        return {
          headers,
          root: game.root,
          result: (game.marker && game.marker.result) ?? void 0
        };
      }
      function peg$subclass(child, parent) {
        function C() {
          this.constructor = child;
        }
        C.prototype = parent.prototype;
        child.prototype = new C();
      }
      function peg$SyntaxError(message, expected, found, location) {
        var self = Error.call(this, message);
        if (Object.setPrototypeOf) {
          Object.setPrototypeOf(self, peg$SyntaxError.prototype);
        }
        self.expected = expected;
        self.found = found;
        self.location = location;
        self.name = "SyntaxError";
        return self;
      }
      peg$subclass(peg$SyntaxError, Error);
      function peg$padEnd(str, targetLength, padString) {
        padString = padString || " ";
        if (str.length > targetLength) {
          return str;
        }
        targetLength -= str.length;
        padString += padString.repeat(targetLength);
        return str + padString.slice(0, targetLength);
      }
      peg$SyntaxError.prototype.format = function(sources2) {
        var str = "Error: " + this.message;
        if (this.location) {
          var src = null;
          var k;
          for (k = 0; k < sources2.length; k++) {
            if (sources2[k].source === this.location.source) {
              src = sources2[k].text.split(/\r\n|\n|\r/g);
              break;
            }
          }
          var s = this.location.start;
          var offset_s = this.location.source && typeof this.location.source.offset === "function" ? this.location.source.offset(s) : s;
          var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
          if (src) {
            var e = this.location.end;
            var filler = peg$padEnd("", offset_s.line.toString().length, " ");
            var line = src[s.line - 1];
            var last = s.line === e.line ? e.column : line.length + 1;
            var hatLen = last - s.column || 1;
            str += "\n --> " + loc + "\n" + filler + " |\n" + offset_s.line + " | " + line + "\n" + filler + " | " + peg$padEnd("", s.column - 1, " ") + peg$padEnd("", hatLen, "^");
          } else {
            str += "\n at " + loc;
          }
        }
        return str;
      };
      peg$SyntaxError.buildMessage = function(expected, found) {
        var DESCRIBE_EXPECTATION_FNS = {
          literal: function(expectation) {
            return '"' + literalEscape(expectation.text) + '"';
          },
          class: function(expectation) {
            var escapedParts = expectation.parts.map(function(part) {
              return Array.isArray(part) ? classEscape(part[0]) + "-" + classEscape(part[1]) : classEscape(part);
            });
            return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
          },
          any: function() {
            return "any character";
          },
          end: function() {
            return "end of input";
          },
          other: function(expectation) {
            return expectation.description;
          }
        };
        function hex(ch) {
          return ch.charCodeAt(0).toString(16).toUpperCase();
        }
        function literalEscape(s) {
          return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
            return "\\x0" + hex(ch);
          }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
            return "\\x" + hex(ch);
          });
        }
        function classEscape(s) {
          return s.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/-/g, "\\-").replace(/\0/g, "\\0").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[\x00-\x0F]/g, function(ch) {
            return "\\x0" + hex(ch);
          }).replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) {
            return "\\x" + hex(ch);
          });
        }
        function describeExpectation(expectation) {
          return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
        }
        function describeExpected(expected2) {
          var descriptions = expected2.map(describeExpectation);
          var i, j;
          descriptions.sort();
          if (descriptions.length > 0) {
            for (i = 1, j = 1; i < descriptions.length; i++) {
              if (descriptions[i - 1] !== descriptions[i]) {
                descriptions[j] = descriptions[i];
                j++;
              }
            }
            descriptions.length = j;
          }
          switch (descriptions.length) {
            case 1:
              return descriptions[0];
            case 2:
              return descriptions[0] + " or " + descriptions[1];
            default:
              return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
          }
        }
        function describeFound(found2) {
          return found2 ? '"' + literalEscape(found2) + '"' : "end of input";
        }
        return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
      };
      function peg$parse(input, options) {
        options = options !== void 0 ? options : {};
        var peg$FAILED = {};
        var peg$source = options.grammarSource;
        var peg$startRuleFunctions = { pgn: peg$parsepgn };
        var peg$startRuleFunction = peg$parsepgn;
        var peg$c0 = "[";
        var peg$c1 = '"';
        var peg$c2 = "]";
        var peg$c3 = ".";
        var peg$c4 = "O-O-O";
        var peg$c5 = "O-O";
        var peg$c6 = "0-0-0";
        var peg$c7 = "0-0";
        var peg$c8 = "$";
        var peg$c9 = "{";
        var peg$c10 = "}";
        var peg$c11 = ";";
        var peg$c12 = "(";
        var peg$c13 = ")";
        var peg$c14 = "1-0";
        var peg$c15 = "0-1";
        var peg$c16 = "1/2-1/2";
        var peg$c17 = "*";
        var peg$r0 = /^[a-zA-Z]/;
        var peg$r1 = /^[^"]/;
        var peg$r2 = /^[0-9]/;
        var peg$r3 = /^[.]/;
        var peg$r4 = /^[a-zA-Z1-8\-=]/;
        var peg$r5 = /^[+#]/;
        var peg$r6 = /^[!?]/;
        var peg$r7 = /^[^}]/;
        var peg$r8 = /^[^\r\n]/;
        var peg$r9 = /^[ \t\r\n]/;
        var peg$e0 = peg$otherExpectation("tag pair");
        var peg$e1 = peg$literalExpectation("[", false);
        var peg$e2 = peg$literalExpectation('"', false);
        var peg$e3 = peg$literalExpectation("]", false);
        var peg$e4 = peg$otherExpectation("tag name");
        var peg$e5 = peg$classExpectation([["a", "z"], ["A", "Z"]], false, false);
        var peg$e6 = peg$otherExpectation("tag value");
        var peg$e7 = peg$classExpectation(['"'], true, false);
        var peg$e8 = peg$otherExpectation("move number");
        var peg$e9 = peg$classExpectation([["0", "9"]], false, false);
        var peg$e10 = peg$literalExpectation(".", false);
        var peg$e11 = peg$classExpectation(["."], false, false);
        var peg$e12 = peg$otherExpectation("standard algebraic notation");
        var peg$e13 = peg$literalExpectation("O-O-O", false);
        var peg$e14 = peg$literalExpectation("O-O", false);
        var peg$e15 = peg$literalExpectation("0-0-0", false);
        var peg$e16 = peg$literalExpectation("0-0", false);
        var peg$e17 = peg$classExpectation([["a", "z"], ["A", "Z"], ["1", "8"], "-", "="], false, false);
        var peg$e18 = peg$classExpectation(["+", "#"], false, false);
        var peg$e19 = peg$otherExpectation("suffix annotation");
        var peg$e20 = peg$classExpectation(["!", "?"], false, false);
        var peg$e21 = peg$otherExpectation("NAG");
        var peg$e22 = peg$literalExpectation("$", false);
        var peg$e23 = peg$otherExpectation("brace comment");
        var peg$e24 = peg$literalExpectation("{", false);
        var peg$e25 = peg$classExpectation(["}"], true, false);
        var peg$e26 = peg$literalExpectation("}", false);
        var peg$e27 = peg$otherExpectation("rest of line comment");
        var peg$e28 = peg$literalExpectation(";", false);
        var peg$e29 = peg$classExpectation(["\r", "\n"], true, false);
        var peg$e30 = peg$otherExpectation("variation");
        var peg$e31 = peg$literalExpectation("(", false);
        var peg$e32 = peg$literalExpectation(")", false);
        var peg$e33 = peg$otherExpectation("game termination marker");
        var peg$e34 = peg$literalExpectation("1-0", false);
        var peg$e35 = peg$literalExpectation("0-1", false);
        var peg$e36 = peg$literalExpectation("1/2-1/2", false);
        var peg$e37 = peg$literalExpectation("*", false);
        var peg$e38 = peg$otherExpectation("whitespace");
        var peg$e39 = peg$classExpectation([" ", "	", "\r", "\n"], false, false);
        var peg$f0 = function(headers, game) {
          return pgn(headers, game);
        };
        var peg$f1 = function(tagPairs) {
          return Object.fromEntries(tagPairs);
        };
        var peg$f2 = function(tagName, tagValue) {
          return [tagName, tagValue];
        };
        var peg$f3 = function(root, marker) {
          return { root, marker };
        };
        var peg$f4 = function(comment, moves) {
          return lineToTree(rootNode(comment), ...moves.flat());
        };
        var peg$f5 = function(san, suffix, nag, comment, variations) {
          return node(san, suffix, nag, comment, variations);
        };
        var peg$f6 = function(nag) {
          return nag;
        };
        var peg$f7 = function(comment) {
          return comment.replace(/[\r\n]+/g, " ");
        };
        var peg$f8 = function(comment) {
          return comment.trim();
        };
        var peg$f9 = function(line) {
          return line;
        };
        var peg$f10 = function(result, comment) {
          return { result, comment };
        };
        var peg$currPos = options.peg$currPos | 0;
        var peg$posDetailsCache = [{ line: 1, column: 1 }];
        var peg$maxFailPos = peg$currPos;
        var peg$maxFailExpected = options.peg$maxFailExpected || [];
        var peg$silentFails = options.peg$silentFails | 0;
        var peg$result;
        if (options.startRule) {
          if (!(options.startRule in peg$startRuleFunctions)) {
            throw new Error(`Can't start parsing from rule "` + options.startRule + '".');
          }
          peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
        }
        function peg$literalExpectation(text, ignoreCase) {
          return { type: "literal", text, ignoreCase };
        }
        function peg$classExpectation(parts, inverted, ignoreCase) {
          return { type: "class", parts, inverted, ignoreCase };
        }
        function peg$endExpectation() {
          return { type: "end" };
        }
        function peg$otherExpectation(description) {
          return { type: "other", description };
        }
        function peg$computePosDetails(pos) {
          var details = peg$posDetailsCache[pos];
          var p;
          if (details) {
            return details;
          } else {
            if (pos >= peg$posDetailsCache.length) {
              p = peg$posDetailsCache.length - 1;
            } else {
              p = pos;
              while (!peg$posDetailsCache[--p]) {
              }
            }
            details = peg$posDetailsCache[p];
            details = {
              line: details.line,
              column: details.column
            };
            while (p < pos) {
              if (input.charCodeAt(p) === 10) {
                details.line++;
                details.column = 1;
              } else {
                details.column++;
              }
              p++;
            }
            peg$posDetailsCache[pos] = details;
            return details;
          }
        }
        function peg$computeLocation(startPos, endPos, offset) {
          var startPosDetails = peg$computePosDetails(startPos);
          var endPosDetails = peg$computePosDetails(endPos);
          var res = {
            source: peg$source,
            start: {
              offset: startPos,
              line: startPosDetails.line,
              column: startPosDetails.column
            },
            end: {
              offset: endPos,
              line: endPosDetails.line,
              column: endPosDetails.column
            }
          };
          return res;
        }
        function peg$fail(expected) {
          if (peg$currPos < peg$maxFailPos) {
            return;
          }
          if (peg$currPos > peg$maxFailPos) {
            peg$maxFailPos = peg$currPos;
            peg$maxFailExpected = [];
          }
          peg$maxFailExpected.push(expected);
        }
        function peg$buildStructuredError(expected, found, location) {
          return new peg$SyntaxError(
            peg$SyntaxError.buildMessage(expected, found),
            expected,
            found,
            location
          );
        }
        function peg$parsepgn() {
          var s0, s1, s2;
          s0 = peg$currPos;
          s1 = peg$parsetagPairSection();
          s2 = peg$parsemoveTextSection();
          s0 = peg$f0(s1, s2);
          return s0;
        }
        function peg$parsetagPairSection() {
          var s0, s1, s2;
          s0 = peg$currPos;
          s1 = [];
          s2 = peg$parsetagPair();
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parsetagPair();
          }
          s2 = peg$parse_();
          s0 = peg$f1(s1);
          return s0;
        }
        function peg$parsetagPair() {
          var s0, s2, s4, s6, s7, s8, s10;
          peg$silentFails++;
          s0 = peg$currPos;
          peg$parse_();
          if (input.charCodeAt(peg$currPos) === 91) {
            s2 = peg$c0;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e1);
            }
          }
          if (s2 !== peg$FAILED) {
            peg$parse_();
            s4 = peg$parsetagName();
            if (s4 !== peg$FAILED) {
              peg$parse_();
              if (input.charCodeAt(peg$currPos) === 34) {
                s6 = peg$c1;
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e2);
                }
              }
              if (s6 !== peg$FAILED) {
                s7 = peg$parsetagValue();
                if (input.charCodeAt(peg$currPos) === 34) {
                  s8 = peg$c1;
                  peg$currPos++;
                } else {
                  s8 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e2);
                  }
                }
                if (s8 !== peg$FAILED) {
                  peg$parse_();
                  if (input.charCodeAt(peg$currPos) === 93) {
                    s10 = peg$c2;
                    peg$currPos++;
                  } else {
                    s10 = peg$FAILED;
                    if (peg$silentFails === 0) {
                      peg$fail(peg$e3);
                    }
                  }
                  if (s10 !== peg$FAILED) {
                    s0 = peg$f2(s4, s7);
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          peg$silentFails--;
          if (s0 === peg$FAILED) {
            if (peg$silentFails === 0) {
              peg$fail(peg$e0);
            }
          }
          return s0;
        }
        function peg$parsetagName() {
          var s0, s1, s2;
          peg$silentFails++;
          s0 = peg$currPos;
          s1 = [];
          s2 = input.charAt(peg$currPos);
          if (peg$r0.test(s2)) {
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e5);
            }
          }
          if (s2 !== peg$FAILED) {
            while (s2 !== peg$FAILED) {
              s1.push(s2);
              s2 = input.charAt(peg$currPos);
              if (peg$r0.test(s2)) {
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e5);
                }
              }
            }
          } else {
            s1 = peg$FAILED;
          }
          if (s1 !== peg$FAILED) {
            s0 = input.substring(s0, peg$currPos);
          } else {
            s0 = s1;
          }
          peg$silentFails--;
          if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e4);
            }
          }
          return s0;
        }
        function peg$parsetagValue() {
          var s0, s1, s2;
          peg$silentFails++;
          s0 = peg$currPos;
          s1 = [];
          s2 = input.charAt(peg$currPos);
          if (peg$r1.test(s2)) {
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e7);
            }
          }
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = input.charAt(peg$currPos);
            if (peg$r1.test(s2)) {
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e7);
              }
            }
          }
          s0 = input.substring(s0, peg$currPos);
          peg$silentFails--;
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e6);
          }
          return s0;
        }
        function peg$parsemoveTextSection() {
          var s0, s1, s3;
          s0 = peg$currPos;
          s1 = peg$parseline();
          peg$parse_();
          s3 = peg$parsegameTerminationMarker();
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          peg$parse_();
          s0 = peg$f3(s1, s3);
          return s0;
        }
        function peg$parseline() {
          var s0, s1, s2, s3;
          s0 = peg$currPos;
          s1 = peg$parsecomment();
          if (s1 === peg$FAILED) {
            s1 = null;
          }
          s2 = [];
          s3 = peg$parsemove();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parsemove();
          }
          s0 = peg$f4(s1, s2);
          return s0;
        }
        function peg$parsemove() {
          var s0, s4, s5, s6, s7, s8, s9, s10;
          s0 = peg$currPos;
          peg$parse_();
          peg$parsemoveNumber();
          peg$parse_();
          s4 = peg$parsesan();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsesuffixAnnotation();
            if (s5 === peg$FAILED) {
              s5 = null;
            }
            s6 = [];
            s7 = peg$parsenag();
            while (s7 !== peg$FAILED) {
              s6.push(s7);
              s7 = peg$parsenag();
            }
            s7 = peg$parse_();
            s8 = peg$parsecomment();
            if (s8 === peg$FAILED) {
              s8 = null;
            }
            s9 = [];
            s10 = peg$parsevariation();
            while (s10 !== peg$FAILED) {
              s9.push(s10);
              s10 = peg$parsevariation();
            }
            s0 = peg$f5(s4, s5, s6, s8, s9);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          return s0;
        }
        function peg$parsemoveNumber() {
          var s0, s1, s2, s3, s4, s5;
          peg$silentFails++;
          s0 = peg$currPos;
          s1 = [];
          s2 = input.charAt(peg$currPos);
          if (peg$r2.test(s2)) {
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e9);
            }
          }
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = input.charAt(peg$currPos);
            if (peg$r2.test(s2)) {
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e9);
              }
            }
          }
          if (input.charCodeAt(peg$currPos) === 46) {
            s2 = peg$c3;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e10);
            }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_();
            s4 = [];
            s5 = input.charAt(peg$currPos);
            if (peg$r3.test(s5)) {
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e11);
              }
            }
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = input.charAt(peg$currPos);
              if (peg$r3.test(s5)) {
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e11);
                }
              }
            }
            s1 = [s1, s2, s3, s4];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          peg$silentFails--;
          if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e8);
            }
          }
          return s0;
        }
        function peg$parsesan() {
          var s0, s1, s2, s3, s4, s5;
          peg$silentFails++;
          s0 = peg$currPos;
          s1 = peg$currPos;
          if (input.substr(peg$currPos, 5) === peg$c4) {
            s2 = peg$c4;
            peg$currPos += 5;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e13);
            }
          }
          if (s2 === peg$FAILED) {
            if (input.substr(peg$currPos, 3) === peg$c5) {
              s2 = peg$c5;
              peg$currPos += 3;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e14);
              }
            }
            if (s2 === peg$FAILED) {
              if (input.substr(peg$currPos, 5) === peg$c6) {
                s2 = peg$c6;
                peg$currPos += 5;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e15);
                }
              }
              if (s2 === peg$FAILED) {
                if (input.substr(peg$currPos, 3) === peg$c7) {
                  s2 = peg$c7;
                  peg$currPos += 3;
                } else {
                  s2 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e16);
                  }
                }
                if (s2 === peg$FAILED) {
                  s2 = peg$currPos;
                  s3 = input.charAt(peg$currPos);
                  if (peg$r0.test(s3)) {
                    peg$currPos++;
                  } else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) {
                      peg$fail(peg$e5);
                    }
                  }
                  if (s3 !== peg$FAILED) {
                    s4 = [];
                    s5 = input.charAt(peg$currPos);
                    if (peg$r4.test(s5)) {
                      peg$currPos++;
                    } else {
                      s5 = peg$FAILED;
                      if (peg$silentFails === 0) {
                        peg$fail(peg$e17);
                      }
                    }
                    if (s5 !== peg$FAILED) {
                      while (s5 !== peg$FAILED) {
                        s4.push(s5);
                        s5 = input.charAt(peg$currPos);
                        if (peg$r4.test(s5)) {
                          peg$currPos++;
                        } else {
                          s5 = peg$FAILED;
                          if (peg$silentFails === 0) {
                            peg$fail(peg$e17);
                          }
                        }
                      }
                    } else {
                      s4 = peg$FAILED;
                    }
                    if (s4 !== peg$FAILED) {
                      s3 = [s3, s4];
                      s2 = s3;
                    } else {
                      peg$currPos = s2;
                      s2 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s2;
                    s2 = peg$FAILED;
                  }
                }
              }
            }
          }
          if (s2 !== peg$FAILED) {
            s3 = input.charAt(peg$currPos);
            if (peg$r5.test(s3)) {
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e18);
              }
            }
            if (s3 === peg$FAILED) {
              s3 = null;
            }
            s2 = [s2, s3];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
          if (s1 !== peg$FAILED) {
            s0 = input.substring(s0, peg$currPos);
          } else {
            s0 = s1;
          }
          peg$silentFails--;
          if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e12);
            }
          }
          return s0;
        }
        function peg$parsesuffixAnnotation() {
          var s0, s1, s2;
          peg$silentFails++;
          s0 = peg$currPos;
          s1 = [];
          s2 = input.charAt(peg$currPos);
          if (peg$r6.test(s2)) {
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e20);
            }
          }
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            if (s1.length >= 2) {
              s2 = peg$FAILED;
            } else {
              s2 = input.charAt(peg$currPos);
              if (peg$r6.test(s2)) {
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e20);
                }
              }
            }
          }
          if (s1.length < 1) {
            peg$currPos = s0;
            s0 = peg$FAILED;
          } else {
            s0 = s1;
          }
          peg$silentFails--;
          if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e19);
            }
          }
          return s0;
        }
        function peg$parsenag() {
          var s0, s2, s3, s4, s5;
          peg$silentFails++;
          s0 = peg$currPos;
          peg$parse_();
          if (input.charCodeAt(peg$currPos) === 36) {
            s2 = peg$c8;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e22);
            }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$currPos;
            s4 = [];
            s5 = input.charAt(peg$currPos);
            if (peg$r2.test(s5)) {
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e9);
              }
            }
            if (s5 !== peg$FAILED) {
              while (s5 !== peg$FAILED) {
                s4.push(s5);
                s5 = input.charAt(peg$currPos);
                if (peg$r2.test(s5)) {
                  peg$currPos++;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e9);
                  }
                }
              }
            } else {
              s4 = peg$FAILED;
            }
            if (s4 !== peg$FAILED) {
              s3 = input.substring(s3, peg$currPos);
            } else {
              s3 = s4;
            }
            if (s3 !== peg$FAILED) {
              s0 = peg$f6(s3);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          peg$silentFails--;
          if (s0 === peg$FAILED) {
            if (peg$silentFails === 0) {
              peg$fail(peg$e21);
            }
          }
          return s0;
        }
        function peg$parsecomment() {
          var s0;
          s0 = peg$parsebraceComment();
          if (s0 === peg$FAILED) {
            s0 = peg$parserestOfLineComment();
          }
          return s0;
        }
        function peg$parsebraceComment() {
          var s0, s1, s2, s3, s4;
          peg$silentFails++;
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 123) {
            s1 = peg$c9;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e24);
            }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$currPos;
            s3 = [];
            s4 = input.charAt(peg$currPos);
            if (peg$r7.test(s4)) {
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e25);
              }
            }
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = input.charAt(peg$currPos);
              if (peg$r7.test(s4)) {
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e25);
                }
              }
            }
            s2 = input.substring(s2, peg$currPos);
            if (input.charCodeAt(peg$currPos) === 125) {
              s3 = peg$c10;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e26);
              }
            }
            if (s3 !== peg$FAILED) {
              s0 = peg$f7(s2);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          peg$silentFails--;
          if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e23);
            }
          }
          return s0;
        }
        function peg$parserestOfLineComment() {
          var s0, s1, s2, s3, s4;
          peg$silentFails++;
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 59) {
            s1 = peg$c11;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e28);
            }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$currPos;
            s3 = [];
            s4 = input.charAt(peg$currPos);
            if (peg$r8.test(s4)) {
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e29);
              }
            }
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = input.charAt(peg$currPos);
              if (peg$r8.test(s4)) {
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e29);
                }
              }
            }
            s2 = input.substring(s2, peg$currPos);
            s0 = peg$f8(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          peg$silentFails--;
          if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e27);
            }
          }
          return s0;
        }
        function peg$parsevariation() {
          var s0, s2, s3, s5;
          peg$silentFails++;
          s0 = peg$currPos;
          peg$parse_();
          if (input.charCodeAt(peg$currPos) === 40) {
            s2 = peg$c12;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e31);
            }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parseline();
            if (s3 !== peg$FAILED) {
              peg$parse_();
              if (input.charCodeAt(peg$currPos) === 41) {
                s5 = peg$c13;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e32);
                }
              }
              if (s5 !== peg$FAILED) {
                s0 = peg$f9(s3);
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          peg$silentFails--;
          if (s0 === peg$FAILED) {
            if (peg$silentFails === 0) {
              peg$fail(peg$e30);
            }
          }
          return s0;
        }
        function peg$parsegameTerminationMarker() {
          var s0, s1, s3;
          peg$silentFails++;
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 3) === peg$c14) {
            s1 = peg$c14;
            peg$currPos += 3;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e34);
            }
          }
          if (s1 === peg$FAILED) {
            if (input.substr(peg$currPos, 3) === peg$c15) {
              s1 = peg$c15;
              peg$currPos += 3;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e35);
              }
            }
            if (s1 === peg$FAILED) {
              if (input.substr(peg$currPos, 7) === peg$c16) {
                s1 = peg$c16;
                peg$currPos += 7;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$e36);
                }
              }
              if (s1 === peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 42) {
                  s1 = peg$c17;
                  peg$currPos++;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$e37);
                  }
                }
              }
            }
          }
          if (s1 !== peg$FAILED) {
            peg$parse_();
            s3 = peg$parsecomment();
            if (s3 === peg$FAILED) {
              s3 = null;
            }
            s0 = peg$f10(s1, s3);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          peg$silentFails--;
          if (s0 === peg$FAILED) {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e33);
            }
          }
          return s0;
        }
        function peg$parse_() {
          var s0, s1;
          peg$silentFails++;
          s0 = [];
          s1 = input.charAt(peg$currPos);
          if (peg$r9.test(s1)) {
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$e39);
            }
          }
          while (s1 !== peg$FAILED) {
            s0.push(s1);
            s1 = input.charAt(peg$currPos);
            if (peg$r9.test(s1)) {
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$e39);
              }
            }
          }
          peg$silentFails--;
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$e38);
          }
          return s0;
        }
        peg$result = peg$startRuleFunction();
        if (options.peg$library) {
          return (
            /** @type {any} */
            {
              peg$result,
              peg$currPos,
              peg$FAILED,
              peg$maxFailExpected,
              peg$maxFailPos
            }
          );
        }
        if (peg$result !== peg$FAILED && peg$currPos === input.length) {
          return peg$result;
        } else {
          if (peg$result !== peg$FAILED && peg$currPos < input.length) {
            peg$fail(peg$endExpectation());
          }
          throw peg$buildStructuredError(
            peg$maxFailExpected,
            peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
            peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
          );
        }
      }
      var MASK64 = 0xffffffffffffffffn;
      function rotl(x, k) {
        return (x << k | x >> 64n - k) & 0xffffffffffffffffn;
      }
      function wrappingMul(x, y) {
        return x * y & MASK64;
      }
      function xoroshiro128(state) {
        return function() {
          let s0 = BigInt(state & MASK64);
          let s1 = BigInt(state >> 64n & MASK64);
          const result = wrappingMul(rotl(wrappingMul(s0, 5n), 7n), 9n);
          s1 ^= s0;
          s0 = (rotl(s0, 24n) ^ s1 ^ s1 << 16n) & MASK64;
          s1 = rotl(s1, 37n);
          state = s1 << 64n | s0;
          return result;
        };
      }
      var rand = xoroshiro128(0xa187eb39cdcaed8f31c4b365b102e01en);
      var PIECE_KEYS = Array.from({ length: 2 }, () => Array.from({ length: 6 }, () => Array.from({ length: 128 }, () => rand())));
      var EP_KEYS = Array.from({ length: 8 }, () => rand());
      var CASTLING_KEYS = Array.from({ length: 16 }, () => rand());
      var SIDE_KEY = rand();
      var WHITE = "w";
      var BLACK = "b";
      var PAWN = "p";
      var KNIGHT = "n";
      var BISHOP = "b";
      var ROOK = "r";
      var QUEEN = "q";
      var KING = "k";
      var DEFAULT_POSITION = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      var Move = class {
        color;
        from;
        to;
        piece;
        captured;
        promotion;
        /**
         * @deprecated This field is deprecated and will be removed in version 2.0.0.
         * Please use move descriptor functions instead: `isCapture`, `isPromotion`,
         * `isEnPassant`, `isKingsideCastle`, `isQueensideCastle`, `isCastle`, and
         * `isBigPawn`
         */
        flags;
        san;
        lan;
        before;
        after;
        constructor(chess, internal) {
          const { color, piece, from, to, flags, captured, promotion } = internal;
          const fromAlgebraic = algebraic(from);
          const toAlgebraic = algebraic(to);
          this.color = color;
          this.piece = piece;
          this.from = fromAlgebraic;
          this.to = toAlgebraic;
          this.san = chess["_moveToSan"](internal, chess["_moves"]({ legal: true }));
          this.lan = fromAlgebraic + toAlgebraic;
          this.before = chess.fen();
          chess["_makeMove"](internal);
          this.after = chess.fen();
          chess["_undoMove"]();
          this.flags = "";
          for (const flag in BITS) {
            if (BITS[flag] & flags) {
              this.flags += FLAGS[flag];
            }
          }
          if (captured) {
            this.captured = captured;
          }
          if (promotion) {
            this.promotion = promotion;
            this.lan += promotion;
          }
        }
        isCapture() {
          return this.flags.indexOf(FLAGS["CAPTURE"]) > -1;
        }
        isPromotion() {
          return this.flags.indexOf(FLAGS["PROMOTION"]) > -1;
        }
        isEnPassant() {
          return this.flags.indexOf(FLAGS["EP_CAPTURE"]) > -1;
        }
        isKingsideCastle() {
          return this.flags.indexOf(FLAGS["KSIDE_CASTLE"]) > -1;
        }
        isQueensideCastle() {
          return this.flags.indexOf(FLAGS["QSIDE_CASTLE"]) > -1;
        }
        isBigPawn() {
          return this.flags.indexOf(FLAGS["BIG_PAWN"]) > -1;
        }
      };
      var EMPTY = -1;
      var FLAGS = {
        NORMAL: "n",
        CAPTURE: "c",
        BIG_PAWN: "b",
        EP_CAPTURE: "e",
        PROMOTION: "p",
        KSIDE_CASTLE: "k",
        QSIDE_CASTLE: "q",
        NULL_MOVE: "-"
      };
      var SQUARES = [
        "a8",
        "b8",
        "c8",
        "d8",
        "e8",
        "f8",
        "g8",
        "h8",
        "a7",
        "b7",
        "c7",
        "d7",
        "e7",
        "f7",
        "g7",
        "h7",
        "a6",
        "b6",
        "c6",
        "d6",
        "e6",
        "f6",
        "g6",
        "h6",
        "a5",
        "b5",
        "c5",
        "d5",
        "e5",
        "f5",
        "g5",
        "h5",
        "a4",
        "b4",
        "c4",
        "d4",
        "e4",
        "f4",
        "g4",
        "h4",
        "a3",
        "b3",
        "c3",
        "d3",
        "e3",
        "f3",
        "g3",
        "h3",
        "a2",
        "b2",
        "c2",
        "d2",
        "e2",
        "f2",
        "g2",
        "h2",
        "a1",
        "b1",
        "c1",
        "d1",
        "e1",
        "f1",
        "g1",
        "h1"
      ];
      var BITS = {
        NORMAL: 1,
        CAPTURE: 2,
        BIG_PAWN: 4,
        EP_CAPTURE: 8,
        PROMOTION: 16,
        KSIDE_CASTLE: 32,
        QSIDE_CASTLE: 64,
        NULL_MOVE: 128
      };
      var SEVEN_TAG_ROSTER = {
        Event: "?",
        Site: "?",
        Date: "????.??.??",
        Round: "?",
        White: "?",
        Black: "?",
        Result: "*"
      };
      var SUPLEMENTAL_TAGS = {
        WhiteTitle: null,
        BlackTitle: null,
        WhiteElo: null,
        BlackElo: null,
        WhiteUSCF: null,
        BlackUSCF: null,
        WhiteNA: null,
        BlackNA: null,
        WhiteType: null,
        BlackType: null,
        EventDate: null,
        EventSponsor: null,
        Section: null,
        Stage: null,
        Board: null,
        Opening: null,
        Variation: null,
        SubVariation: null,
        ECO: null,
        NIC: null,
        Time: null,
        UTCTime: null,
        UTCDate: null,
        TimeControl: null,
        SetUp: null,
        FEN: null,
        Termination: null,
        Annotator: null,
        Mode: null,
        PlyCount: null
      };
      var HEADER_TEMPLATE = {
        ...SEVEN_TAG_ROSTER,
        ...SUPLEMENTAL_TAGS
      };
      var Ox88 = {
        a8: 0,
        b8: 1,
        c8: 2,
        d8: 3,
        e8: 4,
        f8: 5,
        g8: 6,
        h8: 7,
        a7: 16,
        b7: 17,
        c7: 18,
        d7: 19,
        e7: 20,
        f7: 21,
        g7: 22,
        h7: 23,
        a6: 32,
        b6: 33,
        c6: 34,
        d6: 35,
        e6: 36,
        f6: 37,
        g6: 38,
        h6: 39,
        a5: 48,
        b5: 49,
        c5: 50,
        d5: 51,
        e5: 52,
        f5: 53,
        g5: 54,
        h5: 55,
        a4: 64,
        b4: 65,
        c4: 66,
        d4: 67,
        e4: 68,
        f4: 69,
        g4: 70,
        h4: 71,
        a3: 80,
        b3: 81,
        c3: 82,
        d3: 83,
        e3: 84,
        f3: 85,
        g3: 86,
        h3: 87,
        a2: 96,
        b2: 97,
        c2: 98,
        d2: 99,
        e2: 100,
        f2: 101,
        g2: 102,
        h2: 103,
        a1: 112,
        b1: 113,
        c1: 114,
        d1: 115,
        e1: 116,
        f1: 117,
        g1: 118,
        h1: 119
      };
      var PAWN_OFFSETS = {
        b: [16, 32, 17, 15],
        w: [-16, -32, -17, -15]
      };
      var PIECE_OFFSETS = {
        n: [-18, -33, -31, -14, 18, 33, 31, 14],
        b: [-17, -15, 17, 15],
        r: [-16, 1, 16, -1],
        q: [-17, -16, -15, 1, 17, 16, 15, -1],
        k: [-17, -16, -15, 1, 17, 16, 15, -1]
      };
      var ATTACKS = [
        20,
        0,
        0,
        0,
        0,
        0,
        0,
        24,
        0,
        0,
        0,
        0,
        0,
        0,
        20,
        0,
        0,
        20,
        0,
        0,
        0,
        0,
        0,
        24,
        0,
        0,
        0,
        0,
        0,
        20,
        0,
        0,
        0,
        0,
        20,
        0,
        0,
        0,
        0,
        24,
        0,
        0,
        0,
        0,
        20,
        0,
        0,
        0,
        0,
        0,
        0,
        20,
        0,
        0,
        0,
        24,
        0,
        0,
        0,
        20,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        20,
        0,
        0,
        24,
        0,
        0,
        20,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        20,
        2,
        24,
        2,
        20,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        2,
        53,
        56,
        53,
        2,
        0,
        0,
        0,
        0,
        0,
        0,
        24,
        24,
        24,
        24,
        24,
        24,
        56,
        0,
        56,
        24,
        24,
        24,
        24,
        24,
        24,
        0,
        0,
        0,
        0,
        0,
        0,
        2,
        53,
        56,
        53,
        2,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        20,
        2,
        24,
        2,
        20,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        20,
        0,
        0,
        24,
        0,
        0,
        20,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        20,
        0,
        0,
        0,
        24,
        0,
        0,
        0,
        20,
        0,
        0,
        0,
        0,
        0,
        0,
        20,
        0,
        0,
        0,
        0,
        24,
        0,
        0,
        0,
        0,
        20,
        0,
        0,
        0,
        0,
        20,
        0,
        0,
        0,
        0,
        0,
        24,
        0,
        0,
        0,
        0,
        0,
        20,
        0,
        0,
        20,
        0,
        0,
        0,
        0,
        0,
        0,
        24,
        0,
        0,
        0,
        0,
        0,
        0,
        20
      ];
      var RAYS = [
        17,
        0,
        0,
        0,
        0,
        0,
        0,
        16,
        0,
        0,
        0,
        0,
        0,
        0,
        15,
        0,
        0,
        17,
        0,
        0,
        0,
        0,
        0,
        16,
        0,
        0,
        0,
        0,
        0,
        15,
        0,
        0,
        0,
        0,
        17,
        0,
        0,
        0,
        0,
        16,
        0,
        0,
        0,
        0,
        15,
        0,
        0,
        0,
        0,
        0,
        0,
        17,
        0,
        0,
        0,
        16,
        0,
        0,
        0,
        15,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        17,
        0,
        0,
        16,
        0,
        0,
        15,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        17,
        0,
        16,
        0,
        15,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        17,
        16,
        15,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        0,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        -15,
        -16,
        -17,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        -15,
        0,
        -16,
        0,
        -17,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        -15,
        0,
        0,
        -16,
        0,
        0,
        -17,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        -15,
        0,
        0,
        0,
        -16,
        0,
        0,
        0,
        -17,
        0,
        0,
        0,
        0,
        0,
        0,
        -15,
        0,
        0,
        0,
        0,
        -16,
        0,
        0,
        0,
        0,
        -17,
        0,
        0,
        0,
        0,
        -15,
        0,
        0,
        0,
        0,
        0,
        -16,
        0,
        0,
        0,
        0,
        0,
        -17,
        0,
        0,
        -15,
        0,
        0,
        0,
        0,
        0,
        0,
        -16,
        0,
        0,
        0,
        0,
        0,
        0,
        -17
      ];
      var PIECE_MASKS = { p: 1, n: 2, b: 4, r: 8, q: 16, k: 32 };
      var SYMBOLS = "pnbrqkPNBRQK";
      var PROMOTIONS = [KNIGHT, BISHOP, ROOK, QUEEN];
      var RANK_1 = 7;
      var RANK_2 = 6;
      var RANK_7 = 1;
      var RANK_8 = 0;
      var SIDES = {
        [KING]: BITS.KSIDE_CASTLE,
        [QUEEN]: BITS.QSIDE_CASTLE
      };
      var ROOKS = {
        w: [
          { square: Ox88.a1, flag: BITS.QSIDE_CASTLE },
          { square: Ox88.h1, flag: BITS.KSIDE_CASTLE }
        ],
        b: [
          { square: Ox88.a8, flag: BITS.QSIDE_CASTLE },
          { square: Ox88.h8, flag: BITS.KSIDE_CASTLE }
        ]
      };
      var SECOND_RANK = { b: RANK_7, w: RANK_2 };
      var SAN_NULLMOVE = "--";
      function rank(square) {
        return square >> 4;
      }
      function file(square) {
        return square & 15;
      }
      function isDigit(c) {
        return "0123456789".indexOf(c) !== -1;
      }
      function algebraic(square) {
        const f = file(square);
        const r = rank(square);
        return "abcdefgh".substring(f, f + 1) + "87654321".substring(r, r + 1);
      }
      function swapColor(color) {
        return color === WHITE ? BLACK : WHITE;
      }
      function validateFen(fen) {
        const tokens = fen.split(/\s+/);
        if (tokens.length !== 6) {
          return {
            ok: false,
            error: "Invalid FEN: must contain six space-delimited fields"
          };
        }
        const moveNumber = parseInt(tokens[5], 10);
        if (isNaN(moveNumber) || moveNumber <= 0) {
          return {
            ok: false,
            error: "Invalid FEN: move number must be a positive integer"
          };
        }
        const halfMoves = parseInt(tokens[4], 10);
        if (isNaN(halfMoves) || halfMoves < 0) {
          return {
            ok: false,
            error: "Invalid FEN: half move counter number must be a non-negative integer"
          };
        }
        if (!/^(-|[abcdefgh][36])$/.test(tokens[3])) {
          return { ok: false, error: "Invalid FEN: en-passant square is invalid" };
        }
        if (/[^kKqQ-]/.test(tokens[2])) {
          return { ok: false, error: "Invalid FEN: castling availability is invalid" };
        }
        if (!/^(w|b)$/.test(tokens[1])) {
          return { ok: false, error: "Invalid FEN: side-to-move is invalid" };
        }
        const rows = tokens[0].split("/");
        if (rows.length !== 8) {
          return {
            ok: false,
            error: "Invalid FEN: piece data does not contain 8 '/'-delimited rows"
          };
        }
        for (let i = 0; i < rows.length; i++) {
          let sumFields = 0;
          let previousWasNumber = false;
          for (let k = 0; k < rows[i].length; k++) {
            if (isDigit(rows[i][k])) {
              if (previousWasNumber) {
                return {
                  ok: false,
                  error: "Invalid FEN: piece data is invalid (consecutive number)"
                };
              }
              sumFields += parseInt(rows[i][k], 10);
              previousWasNumber = true;
            } else {
              if (!/^[prnbqkPRNBQK]$/.test(rows[i][k])) {
                return {
                  ok: false,
                  error: "Invalid FEN: piece data is invalid (invalid piece)"
                };
              }
              sumFields += 1;
              previousWasNumber = false;
            }
          }
          if (sumFields !== 8) {
            return {
              ok: false,
              error: "Invalid FEN: piece data is invalid (too many squares in rank)"
            };
          }
        }
        if (tokens[3][1] == "3" && tokens[1] == "w" || tokens[3][1] == "6" && tokens[1] == "b") {
          return { ok: false, error: "Invalid FEN: illegal en-passant square" };
        }
        const kings = [
          { color: "white", regex: /K/g },
          { color: "black", regex: /k/g }
        ];
        for (const { color, regex } of kings) {
          if (!regex.test(tokens[0])) {
            return { ok: false, error: `Invalid FEN: missing ${color} king` };
          }
          if ((tokens[0].match(regex) || []).length > 1) {
            return { ok: false, error: `Invalid FEN: too many ${color} kings` };
          }
        }
        if (Array.from(rows[0] + rows[7]).some((char) => char.toUpperCase() === "P")) {
          return {
            ok: false,
            error: "Invalid FEN: some pawns are on the edge rows"
          };
        }
        return { ok: true };
      }
      function getDisambiguator(move, moves) {
        const from = move.from;
        const to = move.to;
        const piece = move.piece;
        let ambiguities = 0;
        let sameRank = 0;
        let sameFile = 0;
        for (let i = 0, len = moves.length; i < len; i++) {
          const ambigFrom = moves[i].from;
          const ambigTo = moves[i].to;
          const ambigPiece = moves[i].piece;
          if (piece === ambigPiece && from !== ambigFrom && to === ambigTo) {
            ambiguities++;
            if (rank(from) === rank(ambigFrom)) {
              sameRank++;
            }
            if (file(from) === file(ambigFrom)) {
              sameFile++;
            }
          }
        }
        if (ambiguities > 0) {
          if (sameRank > 0 && sameFile > 0) {
            return algebraic(from);
          } else if (sameFile > 0) {
            return algebraic(from).charAt(1);
          } else {
            return algebraic(from).charAt(0);
          }
        }
        return "";
      }
      function addMove(moves, color, from, to, piece, captured = void 0, flags = BITS.NORMAL) {
        const r = rank(to);
        if (piece === PAWN && (r === RANK_1 || r === RANK_8)) {
          for (let i = 0; i < PROMOTIONS.length; i++) {
            const promotion = PROMOTIONS[i];
            moves.push({
              color,
              from,
              to,
              piece,
              captured,
              promotion,
              flags: flags | BITS.PROMOTION
            });
          }
        } else {
          moves.push({
            color,
            from,
            to,
            piece,
            captured,
            flags
          });
        }
      }
      function inferPieceType(san) {
        let pieceType = san.charAt(0);
        if (pieceType >= "a" && pieceType <= "h") {
          const matches = san.match(/[a-h]\d.*[a-h]\d/);
          if (matches) {
            return void 0;
          }
          return PAWN;
        }
        pieceType = pieceType.toLowerCase();
        if (pieceType === "o") {
          return KING;
        }
        return pieceType;
      }
      function strippedSan(move) {
        return move.replace(/=/, "").replace(/[+#]?[?!]*$/, "");
      }
      var Chess2 = class {
        _board = new Array(128);
        _turn = WHITE;
        _header = {};
        _kings = { w: EMPTY, b: EMPTY };
        _epSquare = -1;
        _halfMoves = 0;
        _moveNumber = 0;
        _history = [];
        _comments = {};
        _castling = { w: 0, b: 0 };
        _hash = 0n;
        // tracks number of times a position has been seen for repetition checking
        _positionCount = /* @__PURE__ */ new Map();
        constructor(fen = DEFAULT_POSITION, { skipValidation = false } = {}) {
          this.load(fen, { skipValidation });
        }
        clear({ preserveHeaders = false } = {}) {
          this._board = new Array(128);
          this._kings = { w: EMPTY, b: EMPTY };
          this._turn = WHITE;
          this._castling = { w: 0, b: 0 };
          this._epSquare = EMPTY;
          this._halfMoves = 0;
          this._moveNumber = 1;
          this._history = [];
          this._comments = {};
          this._header = preserveHeaders ? this._header : { ...HEADER_TEMPLATE };
          this._hash = this._computeHash();
          this._positionCount = /* @__PURE__ */ new Map();
          this._header["SetUp"] = null;
          this._header["FEN"] = null;
        }
        load(fen, { skipValidation = false, preserveHeaders = false } = {}) {
          let tokens = fen.split(/\s+/);
          if (tokens.length >= 2 && tokens.length < 6) {
            const adjustments = ["-", "-", "0", "1"];
            fen = tokens.concat(adjustments.slice(-(6 - tokens.length))).join(" ");
          }
          tokens = fen.split(/\s+/);
          if (!skipValidation) {
            const { ok, error } = validateFen(fen);
            if (!ok) {
              throw new Error(error);
            }
          }
          const position = tokens[0];
          let square = 0;
          this.clear({ preserveHeaders });
          for (let i = 0; i < position.length; i++) {
            const piece = position.charAt(i);
            if (piece === "/") {
              square += 8;
            } else if (isDigit(piece)) {
              square += parseInt(piece, 10);
            } else {
              const color = piece < "a" ? WHITE : BLACK;
              this._put({ type: piece.toLowerCase(), color }, algebraic(square));
              square++;
            }
          }
          this._turn = tokens[1];
          if (tokens[2].indexOf("K") > -1) {
            this._castling.w |= BITS.KSIDE_CASTLE;
          }
          if (tokens[2].indexOf("Q") > -1) {
            this._castling.w |= BITS.QSIDE_CASTLE;
          }
          if (tokens[2].indexOf("k") > -1) {
            this._castling.b |= BITS.KSIDE_CASTLE;
          }
          if (tokens[2].indexOf("q") > -1) {
            this._castling.b |= BITS.QSIDE_CASTLE;
          }
          this._epSquare = tokens[3] === "-" ? EMPTY : Ox88[tokens[3]];
          this._halfMoves = parseInt(tokens[4], 10);
          this._moveNumber = parseInt(tokens[5], 10);
          this._hash = this._computeHash();
          this._updateSetup(fen);
          this._incPositionCount();
        }
        fen({ forceEnpassantSquare = false } = {}) {
          var _a, _b;
          let empty = 0;
          let fen = "";
          for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            if (this._board[i]) {
              if (empty > 0) {
                fen += empty;
                empty = 0;
              }
              const { color, type: piece } = this._board[i];
              fen += color === WHITE ? piece.toUpperCase() : piece.toLowerCase();
            } else {
              empty++;
            }
            if (i + 1 & 136) {
              if (empty > 0) {
                fen += empty;
              }
              if (i !== Ox88.h1) {
                fen += "/";
              }
              empty = 0;
              i += 8;
            }
          }
          let castling = "";
          if (this._castling[WHITE] & BITS.KSIDE_CASTLE) {
            castling += "K";
          }
          if (this._castling[WHITE] & BITS.QSIDE_CASTLE) {
            castling += "Q";
          }
          if (this._castling[BLACK] & BITS.KSIDE_CASTLE) {
            castling += "k";
          }
          if (this._castling[BLACK] & BITS.QSIDE_CASTLE) {
            castling += "q";
          }
          castling = castling || "-";
          let epSquare = "-";
          if (this._epSquare !== EMPTY) {
            if (forceEnpassantSquare) {
              epSquare = algebraic(this._epSquare);
            } else {
              const bigPawnSquare = this._epSquare + (this._turn === WHITE ? 16 : -16);
              const squares = [bigPawnSquare + 1, bigPawnSquare - 1];
              for (const square of squares) {
                if (square & 136) {
                  continue;
                }
                const color = this._turn;
                if (((_a = this._board[square]) == null ? void 0 : _a.color) === color && ((_b = this._board[square]) == null ? void 0 : _b.type) === PAWN) {
                  this._makeMove({
                    color,
                    from: square,
                    to: this._epSquare,
                    piece: PAWN,
                    captured: PAWN,
                    flags: BITS.EP_CAPTURE
                  });
                  const isLegal = !this._isKingAttacked(color);
                  this._undoMove();
                  if (isLegal) {
                    epSquare = algebraic(this._epSquare);
                    break;
                  }
                }
              }
            }
          }
          return [
            fen,
            this._turn,
            castling,
            epSquare,
            this._halfMoves,
            this._moveNumber
          ].join(" ");
        }
        _pieceKey(i) {
          if (!this._board[i]) {
            return 0n;
          }
          const { color, type } = this._board[i];
          const colorIndex = {
            w: 0,
            b: 1
          }[color];
          const typeIndex = {
            p: 0,
            n: 1,
            b: 2,
            r: 3,
            q: 4,
            k: 5
          }[type];
          return PIECE_KEYS[colorIndex][typeIndex][i];
        }
        _epKey() {
          return this._epSquare === EMPTY ? 0n : EP_KEYS[this._epSquare & 7];
        }
        _castlingKey() {
          const index = this._castling.w >> 5 | this._castling.b >> 3;
          return CASTLING_KEYS[index];
        }
        _computeHash() {
          let hash = 0n;
          for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            if (i & 136) {
              i += 7;
              continue;
            }
            if (this._board[i]) {
              hash ^= this._pieceKey(i);
            }
          }
          hash ^= this._epKey();
          hash ^= this._castlingKey();
          if (this._turn === "b") {
            hash ^= SIDE_KEY;
          }
          return hash;
        }
        /*
         * Called when the initial board setup is changed with put() or remove().
         * modifies the SetUp and FEN properties of the header object. If the FEN
         * is equal to the default position, the SetUp and FEN are deleted the setup
         * is only updated if history.length is zero, ie moves haven't been made.
         */
        _updateSetup(fen) {
          if (this._history.length > 0)
            return;
          if (fen !== DEFAULT_POSITION) {
            this._header["SetUp"] = "1";
            this._header["FEN"] = fen;
          } else {
            this._header["SetUp"] = null;
            this._header["FEN"] = null;
          }
        }
        reset() {
          this.load(DEFAULT_POSITION);
        }
        get(square) {
          return this._board[Ox88[square]];
        }
        findPiece(piece) {
          var _a;
          const squares = [];
          for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            if (i & 136) {
              i += 7;
              continue;
            }
            if (!this._board[i] || ((_a = this._board[i]) == null ? void 0 : _a.color) !== piece.color) {
              continue;
            }
            if (this._board[i].color === piece.color && this._board[i].type === piece.type) {
              squares.push(algebraic(i));
            }
          }
          return squares;
        }
        put({ type, color }, square) {
          if (this._put({ type, color }, square)) {
            this._updateCastlingRights();
            this._updateEnPassantSquare();
            this._updateSetup(this.fen());
            return true;
          }
          return false;
        }
        _set(sq, piece) {
          this._hash ^= this._pieceKey(sq);
          this._board[sq] = piece;
          this._hash ^= this._pieceKey(sq);
        }
        _put({ type, color }, square) {
          if (SYMBOLS.indexOf(type.toLowerCase()) === -1) {
            return false;
          }
          if (!(square in Ox88)) {
            return false;
          }
          const sq = Ox88[square];
          if (type == KING && !(this._kings[color] == EMPTY || this._kings[color] == sq)) {
            return false;
          }
          const currentPieceOnSquare = this._board[sq];
          if (currentPieceOnSquare && currentPieceOnSquare.type === KING) {
            this._kings[currentPieceOnSquare.color] = EMPTY;
          }
          this._set(sq, { type, color });
          if (type === KING) {
            this._kings[color] = sq;
          }
          return true;
        }
        _clear(sq) {
          this._hash ^= this._pieceKey(sq);
          delete this._board[sq];
        }
        remove(square) {
          const piece = this.get(square);
          this._clear(Ox88[square]);
          if (piece && piece.type === KING) {
            this._kings[piece.color] = EMPTY;
          }
          this._updateCastlingRights();
          this._updateEnPassantSquare();
          this._updateSetup(this.fen());
          return piece;
        }
        _updateCastlingRights() {
          var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
          this._hash ^= this._castlingKey();
          const whiteKingInPlace = ((_a = this._board[Ox88.e1]) == null ? void 0 : _a.type) === KING && ((_b = this._board[Ox88.e1]) == null ? void 0 : _b.color) === WHITE;
          const blackKingInPlace = ((_c = this._board[Ox88.e8]) == null ? void 0 : _c.type) === KING && ((_d = this._board[Ox88.e8]) == null ? void 0 : _d.color) === BLACK;
          if (!whiteKingInPlace || ((_e = this._board[Ox88.a1]) == null ? void 0 : _e.type) !== ROOK || ((_f = this._board[Ox88.a1]) == null ? void 0 : _f.color) !== WHITE) {
            this._castling.w &= -65;
          }
          if (!whiteKingInPlace || ((_g = this._board[Ox88.h1]) == null ? void 0 : _g.type) !== ROOK || ((_h = this._board[Ox88.h1]) == null ? void 0 : _h.color) !== WHITE) {
            this._castling.w &= -33;
          }
          if (!blackKingInPlace || ((_i = this._board[Ox88.a8]) == null ? void 0 : _i.type) !== ROOK || ((_j = this._board[Ox88.a8]) == null ? void 0 : _j.color) !== BLACK) {
            this._castling.b &= -65;
          }
          if (!blackKingInPlace || ((_k = this._board[Ox88.h8]) == null ? void 0 : _k.type) !== ROOK || ((_l = this._board[Ox88.h8]) == null ? void 0 : _l.color) !== BLACK) {
            this._castling.b &= -33;
          }
          this._hash ^= this._castlingKey();
        }
        _updateEnPassantSquare() {
          var _a, _b;
          if (this._epSquare === EMPTY) {
            return;
          }
          const startSquare = this._epSquare + (this._turn === WHITE ? -16 : 16);
          const currentSquare = this._epSquare + (this._turn === WHITE ? 16 : -16);
          const attackers = [currentSquare + 1, currentSquare - 1];
          if (this._board[startSquare] !== null || this._board[this._epSquare] !== null || ((_a = this._board[currentSquare]) == null ? void 0 : _a.color) !== swapColor(this._turn) || ((_b = this._board[currentSquare]) == null ? void 0 : _b.type) !== PAWN) {
            this._hash ^= this._epKey();
            this._epSquare = EMPTY;
            return;
          }
          const canCapture = (square) => {
            var _a2, _b2;
            return !(square & 136) && ((_a2 = this._board[square]) == null ? void 0 : _a2.color) === this._turn && ((_b2 = this._board[square]) == null ? void 0 : _b2.type) === PAWN;
          };
          if (!attackers.some(canCapture)) {
            this._hash ^= this._epKey();
            this._epSquare = EMPTY;
          }
        }
        _attacked(color, square, verbose) {
          const attackers = [];
          for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            if (i & 136) {
              i += 7;
              continue;
            }
            if (this._board[i] === void 0 || this._board[i].color !== color) {
              continue;
            }
            const piece = this._board[i];
            const difference = i - square;
            if (difference === 0) {
              continue;
            }
            const index = difference + 119;
            if (ATTACKS[index] & PIECE_MASKS[piece.type]) {
              if (piece.type === PAWN) {
                if (difference > 0 && piece.color === WHITE || difference <= 0 && piece.color === BLACK) {
                  if (!verbose) {
                    return true;
                  } else {
                    attackers.push(algebraic(i));
                  }
                }
                continue;
              }
              if (piece.type === "n" || piece.type === "k") {
                if (!verbose) {
                  return true;
                } else {
                  attackers.push(algebraic(i));
                  continue;
                }
              }
              const offset = RAYS[index];
              let j = i + offset;
              let blocked = false;
              while (j !== square) {
                if (this._board[j] != null) {
                  blocked = true;
                  break;
                }
                j += offset;
              }
              if (!blocked) {
                if (!verbose) {
                  return true;
                } else {
                  attackers.push(algebraic(i));
                  continue;
                }
              }
            }
          }
          if (verbose) {
            return attackers;
          } else {
            return false;
          }
        }
        attackers(square, attackedBy) {
          if (!attackedBy) {
            return this._attacked(this._turn, Ox88[square], true);
          } else {
            return this._attacked(attackedBy, Ox88[square], true);
          }
        }
        _isKingAttacked(color) {
          const square = this._kings[color];
          return square === -1 ? false : this._attacked(swapColor(color), square);
        }
        hash() {
          return this._hash.toString(16);
        }
        isAttacked(square, attackedBy) {
          return this._attacked(attackedBy, Ox88[square]);
        }
        isCheck() {
          return this._isKingAttacked(this._turn);
        }
        inCheck() {
          return this.isCheck();
        }
        isCheckmate() {
          return this.isCheck() && this._moves().length === 0;
        }
        isStalemate() {
          return !this.isCheck() && this._moves().length === 0;
        }
        isInsufficientMaterial() {
          const pieces = {
            b: 0,
            n: 0,
            r: 0,
            q: 0,
            k: 0,
            p: 0
          };
          const bishops = [];
          let numPieces = 0;
          let squareColor = 0;
          for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            squareColor = (squareColor + 1) % 2;
            if (i & 136) {
              i += 7;
              continue;
            }
            const piece = this._board[i];
            if (piece) {
              pieces[piece.type] = piece.type in pieces ? pieces[piece.type] + 1 : 1;
              if (piece.type === BISHOP) {
                bishops.push(squareColor);
              }
              numPieces++;
            }
          }
          if (numPieces === 2) {
            return true;
          } else if (
            // k vs. kn .... or .... k vs. kb
            numPieces === 3 && (pieces[BISHOP] === 1 || pieces[KNIGHT] === 1)
          ) {
            return true;
          } else if (numPieces === pieces[BISHOP] + 2) {
            let sum = 0;
            const len = bishops.length;
            for (let i = 0; i < len; i++) {
              sum += bishops[i];
            }
            if (sum === 0 || sum === len) {
              return true;
            }
          }
          return false;
        }
        isThreefoldRepetition() {
          return this._getPositionCount(this._hash) >= 3;
        }
        isDrawByFiftyMoves() {
          return this._halfMoves >= 100;
        }
        isDraw() {
          return this.isDrawByFiftyMoves() || this.isStalemate() || this.isInsufficientMaterial() || this.isThreefoldRepetition();
        }
        isGameOver() {
          return this.isCheckmate() || this.isDraw();
        }
        moves({ verbose = false, square = void 0, piece = void 0 } = {}) {
          const moves = this._moves({ square, piece });
          if (verbose) {
            return moves.map((move) => new Move(this, move));
          } else {
            return moves.map((move) => this._moveToSan(move, moves));
          }
        }
        _moves({ legal = true, piece = void 0, square = void 0 } = {}) {
          var _a;
          const forSquare = square ? square.toLowerCase() : void 0;
          const forPiece = piece == null ? void 0 : piece.toLowerCase();
          const moves = [];
          const us = this._turn;
          const them = swapColor(us);
          let firstSquare = Ox88.a8;
          let lastSquare = Ox88.h1;
          let singleSquare = false;
          if (forSquare) {
            if (!(forSquare in Ox88)) {
              return [];
            } else {
              firstSquare = lastSquare = Ox88[forSquare];
              singleSquare = true;
            }
          }
          for (let from = firstSquare; from <= lastSquare; from++) {
            if (from & 136) {
              from += 7;
              continue;
            }
            if (!this._board[from] || this._board[from].color === them) {
              continue;
            }
            const { type } = this._board[from];
            let to;
            if (type === PAWN) {
              if (forPiece && forPiece !== type)
                continue;
              to = from + PAWN_OFFSETS[us][0];
              if (!this._board[to]) {
                addMove(moves, us, from, to, PAWN);
                to = from + PAWN_OFFSETS[us][1];
                if (SECOND_RANK[us] === rank(from) && !this._board[to]) {
                  addMove(moves, us, from, to, PAWN, void 0, BITS.BIG_PAWN);
                }
              }
              for (let j = 2; j < 4; j++) {
                to = from + PAWN_OFFSETS[us][j];
                if (to & 136)
                  continue;
                if (((_a = this._board[to]) == null ? void 0 : _a.color) === them) {
                  addMove(moves, us, from, to, PAWN, this._board[to].type, BITS.CAPTURE);
                } else if (to === this._epSquare) {
                  addMove(moves, us, from, to, PAWN, PAWN, BITS.EP_CAPTURE);
                }
              }
            } else {
              if (forPiece && forPiece !== type)
                continue;
              for (let j = 0, len = PIECE_OFFSETS[type].length; j < len; j++) {
                const offset = PIECE_OFFSETS[type][j];
                to = from;
                while (true) {
                  to += offset;
                  if (to & 136)
                    break;
                  if (!this._board[to]) {
                    addMove(moves, us, from, to, type);
                  } else {
                    if (this._board[to].color === us)
                      break;
                    addMove(moves, us, from, to, type, this._board[to].type, BITS.CAPTURE);
                    break;
                  }
                  if (type === KNIGHT || type === KING)
                    break;
                }
              }
            }
          }
          if (forPiece === void 0 || forPiece === KING) {
            if (!singleSquare || lastSquare === this._kings[us]) {
              if (this._castling[us] & BITS.KSIDE_CASTLE) {
                const castlingFrom = this._kings[us];
                const castlingTo = castlingFrom + 2;
                if (!this._board[castlingFrom + 1] && !this._board[castlingTo] && !this._attacked(them, this._kings[us]) && !this._attacked(them, castlingFrom + 1) && !this._attacked(them, castlingTo)) {
                  addMove(moves, us, this._kings[us], castlingTo, KING, void 0, BITS.KSIDE_CASTLE);
                }
              }
              if (this._castling[us] & BITS.QSIDE_CASTLE) {
                const castlingFrom = this._kings[us];
                const castlingTo = castlingFrom - 2;
                if (!this._board[castlingFrom - 1] && !this._board[castlingFrom - 2] && !this._board[castlingFrom - 3] && !this._attacked(them, this._kings[us]) && !this._attacked(them, castlingFrom - 1) && !this._attacked(them, castlingTo)) {
                  addMove(moves, us, this._kings[us], castlingTo, KING, void 0, BITS.QSIDE_CASTLE);
                }
              }
            }
          }
          if (!legal || this._kings[us] === -1) {
            return moves;
          }
          const legalMoves = [];
          for (let i = 0, len = moves.length; i < len; i++) {
            this._makeMove(moves[i]);
            if (!this._isKingAttacked(us)) {
              legalMoves.push(moves[i]);
            }
            this._undoMove();
          }
          return legalMoves;
        }
        move(move, { strict = false } = {}) {
          let moveObj = null;
          if (typeof move === "string") {
            moveObj = this._moveFromSan(move, strict);
          } else if (move === null) {
            moveObj = this._moveFromSan(SAN_NULLMOVE, strict);
          } else if (typeof move === "object") {
            const moves = this._moves();
            for (let i = 0, len = moves.length; i < len; i++) {
              if (move.from === algebraic(moves[i].from) && move.to === algebraic(moves[i].to) && (!("promotion" in moves[i]) || move.promotion === moves[i].promotion)) {
                moveObj = moves[i];
                break;
              }
            }
          }
          if (!moveObj) {
            if (typeof move === "string") {
              throw new Error(`Invalid move: ${move}`);
            } else {
              throw new Error(`Invalid move: ${JSON.stringify(move)}`);
            }
          }
          if (this.isCheck() && moveObj.flags & BITS.NULL_MOVE) {
            throw new Error("Null move not allowed when in check");
          }
          const prettyMove = new Move(this, moveObj);
          this._makeMove(moveObj);
          this._incPositionCount();
          return prettyMove;
        }
        _push(move) {
          this._history.push({
            move,
            kings: { b: this._kings.b, w: this._kings.w },
            turn: this._turn,
            castling: { b: this._castling.b, w: this._castling.w },
            epSquare: this._epSquare,
            halfMoves: this._halfMoves,
            moveNumber: this._moveNumber
          });
        }
        _movePiece(from, to) {
          this._hash ^= this._pieceKey(from);
          this._board[to] = this._board[from];
          delete this._board[from];
          this._hash ^= this._pieceKey(to);
        }
        _makeMove(move) {
          var _a, _b, _c, _d;
          const us = this._turn;
          const them = swapColor(us);
          this._push(move);
          if (move.flags & BITS.NULL_MOVE) {
            if (us === BLACK) {
              this._moveNumber++;
            }
            this._halfMoves++;
            this._turn = them;
            this._epSquare = EMPTY;
            return;
          }
          this._hash ^= this._epKey();
          this._hash ^= this._castlingKey();
          if (move.captured) {
            this._hash ^= this._pieceKey(move.to);
          }
          this._movePiece(move.from, move.to);
          if (move.flags & BITS.EP_CAPTURE) {
            if (this._turn === BLACK) {
              this._clear(move.to - 16);
            } else {
              this._clear(move.to + 16);
            }
          }
          if (move.promotion) {
            this._clear(move.to);
            this._set(move.to, { type: move.promotion, color: us });
          }
          if (this._board[move.to].type === KING) {
            this._kings[us] = move.to;
            if (move.flags & BITS.KSIDE_CASTLE) {
              const castlingTo = move.to - 1;
              const castlingFrom = move.to + 1;
              this._movePiece(castlingFrom, castlingTo);
            } else if (move.flags & BITS.QSIDE_CASTLE) {
              const castlingTo = move.to + 1;
              const castlingFrom = move.to - 2;
              this._movePiece(castlingFrom, castlingTo);
            }
            this._castling[us] = 0;
          }
          if (this._castling[us]) {
            for (let i = 0, len = ROOKS[us].length; i < len; i++) {
              if (move.from === ROOKS[us][i].square && this._castling[us] & ROOKS[us][i].flag) {
                this._castling[us] ^= ROOKS[us][i].flag;
                break;
              }
            }
          }
          if (this._castling[them]) {
            for (let i = 0, len = ROOKS[them].length; i < len; i++) {
              if (move.to === ROOKS[them][i].square && this._castling[them] & ROOKS[them][i].flag) {
                this._castling[them] ^= ROOKS[them][i].flag;
                break;
              }
            }
          }
          this._hash ^= this._castlingKey();
          if (move.flags & BITS.BIG_PAWN) {
            let epSquare;
            if (us === BLACK) {
              epSquare = move.to - 16;
            } else {
              epSquare = move.to + 16;
            }
            if (!(move.to - 1 & 136) && ((_a = this._board[move.to - 1]) == null ? void 0 : _a.type) === PAWN && ((_b = this._board[move.to - 1]) == null ? void 0 : _b.color) === them || !(move.to + 1 & 136) && ((_c = this._board[move.to + 1]) == null ? void 0 : _c.type) === PAWN && ((_d = this._board[move.to + 1]) == null ? void 0 : _d.color) === them) {
              this._epSquare = epSquare;
              this._hash ^= this._epKey();
            } else {
              this._epSquare = EMPTY;
            }
          } else {
            this._epSquare = EMPTY;
          }
          if (move.piece === PAWN) {
            this._halfMoves = 0;
          } else if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
            this._halfMoves = 0;
          } else {
            this._halfMoves++;
          }
          if (us === BLACK) {
            this._moveNumber++;
          }
          this._turn = them;
          this._hash ^= SIDE_KEY;
        }
        undo() {
          const hash = this._hash;
          const move = this._undoMove();
          if (move) {
            const prettyMove = new Move(this, move);
            this._decPositionCount(hash);
            return prettyMove;
          }
          return null;
        }
        _undoMove() {
          const old = this._history.pop();
          if (old === void 0) {
            return null;
          }
          this._hash ^= this._epKey();
          this._hash ^= this._castlingKey();
          const move = old.move;
          this._kings = old.kings;
          this._turn = old.turn;
          this._castling = old.castling;
          this._epSquare = old.epSquare;
          this._halfMoves = old.halfMoves;
          this._moveNumber = old.moveNumber;
          this._hash ^= this._epKey();
          this._hash ^= this._castlingKey();
          this._hash ^= SIDE_KEY;
          const us = this._turn;
          const them = swapColor(us);
          if (move.flags & BITS.NULL_MOVE) {
            return move;
          }
          this._movePiece(move.to, move.from);
          if (move.piece) {
            this._clear(move.from);
            this._set(move.from, { type: move.piece, color: us });
          }
          if (move.captured) {
            if (move.flags & BITS.EP_CAPTURE) {
              let index;
              if (us === BLACK) {
                index = move.to - 16;
              } else {
                index = move.to + 16;
              }
              this._set(index, { type: PAWN, color: them });
            } else {
              this._set(move.to, { type: move.captured, color: them });
            }
          }
          if (move.flags & (BITS.KSIDE_CASTLE | BITS.QSIDE_CASTLE)) {
            let castlingTo, castlingFrom;
            if (move.flags & BITS.KSIDE_CASTLE) {
              castlingTo = move.to + 1;
              castlingFrom = move.to - 1;
            } else {
              castlingTo = move.to - 2;
              castlingFrom = move.to + 1;
            }
            this._movePiece(castlingFrom, castlingTo);
          }
          return move;
        }
        pgn({ newline = "\n", maxWidth = 0 } = {}) {
          const result = [];
          let headerExists = false;
          for (const i in this._header) {
            const headerTag = this._header[i];
            if (headerTag)
              result.push(`[${i} "${this._header[i]}"]` + newline);
            headerExists = true;
          }
          if (headerExists && this._history.length) {
            result.push(newline);
          }
          const appendComment = (moveString2) => {
            const comment = this._comments[this.fen()];
            if (typeof comment !== "undefined") {
              const delimiter = moveString2.length > 0 ? " " : "";
              moveString2 = `${moveString2}${delimiter}{${comment}}`;
            }
            return moveString2;
          };
          const reversedHistory = [];
          while (this._history.length > 0) {
            reversedHistory.push(this._undoMove());
          }
          const moves = [];
          let moveString = "";
          if (reversedHistory.length === 0) {
            moves.push(appendComment(""));
          }
          while (reversedHistory.length > 0) {
            moveString = appendComment(moveString);
            const move = reversedHistory.pop();
            if (!move) {
              break;
            }
            if (!this._history.length && move.color === "b") {
              const prefix = `${this._moveNumber}. ...`;
              moveString = moveString ? `${moveString} ${prefix}` : prefix;
            } else if (move.color === "w") {
              if (moveString.length) {
                moves.push(moveString);
              }
              moveString = this._moveNumber + ".";
            }
            moveString = moveString + " " + this._moveToSan(move, this._moves({ legal: true }));
            this._makeMove(move);
          }
          if (moveString.length) {
            moves.push(appendComment(moveString));
          }
          moves.push(this._header.Result || "*");
          if (maxWidth === 0) {
            return result.join("") + moves.join(" ");
          }
          const strip = function() {
            if (result.length > 0 && result[result.length - 1] === " ") {
              result.pop();
              return true;
            }
            return false;
          };
          const wrapComment = function(width, move) {
            for (const token of move.split(" ")) {
              if (!token) {
                continue;
              }
              if (width + token.length > maxWidth) {
                while (strip()) {
                  width--;
                }
                result.push(newline);
                width = 0;
              }
              result.push(token);
              width += token.length;
              result.push(" ");
              width++;
            }
            if (strip()) {
              width--;
            }
            return width;
          };
          let currentWidth = 0;
          for (let i = 0; i < moves.length; i++) {
            if (currentWidth + moves[i].length > maxWidth) {
              if (moves[i].includes("{")) {
                currentWidth = wrapComment(currentWidth, moves[i]);
                continue;
              }
            }
            if (currentWidth + moves[i].length > maxWidth && i !== 0) {
              if (result[result.length - 1] === " ") {
                result.pop();
              }
              result.push(newline);
              currentWidth = 0;
            } else if (i !== 0) {
              result.push(" ");
              currentWidth++;
            }
            result.push(moves[i]);
            currentWidth += moves[i].length;
          }
          return result.join("");
        }
        /**
         * @deprecated Use `setHeader` and `getHeaders` instead. This method will return null header tags (which is not what you want)
         */
        header(...args) {
          for (let i = 0; i < args.length; i += 2) {
            if (typeof args[i] === "string" && typeof args[i + 1] === "string") {
              this._header[args[i]] = args[i + 1];
            }
          }
          return this._header;
        }
        // TODO: value validation per spec
        setHeader(key, value) {
          this._header[key] = value ?? SEVEN_TAG_ROSTER[key] ?? null;
          return this.getHeaders();
        }
        removeHeader(key) {
          if (key in this._header) {
            this._header[key] = SEVEN_TAG_ROSTER[key] || null;
            return true;
          }
          return false;
        }
        // return only non-null headers (omit placemarker nulls)
        getHeaders() {
          const nonNullHeaders = {};
          for (const [key, value] of Object.entries(this._header)) {
            if (value !== null) {
              nonNullHeaders[key] = value;
            }
          }
          return nonNullHeaders;
        }
        loadPgn(pgn2, { strict = false, newlineChar = "\r?\n" } = {}) {
          if (newlineChar !== "\r?\n") {
            pgn2 = pgn2.replace(new RegExp(newlineChar, "g"), "\n");
          }
          const parsedPgn = peg$parse(pgn2);
          this.reset();
          const headers = parsedPgn.headers;
          let fen = "";
          for (const key in headers) {
            if (key.toLowerCase() === "fen") {
              fen = headers[key];
            }
            this.header(key, headers[key]);
          }
          if (!strict) {
            if (fen) {
              this.load(fen, { preserveHeaders: true });
            }
          } else {
            if (headers["SetUp"] === "1") {
              if (!("FEN" in headers)) {
                throw new Error("Invalid PGN: FEN tag must be supplied with SetUp tag");
              }
              this.load(headers["FEN"], { preserveHeaders: true });
            }
          }
          let node2 = parsedPgn.root;
          while (node2) {
            if (node2.move) {
              const move = this._moveFromSan(node2.move, strict);
              if (move == null) {
                throw new Error(`Invalid move in PGN: ${node2.move}`);
              } else {
                this._makeMove(move);
                this._incPositionCount();
              }
            }
            if (node2.comment !== void 0) {
              this._comments[this.fen()] = node2.comment;
            }
            node2 = node2.variations[0];
          }
          const result = parsedPgn.result;
          if (result && Object.keys(this._header).length && this._header["Result"] !== result) {
            this.setHeader("Result", result);
          }
        }
        /*
         * Convert a move from 0x88 coordinates to Standard Algebraic Notation
         * (SAN)
         *
         * @param {boolean} strict Use the strict SAN parser. It will throw errors
         * on overly disambiguated moves (see below):
         *
         * r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4
         * 4. ... Nge7 is overly disambiguated because the knight on c6 is pinned
         * 4. ... Ne7 is technically the valid SAN
         */
        _moveToSan(move, moves) {
          let output = "";
          if (move.flags & BITS.KSIDE_CASTLE) {
            output = "O-O";
          } else if (move.flags & BITS.QSIDE_CASTLE) {
            output = "O-O-O";
          } else if (move.flags & BITS.NULL_MOVE) {
            return SAN_NULLMOVE;
          } else {
            if (move.piece !== PAWN) {
              const disambiguator = getDisambiguator(move, moves);
              output += move.piece.toUpperCase() + disambiguator;
            }
            if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
              if (move.piece === PAWN) {
                output += algebraic(move.from)[0];
              }
              output += "x";
            }
            output += algebraic(move.to);
            if (move.promotion) {
              output += "=" + move.promotion.toUpperCase();
            }
          }
          this._makeMove(move);
          if (this.isCheck()) {
            if (this.isCheckmate()) {
              output += "#";
            } else {
              output += "+";
            }
          }
          this._undoMove();
          return output;
        }
        // convert a move from Standard Algebraic Notation (SAN) to 0x88 coordinates
        _moveFromSan(move, strict = false) {
          let cleanMove = strippedSan(move);
          if (!strict) {
            if (cleanMove === "0-0") {
              cleanMove = "O-O";
            } else if (cleanMove === "0-0-0") {
              cleanMove = "O-O-O";
            }
          }
          if (cleanMove == SAN_NULLMOVE) {
            const res = {
              color: this._turn,
              from: 0,
              to: 0,
              piece: "k",
              flags: BITS.NULL_MOVE
            };
            return res;
          }
          let pieceType = inferPieceType(cleanMove);
          let moves = this._moves({ legal: true, piece: pieceType });
          for (let i = 0, len = moves.length; i < len; i++) {
            if (cleanMove === strippedSan(this._moveToSan(moves[i], moves))) {
              return moves[i];
            }
          }
          if (strict) {
            return null;
          }
          let piece = void 0;
          let matches = void 0;
          let from = void 0;
          let to = void 0;
          let promotion = void 0;
          let overlyDisambiguated = false;
          matches = cleanMove.match(/([pnbrqkPNBRQK])?([a-h][1-8])x?-?([a-h][1-8])([qrbnQRBN])?/);
          if (matches) {
            piece = matches[1];
            from = matches[2];
            to = matches[3];
            promotion = matches[4];
            if (from.length == 1) {
              overlyDisambiguated = true;
            }
          } else {
            matches = cleanMove.match(/([pnbrqkPNBRQK])?([a-h]?[1-8]?)x?-?([a-h][1-8])([qrbnQRBN])?/);
            if (matches) {
              piece = matches[1];
              from = matches[2];
              to = matches[3];
              promotion = matches[4];
              if (from.length == 1) {
                overlyDisambiguated = true;
              }
            }
          }
          pieceType = inferPieceType(cleanMove);
          moves = this._moves({
            legal: true,
            piece: piece ? piece : pieceType
          });
          if (!to) {
            return null;
          }
          for (let i = 0, len = moves.length; i < len; i++) {
            if (!from) {
              if (cleanMove === strippedSan(this._moveToSan(moves[i], moves)).replace("x", "")) {
                return moves[i];
              }
            } else if ((!piece || piece.toLowerCase() == moves[i].piece) && Ox88[from] == moves[i].from && Ox88[to] == moves[i].to && (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
              return moves[i];
            } else if (overlyDisambiguated) {
              const square = algebraic(moves[i].from);
              if ((!piece || piece.toLowerCase() == moves[i].piece) && Ox88[to] == moves[i].to && (from == square[0] || from == square[1]) && (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
                return moves[i];
              }
            }
          }
          return null;
        }
        ascii() {
          let s = "   +------------------------+\n";
          for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            if (file(i) === 0) {
              s += " " + "87654321"[rank(i)] + " |";
            }
            if (this._board[i]) {
              const piece = this._board[i].type;
              const color = this._board[i].color;
              const symbol = color === WHITE ? piece.toUpperCase() : piece.toLowerCase();
              s += " " + symbol + " ";
            } else {
              s += " . ";
            }
            if (i + 1 & 136) {
              s += "|\n";
              i += 8;
            }
          }
          s += "   +------------------------+\n";
          s += "     a  b  c  d  e  f  g  h";
          return s;
        }
        perft(depth) {
          const moves = this._moves({ legal: false });
          let nodes = 0;
          const color = this._turn;
          for (let i = 0, len = moves.length; i < len; i++) {
            this._makeMove(moves[i]);
            if (!this._isKingAttacked(color)) {
              if (depth - 1 > 0) {
                nodes += this.perft(depth - 1);
              } else {
                nodes++;
              }
            }
            this._undoMove();
          }
          return nodes;
        }
        setTurn(color) {
          if (this._turn == color) {
            return false;
          }
          this.move("--");
          return true;
        }
        turn() {
          return this._turn;
        }
        board() {
          const output = [];
          let row = [];
          for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            if (this._board[i] == null) {
              row.push(null);
            } else {
              row.push({
                square: algebraic(i),
                type: this._board[i].type,
                color: this._board[i].color
              });
            }
            if (i + 1 & 136) {
              output.push(row);
              row = [];
              i += 8;
            }
          }
          return output;
        }
        squareColor(square) {
          if (square in Ox88) {
            const sq = Ox88[square];
            return (rank(sq) + file(sq)) % 2 === 0 ? "light" : "dark";
          }
          return null;
        }
        history({ verbose = false } = {}) {
          const reversedHistory = [];
          const moveHistory = [];
          while (this._history.length > 0) {
            reversedHistory.push(this._undoMove());
          }
          while (true) {
            const move = reversedHistory.pop();
            if (!move) {
              break;
            }
            if (verbose) {
              moveHistory.push(new Move(this, move));
            } else {
              moveHistory.push(this._moveToSan(move, this._moves()));
            }
            this._makeMove(move);
          }
          return moveHistory;
        }
        /*
         * Keeps track of position occurrence counts for the purpose of repetition
         * checking. Old positions are removed from the map if their counts are reduced to 0.
         */
        _getPositionCount(hash) {
          return this._positionCount.get(hash) ?? 0;
        }
        _incPositionCount() {
          this._positionCount.set(this._hash, (this._positionCount.get(this._hash) ?? 0) + 1);
        }
        _decPositionCount(hash) {
          const currentCount = this._positionCount.get(hash) ?? 0;
          if (currentCount === 1) {
            this._positionCount.delete(hash);
          } else {
            this._positionCount.set(hash, currentCount - 1);
          }
        }
        _pruneComments() {
          const reversedHistory = [];
          const currentComments = {};
          const copyComment = (fen) => {
            if (fen in this._comments) {
              currentComments[fen] = this._comments[fen];
            }
          };
          while (this._history.length > 0) {
            reversedHistory.push(this._undoMove());
          }
          copyComment(this.fen());
          while (true) {
            const move = reversedHistory.pop();
            if (!move) {
              break;
            }
            this._makeMove(move);
            copyComment(this.fen());
          }
          this._comments = currentComments;
        }
        getComment() {
          return this._comments[this.fen()];
        }
        setComment(comment) {
          this._comments[this.fen()] = comment.replace("{", "[").replace("}", "]");
        }
        /**
         * @deprecated Renamed to `removeComment` for consistency
         */
        deleteComment() {
          return this.removeComment();
        }
        removeComment() {
          const comment = this._comments[this.fen()];
          delete this._comments[this.fen()];
          return comment;
        }
        getComments() {
          this._pruneComments();
          return Object.keys(this._comments).map((fen) => {
            return { fen, comment: this._comments[fen] };
          });
        }
        /**
         * @deprecated Renamed to `removeComments` for consistency
         */
        deleteComments() {
          return this.removeComments();
        }
        removeComments() {
          this._pruneComments();
          return Object.keys(this._comments).map((fen) => {
            const comment = this._comments[fen];
            delete this._comments[fen];
            return { fen, comment };
          });
        }
        setCastlingRights(color, rights) {
          for (const side of [KING, QUEEN]) {
            if (rights[side] !== void 0) {
              if (rights[side]) {
                this._castling[color] |= SIDES[side];
              } else {
                this._castling[color] &= ~SIDES[side];
              }
            }
          }
          this._updateCastlingRights();
          const result = this.getCastlingRights(color);
          return (rights[KING] === void 0 || rights[KING] === result[KING]) && (rights[QUEEN] === void 0 || rights[QUEEN] === result[QUEEN]);
        }
        getCastlingRights(color) {
          return {
            [KING]: (this._castling[color] & SIDES[KING]) !== 0,
            [QUEEN]: (this._castling[color] & SIDES[QUEEN]) !== 0
          };
        }
        moveNumber() {
          return this._moveNumber;
        }
      };
      exports.BISHOP = BISHOP;
      exports.BLACK = BLACK;
      exports.Chess = Chess2;
      exports.DEFAULT_POSITION = DEFAULT_POSITION;
      exports.KING = KING;
      exports.KNIGHT = KNIGHT;
      exports.Move = Move;
      exports.PAWN = PAWN;
      exports.QUEEN = QUEEN;
      exports.ROOK = ROOK;
      exports.SEVEN_TAG_ROSTER = SEVEN_TAG_ROSTER;
      exports.SQUARES = SQUARES;
      exports.WHITE = WHITE;
      exports.validateFen = validateFen;
      exports.xoroshiro128 = xoroshiro128;
    }
  });

  // src/core.js
  var import_chess = __toESM(require_chess(), 1);

  // src/i18n.js
  var MESSAGES = {
    en: {
      title: "Chess",
      challenge: "{name} challenged you ({tc})",
      rematch: "{name} wants a rematch",
      gameWhite: "Game on! You play White vs {name}",
      gameBlack: "Game on! You play Black vs {name}",
      min: "{n} min",
      sec: "{n} sec"
    },
    pt: {
      title: "Xadrez",
      challenge: "{name} te desafiou ({tc})",
      rematch: "{name} quer uma revanche",
      gameWhite: "Partida iniciada! Voc\xEA joga de Brancas contra {name}",
      gameBlack: "Partida iniciada! Voc\xEA joga de Pretas contra {name}",
      min: "{n} min",
      sec: "{n} s"
    }
  };
  function toLocale(value) {
    const v = String(value ?? "").toLowerCase();
    if (v.startsWith("pt")) return "pt";
    if (v.startsWith("en")) return "en";
    return null;
  }
  function msg(locale, key, params = {}) {
    const text = (MESSAGES[locale] ?? MESSAGES.en)[key] ?? MESSAGES.en[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ""));
  }
  function tcText(locale, tc) {
    const base = tc.base < 60 ? msg(locale, "sec", { n: tc.base }) : msg(locale, "min", { n: tc.base / 60 });
    return tc.inc ? `${tc.base < 60 ? `${tc.base}s` : tc.base / 60} | ${tc.inc}` : base;
  }

  // src/core.js
  var START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  var SQUARE = /^[a-h][1-8]$/;
  var USERNAME = /^[A-Za-z0-9_]+$/;
  var fail = (error) => ({ ok: false, error });
  var other = (c) => c === "w" ? "b" : "w";
  var tcKey = (tc) => `${tc.base}+${tc.inc}`;
  var ChessService = class {
    constructor({ db, push, notify, isOnline, now = Date.now, config: config2, log: log2 = () => {
    } }) {
      this.db = db;
      this.push = push;
      this.notify = notify ?? (() => {
      });
      this.isOnline = isOnline ?? (() => true);
      this.now = now;
      this.cfg = config2;
      this.log = log2;
      this.profiles = /* @__PURE__ */ new Map();
      this.locales = /* @__PURE__ */ new Map();
      this.queues = /* @__PURE__ */ new Map();
      this.challenges = /* @__PURE__ */ new Map();
      this.games = /* @__PURE__ */ new Map();
      this.playerGame = /* @__PURE__ */ new Map();
      this.seq = 0;
    }
    // Helpers ------------------------------------------------------------------------
    id(prefix) {
      return `${prefix}${(this.now() % 1e9).toString(36)}${(this.seq++).toString(36)}`;
    }
    async profile(passport) {
      if (this.profiles.has(passport)) return this.profiles.get(passport);
      const row = await this.db.getPlayer(passport);
      if (row) this.profiles.set(passport, row);
      return row;
    }
    publicProfile(p) {
      if (!p) return null;
      return { username: p.username, games: p.games, wins: p.wins, losses: p.losses, draws: p.draws, createdAt: p.createdAt };
    }
    validTc(tc) {
      if (!tc || typeof tc !== "object") return null;
      const base = Math.floor(Number(tc.base));
      const inc = Math.floor(Number(tc.inc));
      if (!Number.isFinite(base) || !Number.isFinite(inc)) return null;
      const minBase = Math.min(20, this.cfg.minBaseMinutes * 60);
      if (base < minBase || base > this.cfg.maxBaseMinutes * 60) return null;
      if (inc < 0 || inc > this.cfg.maxIncrementSeconds) return null;
      return { base, inc };
    }
    playerRef(p) {
      return { username: p.username };
    }
    challengeView(c) {
      return {
        id: c.id,
        from: this.playerRef(c.fromProfile),
        to: this.playerRef(c.toProfile),
        tc: c.tc,
        color: c.color,
        expiresAt: c.expiresAt,
        serverTime: this.now(),
        rematchOf: c.rematchOf ?? void 0
      };
    }
    colorOf(game, passport) {
      return game.white === passport ? "w" : game.black === passport ? "b" : null;
    }
    snapshot(game, passport) {
      return {
        id: game.id,
        white: { ...game.players.w, connected: !game.disconnect.w },
        black: { ...game.players.b, connected: !game.disconnect.b },
        myColor: this.colorOf(game, passport) ?? "w",
        tc: game.tc,
        moves: game.moves,
        initialFen: game.initialFen,
        clocks: { ...game.clocks },
        turnStartedAt: game.turnStartedAt,
        serverTime: this.now(),
        firstMoveDeadline: game.firstMoveDeadline,
        drawOffer: game.drawOffer,
        status: game.status,
        result: game.result,
        reason: game.reason,
        rematch: game.rematch,
        disconnectDeadline: game.disconnect[other(this.colorOf(game, passport) ?? "w")] ?? null
      };
    }
    pushGame(game, action, dataFor) {
      for (const passport of [game.white, game.black]) this.push(passport, action, dataFor(passport));
    }
    removeFromQueues(passport) {
      let removed = false;
      for (const [key, list] of this.queues) {
        const i = list.findIndex((q) => q.passport === passport);
        if (i >= 0) {
          list.splice(i, 1);
          removed = true;
        }
        if (!list.length) this.queues.delete(key);
      }
      return removed;
    }
    queueOf(passport) {
      for (const list of this.queues.values()) {
        const q = list.find((e) => e.passport === passport);
        if (q) return { tc: q.tc, since: q.since };
      }
      return null;
    }
    /** Called on every request: keeps presence fresh and restores a dropped player. */
    touch(passport) {
      const gameId = this.playerGame.get(passport);
      const game = gameId && this.games.get(gameId);
      if (!game) return;
      const color = this.colorOf(game, passport);
      if (color && game.disconnect[color]) {
        game.disconnect[color] = null;
        this.push(game[color === "w" ? "black" : "white"], "game:opponent", { id: game.id, connected: true, deadline: null });
      }
    }
    // Requests -------------------------------------------------------------------------
    localeOf(passport) {
      return this.locales.get(passport) ?? toLocale(this.cfg.defaultLocale) ?? "en";
    }
    setLocale(passport, value) {
      const l = toLocale(value);
      if (l) this.locales.set(passport, l);
    }
    async bootstrap({ passport, data = {} }) {
      this.setLocale(passport, data.locale);
      this.touch(passport);
      const me = await this.profile(passport);
      const gameId = this.playerGame.get(passport);
      const game = gameId ? this.games.get(gameId) : null;
      const incoming = [];
      const outgoing = [];
      for (const c of this.challenges.values()) {
        if (c.to === passport) incoming.push(this.challengeView(c));
        if (c.from === passport) outgoing.push(this.challengeView(c));
      }
      return {
        ok: true,
        me: this.publicProfile(me),
        game: game ? this.snapshot(game, passport) : null,
        queue: this.queueOf(passport),
        challenges: { incoming, outgoing },
        serverTime: this.now()
      };
    }
    async register({ passport, data }) {
      if (await this.profile(passport)) return fail("already_registered");
      const username = String(data.username ?? "").trim();
      if (username.length < this.cfg.usernameMin || username.length > this.cfg.usernameMax || !USERNAME.test(username)) return fail("username_invalid");
      try {
        const row = await this.db.createPlayer(passport, username);
        this.profiles.set(passport, row);
        return { ok: true, me: this.publicProfile(row) };
      } catch (err) {
        if ((err == null ? void 0 : err.code) === "ER_DUP_ENTRY") return fail("username_taken");
        throw err;
      }
    }
    async checkName({ data }) {
      const username = String(data.username ?? "").trim();
      if (username.length < this.cfg.usernameMin || username.length > this.cfg.usernameMax || !USERNAME.test(username)) return { ok: true, available: false, reason: "username_invalid" };
      return { ok: true, available: !await this.db.getPlayerByName(username) };
    }
    async queueJoin({ passport, data }) {
      const me = await this.profile(passport);
      if (!me) return fail("no_profile");
      if (this.playerGame.has(passport)) return fail("in_game");
      const tc = this.validTc(data.tc);
      if (!tc) return fail("invalid_tc");
      this.removeFromQueues(passport);
      const key = tcKey(tc);
      const list = this.queues.get(key) ?? [];
      const opponent = list.find((q) => q.passport !== passport && this.isOnline(q.passport) && !this.playerGame.has(q.passport));
      if (opponent) {
        list.splice(list.indexOf(opponent), 1);
        if (!list.length) this.queues.delete(key);
        this.removeFromQueues(opponent.passport);
        const [white, black] = Math.random() < 0.5 ? [passport, opponent.passport] : [opponent.passport, passport];
        await this.startGame(white, black, tc);
        return { ok: true, matched: true };
      }
      const entry = { passport, tc, since: this.now() };
      list.push(entry);
      this.queues.set(key, list);
      this.push(passport, "queue:status", { queue: { tc, since: entry.since } });
      return { ok: true, matched: false, queue: { tc, since: entry.since } };
    }
    async queueLeave({ passport }) {
      this.removeFromQueues(passport);
      this.push(passport, "queue:status", { queue: null });
      return { ok: true };
    }
    async challengeSend({ passport, data }) {
      const me = await this.profile(passport);
      if (!me) return fail("no_profile");
      if (this.playerGame.has(passport)) return fail("in_game");
      const tc = this.validTc(data.tc);
      if (!tc) return fail("invalid_tc");
      const color = ["w", "b", "random"].includes(data.color) ? data.color : "random";
      const target = await this.db.getPlayerByName(String(data.username ?? "").trim());
      if (!target) return fail("not_found");
      if (target.passport === passport) return fail("self");
      if (!this.isOnline(target.passport)) return fail("offline");
      if (this.playerGame.has(target.passport)) return fail("busy");
      for (const c of this.challenges.values()) {
        if (c.from === passport && c.to === target.passport) return fail("already_challenged");
        if (c.from === target.passport && c.to === passport && !data.rematchOf) return this.challengeAccept({ passport, data: { id: c.id } });
      }
      const outgoing = [...this.challenges.values()].filter((c) => c.from === passport).length;
      if (outgoing >= 5) return fail("too_many_challenges");
      const targetProfile = await this.profile(target.passport) ?? target;
      return { ok: true, challenge: this.createChallenge(passport, me, target.passport, targetProfile, tc, color, data.rematchOf) };
    }
    createChallenge(from, fromProfile, to, toProfile, tc, color, rematchOf) {
      const c = {
        id: this.id("c"),
        from,
        to,
        fromProfile,
        toProfile,
        tc,
        color,
        rematchOf: rematchOf ?? null,
        expiresAt: this.now() + this.cfg.challengeExpireSeconds * 1e3
      };
      this.challenges.set(c.id, c);
      const view = this.challengeView(c);
      this.push(to, "challenge:incoming", view);
      this.push(from, "challenge:outgoing", view);
      const lang = this.localeOf(to);
      const body = rematchOf ? msg(lang, "rematch", { name: fromProfile.username }) : msg(lang, "challenge", { name: fromProfile.username, tc: tcText(lang, tc) });
      this.notify(to, msg(lang, "title"), body);
      return view;
    }
    async challengeAccept({ passport, data }) {
      const c = this.challenges.get(String(data.id));
      if (!c || c.to !== passport) return fail("expired");
      if (c.expiresAt < this.now()) {
        this.expireChallenge(c, "expired");
        return fail("expired");
      }
      if (this.playerGame.has(passport) || this.playerGame.has(c.from)) return fail("busy");
      if (!this.isOnline(c.from)) {
        this.expireChallenge(c, "cancelled");
        return fail("offline");
      }
      this.challenges.delete(c.id);
      this.push(c.from, "challenge:update", { id: c.id, status: "accepted" });
      this.removeFromQueues(passport);
      this.removeFromQueues(c.from);
      const challengerWhite = c.color === "w" || c.color === "random" && Math.random() < 0.5;
      const game = await this.startGame(challengerWhite ? c.from : c.to, challengerWhite ? c.to : c.from, c.tc);
      for (const o of [...this.challenges.values()]) {
        if ([c.from, c.to].includes(o.from) || [c.from, c.to].includes(o.to)) this.expireChallenge(o, "cancelled");
      }
      return { ok: true, gameId: game.id };
    }
    async challengeDecline({ passport, data }) {
      const c = this.challenges.get(String(data.id));
      if (!c || c.to !== passport) return { ok: true };
      this.challenges.delete(c.id);
      this.push(c.from, "challenge:update", { id: c.id, status: "declined", by: c.toProfile.username });
      this.push(c.to, "challenge:update", { id: c.id, status: "declined" });
      this.clearRematch(c);
      return { ok: true };
    }
    async challengeCancel({ passport, data }) {
      const c = this.challenges.get(String(data.id));
      if (!c || c.from !== passport) return { ok: true };
      this.expireChallenge(c, "cancelled");
      return { ok: true };
    }
    expireChallenge(c, status) {
      if (!this.challenges.delete(c.id)) return;
      this.push(c.from, "challenge:update", { id: c.id, status });
      this.push(c.to, "challenge:update", { id: c.id, status });
      this.clearRematch(c);
    }
    clearRematch(c) {
      var _a;
      if (!c.rematchOf) return;
      const g = this.games.get(c.rematchOf);
      if (((_a = g == null ? void 0 : g.rematch) == null ? void 0 : _a.challengeId) === c.id) {
        g.rematch = null;
        this.pushGame(g, "game:rematch", () => ({ id: g.id, rematch: null }));
      }
    }
    // Games -------------------------------------------------------------------------------
    async startGame(white, black, tc) {
      const wp = await this.profile(white);
      const bp = await this.profile(black);
      const now = this.now();
      const game = {
        id: this.id("g"),
        white,
        black,
        players: { w: this.playerRef(wp), b: this.playerRef(bp) },
        tc,
        chess: new import_chess.Chess(),
        initialFen: START_FEN,
        moves: [],
        clocks: { w: tc.base * 1e3, b: tc.base * 1e3 },
        turnStartedAt: now,
        firstMoveDeadline: now + this.cfg.firstMoveSeconds * 1e3,
        drawOffer: null,
        status: "playing",
        result: void 0,
        reason: void 0,
        rematch: null,
        disconnect: { w: null, b: null },
        startedAt: now
      };
      this.games.set(game.id, game);
      this.playerGame.set(white, game.id);
      this.playerGame.set(black, game.id);
      this.pushGame(game, "game:start", (p) => this.snapshot(game, p));
      this.pushGame(game, "queue:status", () => ({ queue: null }));
      this.notify(white, msg(this.localeOf(white), "title"), msg(this.localeOf(white), "gameWhite", { name: bp.username }));
      this.notify(black, msg(this.localeOf(black), "title"), msg(this.localeOf(black), "gameBlack", { name: wp.username }));
      return game;
    }
    playingGame(passport, id) {
      const game = this.games.get(String(id));
      if (!game || this.colorOf(game, passport) === null) return { error: "not_found" };
      if (game.status !== "playing") return { error: "game_over" };
      return { game, color: this.colorOf(game, passport) };
    }
    async move({ passport, data }) {
      this.touch(passport);
      const { game, color, error } = this.playingGame(passport, data.id);
      if (error) return fail(error);
      const from = String(data.from ?? "");
      const to = String(data.to ?? "");
      const promotion = data.promotion ? String(data.promotion) : void 0;
      if (!SQUARE.test(from) || !SQUARE.test(to) || (promotion && !"qrbn".includes(promotion) || promotion && promotion.length !== 1)) return fail("illegal");
      if (game.chess.turn() !== color) return fail("not_your_turn");
      if (Number(data.ply) !== game.moves.length) return fail("stale");
      const now = this.now();
      const ply = game.moves.length;
      if (ply >= 2) {
        const left = game.clocks[color] - (now - game.turnStartedAt);
        if (left <= 0) {
          game.clocks[color] = 0;
          await this.flag(game, color);
          return fail("game_over");
        }
        game.clocks[color] = left + game.tc.inc * 1e3;
      }
      let mv;
      try {
        mv = game.chess.move(promotion ? { from, to, promotion } : { from, to });
      } catch {
        mv = null;
      }
      if (!mv) return fail("illegal");
      const record = { from: mv.from, to: mv.to, san: mv.san, ...mv.promotion ? { promotion: mv.promotion } : {} };
      game.moves.push(record);
      game.turnStartedAt = now;
      game.drawOffer = null;
      game.firstMoveDeadline = game.moves.length < 2 ? now + this.cfg.firstMoveSeconds * 1e3 : null;
      this.pushGame(game, "game:move", () => ({
        id: game.id,
        move: record,
        ply: game.moves.length,
        clocks: { ...game.clocks },
        turnStartedAt: game.turnStartedAt,
        serverTime: now,
        firstMoveDeadline: game.firstMoveDeadline,
        drawOffer: null
      }));
      const c = game.chess;
      if (c.isCheckmate()) await this.finish(game, color === "w" ? "1-0" : "0-1", "checkmate");
      else if (c.isStalemate()) await this.finish(game, "1/2-1/2", "stalemate");
      else if (c.isInsufficientMaterial()) await this.finish(game, "1/2-1/2", "insufficient");
      else if (c.isThreefoldRepetition()) await this.finish(game, "1/2-1/2", "threefold");
      else if (c.isDraw()) await this.finish(game, "1/2-1/2", "fifty");
      return { ok: true };
    }
    hasMatingMaterial(game, color) {
      let minors = 0;
      for (const row of game.chess.board())
        for (const sq of row) {
          if (!sq || sq.color !== color || sq.type === "k") continue;
          if (sq.type === "p" || sq.type === "r" || sq.type === "q") return true;
          minors++;
        }
      return minors >= 2;
    }
    async flag(game, color) {
      const winner = other(color);
      if (!this.hasMatingMaterial(game, winner)) return this.finish(game, "1/2-1/2", "timeout_insufficient");
      return this.finish(game, winner === "w" ? "1-0" : "0-1", "timeout");
    }
    async resign({ passport, data }) {
      const { game, color, error } = this.playingGame(passport, data.id);
      if (error) return fail(error);
      if (game.moves.length < 2) await this.finish(game, null, "aborted");
      else await this.finish(game, color === "w" ? "0-1" : "1-0", "resignation");
      return { ok: true };
    }
    async abort({ passport, data }) {
      const { game, error } = this.playingGame(passport, data.id);
      if (error) return fail(error);
      if (game.moves.length >= 2) return fail("cannot_abort");
      await this.finish(game, null, "aborted");
      return { ok: true };
    }
    async draw({ passport, data }) {
      const { game, color, error } = this.playingGame(passport, data.id);
      if (error) return fail(error);
      const action = data.action;
      if (action === "offer" || action === "accept") {
        if (game.drawOffer === other(color)) {
          await this.finish(game, "1/2-1/2", "agreement");
          return { ok: true };
        }
        if (action === "accept") return fail("no_offer");
        if (game.moves.length < 2) return fail("too_early");
        if (game.drawOffer === color) return { ok: true };
        game.drawOffer = color;
        this.pushGame(game, "game:draw", () => ({ id: game.id, offer: color }));
        return { ok: true };
      }
      if (action === "decline" && game.drawOffer === other(color)) {
        game.drawOffer = null;
        this.pushGame(game, "game:draw", () => ({ id: game.id, offer: null, declined: true }));
      }
      return { ok: true };
    }
    async rematch({ passport, data }) {
      const game = this.games.get(String(data.id));
      const color = game && this.colorOf(game, passport);
      if (!game || !color || game.status !== "ended") return fail("not_found");
      if (this.playerGame.has(passport)) return fail("in_game");
      const opp = color === "w" ? game.black : game.white;
      if (game.rematch) {
        if (game.rematch.by !== color) return this.challengeAccept({ passport, data: { id: game.rematch.challengeId } });
        return { ok: true };
      }
      const me = await this.profile(passport);
      const oppProfile = await this.profile(opp);
      if (!this.isOnline(opp)) return fail("offline");
      if (this.playerGame.has(opp)) return fail("busy");
      const c = this.createChallenge(passport, me, opp, oppProfile, game.tc, other(color), game.id);
      game.rematch = { by: color, challengeId: c.id };
      this.pushGame(game, "game:rematch", () => ({ id: game.id, rematch: game.rematch }));
      return { ok: true };
    }
    async finish(game, result, reason) {
      if (game.status !== "playing") return;
      game.status = "ended";
      game.reason = reason;
      game.drawOffer = null;
      game.firstMoveDeadline = null;
      if (game.moves.length >= 2) {
        const side = game.chess.turn();
        game.clocks[side] = Math.max(0, game.clocks[side] - (this.now() - game.turnStartedAt));
      }
      this.playerGame.delete(game.white);
      this.playerGame.delete(game.black);
      if (reason === "aborted") {
        game.result = void 0;
      } else {
        game.result = result;
        await this.applyResult(game, result, reason);
      }
      this.pushGame(game, "game:end", (p) => ({
        id: game.id,
        result: game.result,
        reason,
        clocks: { ...game.clocks },
        me: this.publicProfile(this.profiles.get(p))
      }));
      game.expiresAt = this.now() + 5 * 60 * 1e3;
    }
    async applyResult(game, result, reason) {
      const wp = await this.profile(game.white);
      const bp = await this.profile(game.black);
      const update = (p, score) => {
        p.games += 1;
        if (score === 1) p.wins += 1;
        else if (score === 0) p.losses += 1;
        else p.draws += 1;
      };
      const sw = result === "1-0" ? 1 : result === "0-1" ? 0 : 0.5;
      update(wp, sw);
      update(bp, 1 - sw);
      const pgnGame = game.chess;
      pgnGame.setHeader("Event", "LB Chess");
      pgnGame.setHeader("Site", "Los Santos");
      pgnGame.setHeader("Date", new Date(game.startedAt).toISOString().slice(0, 10).replace(/-/g, "."));
      pgnGame.setHeader("White", game.players.w.username);
      pgnGame.setHeader("Black", game.players.b.username);
      pgnGame.setHeader("Result", result);
      pgnGame.setHeader("TimeControl", `${game.tc.base}+${game.tc.inc}`);
      pgnGame.setHeader("Termination", reason);
      try {
        await this.db.updatePlayer(game.white, wp);
        await this.db.updatePlayer(game.black, bp);
        await this.db.insertGame({
          white: game.white,
          black: game.black,
          whiteName: game.players.w.username,
          blackName: game.players.b.username,
          result,
          reason,
          tc: `${game.tc.base}+${game.tc.inc}`,
          moves: game.moves.length,
          pgn: pgnGame.pgn()
        });
      } catch (err) {
        this.log("failed to persist game", err);
      }
    }
    async state({ passport, data }) {
      const game = this.games.get(String(data.id));
      if (!game || !this.colorOf(game, passport)) return fail("not_found");
      this.touch(passport);
      return { ok: true, game: this.snapshot(game, passport) };
    }
    // Social ---------------------------------------------------------------------------------
    async leaderboard({ passport, data }) {
      const sort = ["games", "winrate", "wins"].includes(data.sort) ? data.sort : "games";
      const min = this.cfg.leaderboardMinGames;
      const rows = await this.db.leaderboard(sort, min, this.cfg.leaderboardSize);
      const me = await this.profile(passport);
      return {
        ok: true,
        sort,
        minGames: min,
        rows: rows.map((p, i) => ({ rank: i + 1, ...this.row(p) })),
        me: me ? { rank: await this.db.rankOf(passport, sort, min), ...this.row(me) } : null
      };
    }
    row(p) {
      return {
        username: p.username,
        games: p.games,
        wins: p.wins,
        losses: p.losses,
        draws: p.draws,
        winRate: p.games ? Math.round(p.wins / p.games * 1e3) / 10 : 0,
        online: this.isOnline(p.passport)
      };
    }
    async profileInfo({ passport, data }) {
      const target = data.username ? await this.db.getPlayerByName(String(data.username)) : await this.profile(passport);
      if (!target) return fail("not_found");
      const fresh = this.profiles.get(target.passport) ?? target;
      const games = await this.db.recentGames(target.passport, 15);
      return {
        ok: true,
        profile: this.publicProfile(fresh),
        isMe: target.passport === passport,
        online: this.isOnline(target.passport),
        playing: this.playerGame.has(target.passport),
        rank: await this.db.rankOf(target.passport, "games", this.cfg.leaderboardMinGames),
        games: games.map((g) => ({
          id: g.id,
          white: g.whiteName,
          black: g.blackName,
          result: g.result,
          reason: g.reason,
          tc: g.tc,
          moves: g.moves,
          pgn: g.pgn,
          createdAt: g.createdAt
        }))
      };
    }
    async search({ passport, data }) {
      const q = String(data.q ?? "").trim();
      if (!q || !USERNAME.test(q)) return { ok: true, players: [] };
      const rows = await this.db.searchPlayers(q, 8);
      return {
        ok: true,
        players: rows.filter((p) => p.passport !== passport).map((p) => ({ username: p.username, online: this.isOnline(p.passport), playing: this.playerGame.has(p.passport) }))
      };
    }
    // Lifecycle --------------------------------------------------------------------------------
    onDisconnect(passport) {
      this.removeFromQueues(passport);
      for (const c of [...this.challenges.values()]) if (c.from === passport || c.to === passport) this.expireChallenge(c, "cancelled");
      const gameId = this.playerGame.get(passport);
      const game = gameId && this.games.get(gameId);
      if (!game) return;
      const color = this.colorOf(game, passport);
      const deadline = this.now() + this.cfg.disconnectGraceSeconds * 1e3;
      game.disconnect[color] = deadline;
      this.push(color === "w" ? game.black : game.white, "game:opponent", { id: game.id, connected: false, deadline });
    }
    async tick() {
      const now = this.now();
      for (const c of [...this.challenges.values()]) if (c.expiresAt <= now) this.expireChallenge(c, "expired");
      for (const game of [...this.games.values()]) {
        if (game.status !== "playing") {
          if (game.expiresAt && game.expiresAt <= now) this.games.delete(game.id);
          continue;
        }
        if (game.firstMoveDeadline && game.firstMoveDeadline <= now) {
          await this.finish(game, null, "aborted");
          continue;
        }
        if (game.moves.length >= 2) {
          const side = game.chess.turn();
          if (game.clocks[side] - (now - game.turnStartedAt) <= 0) {
            game.clocks[side] = 0;
            await this.flag(game, side);
            continue;
          }
        }
        for (const color of ["w", "b"]) {
          const d = game.disconnect[color];
          if (d && d <= now) {
            if (game.moves.length < 2) await this.finish(game, null, "aborted");
            else await this.finish(game, color === "w" ? "0-1" : "1-0", "abandoned");
            break;
          }
        }
      }
    }
    /** Request name -> handler map used by the transport layer. */
    handlers() {
      return {
        ping: async () => ({ ok: true, serverTime: this.now() }),
        locale: async ({ passport, data }) => {
          this.setLocale(passport, data.locale);
          return { ok: true };
        },
        bootstrap: (ctx) => this.bootstrap(ctx),
        register: (ctx) => this.register(ctx),
        checkName: (ctx) => this.checkName(ctx),
        "queue:join": (ctx) => this.queueJoin(ctx),
        "queue:leave": (ctx) => this.queueLeave(ctx),
        "challenge:send": (ctx) => this.challengeSend(ctx),
        "challenge:accept": (ctx) => this.challengeAccept(ctx),
        "challenge:decline": (ctx) => this.challengeDecline(ctx),
        "challenge:cancel": (ctx) => this.challengeCancel(ctx),
        "game:move": (ctx) => this.move(ctx),
        "game:resign": (ctx) => this.resign(ctx),
        "game:abort": (ctx) => this.abort(ctx),
        "game:draw": (ctx) => this.draw(ctx),
        "game:rematch": (ctx) => this.rematch(ctx),
        "game:state": (ctx) => this.state(ctx),
        leaderboard: (ctx) => this.leaderboard(ctx),
        profile: (ctx) => this.profileInfo(ctx),
        search: (ctx) => this.search(ctx)
      };
    }
  };

  // src/db.js
  function call(method, sql, params = []) {
    return new Promise((resolve, reject) => {
      try {
        globalThis.exports.oxmysql[method](sql, params, (result) => resolve(result));
      } catch (err) {
        reject(err);
      }
    });
  }
  var query = (sql, params) => call("query", sql, params);
  var single = async (sql, params) => {
    var _a;
    return ((_a = await query(sql, params)) == null ? void 0 : _a[0]) ?? null;
  };
  var SCHEMA = [
    `CREATE TABLE IF NOT EXISTS chess_players (
    passport INT NOT NULL PRIMARY KEY,
    username VARCHAR(16) NOT NULL,
    games INT NOT NULL DEFAULT 0,
    wins INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    draws INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_chess_username (username),
    KEY idx_chess_games (games),
    KEY idx_chess_wins (wins)
  ) DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS chess_games (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    white INT NOT NULL,
    black INT NOT NULL,
    white_name VARCHAR(16) NOT NULL,
    black_name VARCHAR(16) NOT NULL,
    result VARCHAR(7) NOT NULL,
    reason VARCHAR(24) NOT NULL,
    time_control VARCHAR(12) NOT NULL,
    moves INT NOT NULL DEFAULT 0,
    pgn TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_chess_white (white),
    KEY idx_chess_black (black)
  ) DEFAULT CHARSET=utf8mb4`
  ];
  var LEGACY_COLUMNS = [
    ["chess_players", "rating"],
    ["chess_players", "peak"],
    ["chess_games", "white_rating"],
    ["chess_games", "black_rating"],
    ["chess_games", "white_delta"],
    ["chess_games", "black_delta"]
  ];
  var PLAYER_COLS = "passport, username, games, wins, losses, draws, UNIX_TIMESTAMP(created_at) * 1000 AS createdAt";
  var mapGame = (r) => ({
    id: r.id,
    white: r.white,
    black: r.black,
    whiteName: r.white_name,
    blackName: r.black_name,
    result: r.result,
    reason: r.reason,
    tc: r.time_control,
    moves: r.moves,
    pgn: r.pgn,
    createdAt: Number(r.createdAt)
  });
  var ORDER = {
    games: "games DESC, wins DESC",
    winrate: "(wins / games) DESC, games DESC",
    wins: "wins DESC, games DESC"
  };
  var WHERE = {
    games: "games > 0",
    winrate: "games >= ?",
    wins: "games > 0"
  };
  function createMysqlDb() {
    return {
      async init() {
        for (const sql of SCHEMA) await query(sql);
        for (const [table, column] of LEGACY_COLUMNS) {
          const found = await single("SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?", [table, column]);
          if (Number(found == null ? void 0 : found.n)) await query(`ALTER TABLE ${table} DROP COLUMN ${column}`);
        }
      },
      getPlayer: (passport) => single(`SELECT ${PLAYER_COLS} FROM chess_players WHERE passport = ?`, [passport]),
      getPlayerByName: (username) => single(`SELECT ${PLAYER_COLS} FROM chess_players WHERE username = ?`, [username]),
      async createPlayer(passport, username) {
        const res = await query("INSERT IGNORE INTO chess_players (passport, username) VALUES (?, ?)", [passport, username]);
        if (!res || !res.affectedRows) throw Object.assign(new Error("dup"), { code: "ER_DUP_ENTRY" });
        return single(`SELECT ${PLAYER_COLS} FROM chess_players WHERE passport = ?`, [passport]);
      },
      async updatePlayer(passport, f) {
        await query("UPDATE chess_players SET games = ?, wins = ?, losses = ?, draws = ? WHERE passport = ?", [
          f.games,
          f.wins,
          f.losses,
          f.draws,
          passport
        ]);
      },
      async insertGame(g) {
        const res = await query(
          `INSERT INTO chess_games (white, black, white_name, black_name, result, reason, time_control, moves, pgn)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [g.white, g.black, g.whiteName, g.blackName, g.result, g.reason, g.tc, g.moves, g.pgn]
        );
        return (res == null ? void 0 : res.insertId) ?? 0;
      },
      async leaderboard(sort, minGames, limit) {
        const params = sort === "winrate" ? [minGames, limit] : [limit];
        return await query(`SELECT ${PLAYER_COLS} FROM chess_players WHERE ${WHERE[sort]} ORDER BY ${ORDER[sort]} LIMIT ?`, params) ?? [];
      },
      async rankOf(passport, sort, minGames) {
        const me = await single(`SELECT ${PLAYER_COLS} FROM chess_players WHERE passport = ?`, [passport]);
        if (!me) return null;
        if (sort === "games") {
          if (!me.games) return null;
          const r2 = await single("SELECT COUNT(*) AS n FROM chess_players WHERE games > ? OR (games = ? AND wins > ?)", [me.games, me.games, me.wins]);
          return Number((r2 == null ? void 0 : r2.n) ?? 0) + 1;
        }
        if (sort === "winrate") {
          if (me.games < minGames) return null;
          const r2 = await single("SELECT COUNT(*) AS n FROM chess_players WHERE games >= ? AND ((wins / games) > ? OR ((wins / games) = ? AND games > ?))", [
            minGames,
            me.wins / me.games,
            me.wins / me.games,
            me.games
          ]);
          return Number((r2 == null ? void 0 : r2.n) ?? 0) + 1;
        }
        if (!me.games) return null;
        const r = await single("SELECT COUNT(*) AS n FROM chess_players WHERE games > 0 AND (wins > ? OR (wins = ? AND games > ?))", [me.wins, me.wins, me.games]);
        return Number((r == null ? void 0 : r.n) ?? 0) + 1;
      },
      async recentGames(passport, limit) {
        const rows = await query(
          "SELECT *, UNIX_TIMESTAMP(created_at) * 1000 AS createdAt FROM chess_games WHERE white = ? OR black = ? ORDER BY id DESC LIMIT ?",
          [passport, passport, limit]
        );
        return (rows ?? []).map(mapGame);
      },
      async searchPlayers(prefix, limit) {
        const safe = String(prefix).replace(/[%_\\]/g, (c) => "\\" + c);
        return await query(`SELECT ${PLAYER_COLS} FROM chess_players WHERE username LIKE ? ORDER BY CHAR_LENGTH(username) LIMIT ?`, [safe + "%", limit]) ?? [];
      }
    };
  }

  // src/index.js
  var resourceName = GetCurrentResourceName();
  var config = JSON.parse(LoadResourceFile(resourceName, "config.json"));
  var log = (...args) => console.log(`[${resourceName}]`, ...args);
  var sources = /* @__PURE__ */ new Map();
  var passports = /* @__PURE__ */ new Map();
  function passportOf(src) {
    try {
      const p = globalThis.exports.vrp.Passport(src);
      return p ? Number(p) : null;
    } catch {
      return null;
    }
  }
  function sourceOf(passport) {
    try {
      const s = globalThis.exports.vrp.Source(passport);
      if (s) return Number(s);
    } catch {
    }
    return sources.get(passport) ?? null;
  }
  var service = new ChessService({
    db: createMysqlDb(),
    config,
    log,
    isOnline: (passport) => !!sourceOf(passport),
    push(passport, action, data) {
      const src = sourceOf(passport);
      if (src) emitNet("lb-chess:push", src, action, data);
    },
    notify(passport, title, content) {
      const src = sourceOf(passport);
      if (!src) return;
      try {
        if (GetResourceState("lb-phone") === "started") globalThis.exports["lb-phone"].SendNotification(src, { app: config.identifier, title, content });
      } catch (err) {
        log("notification failed", (err == null ? void 0 : err.message) ?? err);
      }
    }
  });
  var handlers = service.handlers();
  var buckets = /* @__PURE__ */ new Map();
  function allow(src) {
    const now = Date.now();
    let b = buckets.get(src);
    if (!b || now - b.start >= 1e3) {
      b = { start: now, count: 0 };
      buckets.set(src, b);
    }
    b.count++;
    return b.count <= config.maxRequestsPerSecond;
  }
  onNet("lb-chess:req", async (id, name, data) => {
    const src = source;
    const reply = (result) => emitNet("lb-chess:res", src, id, result);
    if (!allow(src)) return reply({ ok: false, error: "rate_limited" });
    if (typeof name !== "string" || !Object.prototype.hasOwnProperty.call(handlers, name)) return reply({ ok: false, error: "unknown_request" });
    const passport = passportOf(src);
    if (!passport) return reply({ ok: false, error: "no_passport" });
    sources.set(passport, src);
    passports.set(src, passport);
    try {
      reply(await handlers[name]({ src, passport, data: data && typeof data === "object" ? data : {} }));
    } catch (err) {
      log(`${name} failed:`, err);
      reply({ ok: false, error: "server_error" });
    }
  });
  function dropped(passport, src) {
    if (!passport) return;
    if (sources.get(passport) === src) sources.delete(passport);
    passports.delete(src);
    buckets.delete(src);
    service.onDisconnect(passport);
  }
  on("Disconnect", (passport, src) => dropped(Number(passport), Number(src)));
  on("playerDropped", () => {
    const src = Number(source);
    dropped(passports.get(src), src);
  });
  var ticking = false;
  setInterval(async () => {
    if (ticking) return;
    ticking = true;
    try {
      await service.tick();
    } catch (err) {
      log("tick failed", err);
    } finally {
      ticking = false;
    }
  }, 250);
  setImmediate(async () => {
    try {
      await service.db.init();
      log("database ready");
    } catch (err) {
      log("database init failed", err);
    }
  });
})();
/*! Bundled license information:

chess.js/dist/cjs/chess.js:
  (**
   * @license
   * Copyright (c) 2025, Jeff Hlywa (jhlywa@gmail.com)
   * All rights reserved.
   *
   * Redistribution and use in source and binary forms, with or without
   * modification, are permitted provided that the following conditions are met:
   *
   * 1. Redistributions of source code must retain the above copyright notice,
   *    this list of conditions and the following disclaimer.
   * 2. Redistributions in binary form must reproduce the above copyright notice,
   *    this list of conditions and the following disclaimer in the documentation
   *    and/or other materials provided with the distribution.
   *
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
   * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
   * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
   * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
   * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
   * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
   * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
   * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
   * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
   * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
   * POSSIBILITY OF SUCH DAMAGE.
   *)
*/
