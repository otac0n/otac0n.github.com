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
        langs.push([ 'text/x-' + f, lang ]);
        langs.push([ 'text/x-' + f + '-src', lang ]);
        langs.push([ 'text/x-' + f + '-source', lang ]);
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
    addType('js', 'text/javascript');
    addType('js', 'text/ecmascript');
    addType('js', 'application/javascript');
    addType('js', 'application/x-javascript');
    addType('js', 'application/ecmascript');
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

    PR['registerLangHandler'](function (job) {
        var s = job.sourceCode;
        result = [];
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
        var headerLine = /(([-\w]+)(:)(\s*)|([^\S\r\n]+))([^\r\n]*)(\r?\n|$)/g;

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
        var hed, contentType;
        while ((hed = headerLine.exec(s)) && (hed.index == i)) {
            push(hed[2], 'PR_TYPE');
            push(hed[3], 'PR_PUNCTUATION');
            push(hed[4], 'PR_PLAIN');
            push(hed[5], 'PR_PLAIN');
            push(hed[6], 'PR_STRING');
            push(hed[7], 'PR_PLAIN');
            if (hed[2] == 'Content-Type' && !contentType) {
                contentType = hed[6];
            }
        }

        if (i < s.length - 1) {

            var lang;
            if (contentType) {
                var simpleType = contentType.split(';')[0].trim().toLowerCase();
                lang = findLang(simpleType);
            }

            if (lang) {
                var rest = s.substring(i);
                var subJob = {
                    basePos: i,
                    sourceCode: rest
                };
                var handler = PR['langHandlerForExtension'](lang, rest);
                handler(subJob);
                for (var i = 0; i < subJob.decorations.length; i++) {
                    result.push(subJob.decorations[i]);
                };
            } else {
                result.push(i)
                result.push(PR['PR_PLAIN']);
            }
        }

        job.decorations = result;
    }, ['http']);
})();