---
layout: post
title: Range header, I choose you!
---
I was looking around for a semantic way to do pagination over HTTP for a small personal project recently.  I had previously done pagination using the OData-style `$skip` and `$top` query string parameters and I was just generally dissatisfied with how they turned out.  I went looking around for alternatives.

I happened upon [a question on Stack Overflow][1] that discussed using the `Range` HTTP header for pagination purposes.  The conclusion there was to use a different approach (mimicking Atom), but I disagree.  I feel that the `Range` header is a perfect fit for pagination.

## Why is the Range header a good fit? ##
The `Range` header is normally used by browsers to request specific byte-ranges of binary files.  It powers the pause-and-resume functionality of almost every download manager in existence.  This fact tempted me to simply conclude that usage of the `Range` header for any purpose other than pause-and-resume would be an abuse.

However, [RFC 2616][2] has this to say about the `Range` header:

> HTTP retrieval requests using conditional or unconditional GET methods MAY request one or more sub-ranges of the entity, instead of the entire entity, using the Range request header, which applies to the entity returned as the result of the request.

Our entity is a collection of objects, and we are requesting "sub-ranges of the entity, instead of the entire entity."  This is a perfect fit.

## How does it measure up? ##

So, from the spec, it looks like the `Range` header was designed specifically to handle this concern, but how does this play out in practice?  It would be foolish to just commit to using the header without making sure it was up to the task.

Let's evaluate its behavior in contrast to OData-style pagination.

### Querying the root of the collection. ###

**OData-style**

Request

    GET /users

Response

    200 OK

    [ 0..9 ]

**Range-header-style**

Request

    GET /users

Response

    200 OK
    Accept-Ranges: users
    Content-Range: users 0-9/200

    [ 0..9 ]


**Comparison**

Both of these have defaults for what the user is allowed to request (limited to 10), but the `Range` header style would automatically send back the count, without $inlinecount being specified.  You would simply need to know where to look. The `Accept-Ranges` header signals that the `users` range is accepted for range requests and implies that a `Content-Ranes` may be present.

Importantly, the response code for the `Range` header style is `200` (rather than `206` as you might expect) because the request was missing the `Range` header itself.  `Accept-Ranges` and `Content-Range` headers are still allowed in the response, keeping it semantically correct.

The OData-style, in contrast, will not automatically include the count of the collection in the response.  Even if this response were to include the count, unsolicited, there is still no easy way to find out how this data is sent.

### Pulling the first page of results normally. ###

**OData-style**

Request

    GET /users?$skip=0&$top=10&$inlinecount=allpages

Response

    200 OK
    X-Some-Sidechannel: count=200

    [ 0..19 ]


**Range-header-style**

Request

    GET /users
    Range: users=10-19

Response

    206 Partial Content
    Accept-Ranges: users
    Content-Range: users 10-19/200

    [ 10..19 ]


**Comparison**

Since the request was made with a Range header, the right side is allowed to respond with a `206 Partial Content` response code, indicating the presence of the Content-Range response header.

OData had to specify the `$inlinecount=allpages` parameter in order to get the full length of the filtered collection, bloating the URL.

Additionally, the Range header style is allowed to return a Content-Range response looking something like this:

    Content-Range: 200-250/*

This indicates that the full count is not included, possibly because it is too expensive to calculate.  This is often the case for complex queries.  This flexibility allows the server to chose whether or not to calculate the total length, based on the particular query at hand. In the OData version, however, the `$inlinecount` parameter is a command to get the count.  The server is not free to withold the count when it is expensive or difficult to obtain.


### Pulling subsequent pages of data. ###

Both systems perform roughly the same for pages in the middle of the collection.

### Requesting past the end of the collection. ###

**OData-style**

Request

    GET /users?$skip=1000

Response

    200 OK

    []


**Range-header-style**

Request

    GET /users
    Range: users=1000-

*Notice that the unbounded range mimmicks the semantics of the OData-style request.*

Response

    416 Requested Range Not Satisfiable


**Comparison**

The response of the `Range` header style request is precisely in line with the spec:

> A server SHOULD return a response with this status code if a request included a `Range` request-header field, and none of the range-specifier values in this field overlap the current extent of the selected resource, and the request did not include an If-Range request-header field. (For byte-ranges, this means that the first-byte-pos of all of the byte-range-spec values were greater than the current length of the selected resource.)

Note, as well, that byte-ranges are specified here as a single use-case of the range header, firmly implying that the usage as shown here is the correct semantic usage.


The OData-style is not allowed to return a `416` status code, because it never sent a `Range` header.  However, this header still seems semantically correct, even for OData.

### Additional functionality of the range header. ###

Here are some things that the `Range` header supports that have no analog in the OData-style.

**Discoverability**

Request

    OPTION /users

Response

    200 OK
    Accept-Ranges: users

The Range header style allows for discovery of acceptable ranges via the OPTIONS HTTP verb.

***Last-n* requests**

Request

    GET /users
    Ranges: users=-5

Response

    206 Partial Content
    Accept-Ranges: users
    Content-Range: users 196-200/200

    [ 196..200 ]

The Range header style allows for requests rooted at the end of the entity, rather than the begining.

**Multipart ranges**

Request

    GET /users
    Ranges: users=0-9,50-59

Response

    206 Partial Content
    Accept-Ranges: users
    Content-Type: multipart/mixed; boundary=next

    --next
    Content-Range: users 0-9/200

    [ 0..9 ]

    --next
    Content-Range: users 50-59/200

    [ 50..59 ]

    --next--

The `Range` header style allows for requests that specify multiple ranges and HTTP supports sending these back as a multipart docuemnt.

## Conclustion ##

To me, it seems that the `Range` header is both more powerful and more semanticaly correct than the OData-style of query string parameters (or any query string style, for that matter). As such, I will always use the standard `Range` HTTP header whenever I implement REST APIs.

I urge you to do the same.

[1]: http://stackoverflow.com/questions/924472/paging-in-a-rest-collection
[2]: http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.35.2
