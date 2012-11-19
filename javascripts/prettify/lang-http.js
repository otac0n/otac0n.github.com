/**
 * @fileoverview
 * Registers a language handler for HTTP requests / responses.
 *
 * @author otac0n@gietzen.us
 */

(function () {
    var langs = [];

    var addLang = function (lang, f) {
        f = f || lang;
        langs.push([ 'text/' + f, lang ]);
        langs.push([ 'text/x-' + f, lang ]);
        langs.push([ 'text/x-' + f + '-src', lang ]);
        langs.push([ 'text/x-' + f + '-source', lang ]);
        langs.push([ 'application/' + f, lang ]);
        langs.push([ 'application/x-' + f, lang ]);
        langs.push([ 'application/x-' + f + '-src', lang ]);
        langs.push([ 'application/x-' + f + '-source', lang ]);
    };

    var addType = function(lang, type) {
        langs.push([ type, lang ]);
    }

    addLang('c');
    addLang('cpp', 'cplusplus');
    addLang('cpp', 'c++');
    addLang('cs', 'csharp');
    addLang('cs', 'c#');
    addType('css', 'text/css');
    addType('css', 'application/css-stylesheet');
    addType('html', 'text/html');
    addType('html', 'application/xhtml+xml');
    addLang('java');
    addLang('js', 'javascript');
    addLang('js', 'ecmascript');
    addLang('json');
    addType('latex', 'text/x-latex');
    addType('latex', 'application/x-latex');
    addType('make', 'text/x-makefile');
    addLang('pascal');
    addLang('perl');
    addLang('php');
    addLang('py', 'python');
    addLang('rb', 'ruby');
    addLang('scala');
    addLang('sh');
    addLang('sh', 'shell');
    addLang('sql');
    addType('xml', 'application/xml');
    addType('xml', 'text/xml');

    langs.push([ /^appliacion\/.*\+xml$/, 'xml' ]);
    langs.push([ /^text\/x-(.*?)(-src|-source|)$/, 1 ]);
    langs.push([ /^application\/x-(.*?)(-src|-source|)$/, 1 ]);

    var findLang = function (contentType) {
        for (var i = 0; i < langs.length; i++) {
            var match = false;
            var pattern = langs[i][0];
            var lang = langs[i][1];

            if (typeof pattern == "string") {
                match = (contentType == pattern);
            } else if (pattern instanceof RegExp) {
                match = pattern.exec(contentType);
                if (match && typeof lang == "number") {
                    lang = match[lang];
                }
            }

            if (match) {
                return lang;
            }
        };
    };

    var regExpEscape = function(text) {
        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    };

    PR['registerLangHandler'](function (job) {
        var s = job.sourceCode;
        var result = [];
        var i = 0;
        var push = function (v, t) {
            if (v && v.length) {
                result.push(job.basePos + i);
                result.push(PR[t]);
                i += v.length;
            }
        };

        var requestLine = /^(([A-Z]+)(\s+))([^\r\n]+?)((\s+)(HTTP\/\d+\.\d+))?(\r?\n|$)/;
        var statusLine = /^((HTTP\/\d+\.\d+)(\s+))?(\d+)(\s*)([^\r\n]*)(\r?\n|$)/;
        var headerLine = /(([-\w]+)(:)(\s*)|([^\S\r\n]+))((\r?\n |[^\r\n])*)(\r?\n|$)/g;
        var blankLine = /(\r?\n|$)/g;

        var req, sts;
        if (req = requestLine.exec(s)) {
            push(req[2], 'PR_KEYWORD');
            push(req[3], 'PR_PLAIN');
            push(req[4], 'PR_STRING');
            push(req[6], 'PR_PLAIN');
            push(req[7], 'PR_KEYWORD');
            push(req[8], 'PR_PLAIN');
        } else if (sts = statusLine.exec(s)) {
            push(sts[2], 'PR_KEYWORD');
            push(sts[3], 'PR_PLAIN');
            push(sts[4], 'PR_LITERAL');
            push(sts[5], 'PR_PLAIN');
            push(sts[6], 'PR_STRING');
            push(sts[7], 'PR_PLAIN');
        }

        headerLine.lastIndex = i;
        var hed, contentType, simpleType, lang, boundary;
        while ((hed = headerLine.exec(s)) && (hed.index == i)) {
            push(hed[2], 'PR_TYPE');
            push(hed[3], 'PR_PUNCTUATION');
            push(hed[4], 'PR_PLAIN');
            push(hed[5], 'PR_PLAIN');
            if (hed[2] == 'Content-Type' && !contentType) {
                contentType = hed[6];
                simpleType = contentType.split(';')[0].trim().toLowerCase();
                if (simpleType) {
                    if (simpleType.lastIndexOf('multipart/') == 0) {
                        var bMatch = /^([\S\s]*?boundary=")([^"\r\n]+)("[\S\s]*)$|^([\S\s]*?boundary=)([^"\s,]+)([\S\s]*)$/.exec(contentType);
                        if (bMatch) {
                            lang = 'http';
                            boundary = bMatch[2] || bMatch[5];
                            push(bMatch[1], 'PR_STRING');
                            push(bMatch[2], 'PR_KEYWORD');
                            push(bMatch[3], 'PR_STRING');
                            push(bMatch[4], 'PR_STRING');
                            push(bMatch[5], 'PR_KEYWORD');
                            push(bMatch[6], 'PR_STRING');
                            hed[6] = undefined;
                        }
                    } else {
                        lang = findLang(simpleType);
                    }
                }
            }
            push(hed[6], 'PR_STRING');
            push(hed[8], 'PR_PLAIN');
        }

        blankLine.lastIndex = i;
        var bln;
        if (bln = blankLine.exec(s)) {
            push(bln[0], 'PR_PLAIN');
        }

        if (i < s.length - 1) {
            if (lang == 'http' && boundary) {
                var boundaryPattern = new RegExp("(--" + regExpEscape(boundary) + "(?!--))(\\s+)(((?!--" + regExpEscape(boundary) + ")[\\S\\s])*)|(--" + regExpEscape(boundary) + "--)", "g");

                boundaryPattern.lastIndex = i;
                var bnd;
                while ((bnd = boundaryPattern.exec(s)) && (bnd.index == i)) {
                    if (bnd[1]) {
                        push(bnd[1], 'PR_KEYWORD');
                        push(bnd[2], 'PR_PLAIN');
                        var rest = bnd[3];
                        var subJob = {
                            basePos:  job.basePos + i,
                            sourceCode: rest
                        };
                        var handler = PR['langHandlerForExtension'](lang, rest);
                        handler(subJob);
                        for (var j = 0; j < subJob.decorations.length; j++) {
                            result.push(subJob.decorations[j]);
                        }
                        i += rest.length;
                    } else {
                        push(bnd[5], 'PR_KEYWORD');
                    }
                }

                if (i < s.length - 1) {
                    result.push(job.basePos + i);
                    result.push(PR['PR_PLAIN']);
                }
            } else {
                var rest = s.substring(i);
                var subJob = {
                    basePos: job.basePos + i,
                    sourceCode: rest
                };
                var handler = PR['langHandlerForExtension'](lang, rest);
                handler(subJob);
                for (var j = 0; j < subJob.decorations.length; j++) {
                    result.push(subJob.decorations[j]);
                }
            }
        }

        job.decorations = result;
    }, ['http', 'msg']);
})();
