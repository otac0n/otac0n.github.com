/**
 * @fileoverview
 * Registers a language handler for HTTP requests / responses.
 *
 * @author otac0n@gietzen.us
 */

PR['registerLangHandler'](function (job) {
    var s = job.sourceCode;
    result = [];
    var i = 0;
    var push = function (v, t) {
        if (v && v.length) {
            result.push(i);
            result.push(PR[t]);
            i += v.length;
        }
    };

    var requestLine = /^(([A-Z]+)(\s+))([^\r\n]+?)((\s+)(HTTP\/\d+\.\d+))?(\r?\n|$)/;
    var statusLine = /^((HTTP\/\d+\.\d+)(\s+))?(\d+)(\s*)([^\r\n]*)(\r?\n|$)/;
    var headerLine = /(([-\w]+)(:)|([^\S\r\n]+))([^\r\n]*)(\r?\n|$)/g;

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
        push(hed[5], 'PR_STRING');
        push(hed[6], 'PR_PLAIN');
        if (hed[2] == 'Content-Type' && !contentType) {
            contentType = hed[5];
        }
    }

    if (contentType) {
        var map = {
            'text/plain': PR['PR_PLAIN'],
            'application/javascript': 'js',
            'text/html': 'html',
        }
        result.push(i)
        result.push('lang-' + (map[contentType] || contentType));
    } else {
        result.push(i)
        result.push(PR['PR_PLAIN']);
    }

    job.decorations = result;
}, ['http']);
