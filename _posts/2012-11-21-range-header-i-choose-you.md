---
layout: post
title: Range header, I choose you (for pagination)!
---
I was looking around for a semantic way to do pagination over HTTP recently.  I had previously used the OData-style `$skip` and `$top` query string parameters and I was just generally dissatisfied with how that turned out.  So, I was searching for alternatives.

I happened upon [a question on Stack Overflow][1] that discussed using the `Range` HTTP header for pagination purposes.  The conclusion there was to use a different approach (mimicking Atom), but I disagree.  I feel that the `Range` header is a perfect fit for pagination.

![(for pagination)][2]

## Why is the Range header a good fit? ##

The `Range` header is normally used by browsers to request specific byte-ranges of binary files.  It powers the pause-and-resume functionality of almost every download manager in existence.  This fact tempted me to simply conclude that usage of the `Range` header for any purpose other than pause-and-resume would be an abuse.

However, [RFC 2616][3] has this to say about the `Range` header:

> HTTP retrieval requests using conditional or unconditional GET methods MAY request one or more sub-ranges of the entity, instead of the entire entity, using the Range request header, which applies to the entity returned as the result of the request.

Our entity is a collection of objects, and we are requesting "sub-ranges of the entity, instead of the entire entity."  This is a perfect fit.

## How does it measure up? ##

So, from the spec, it looks like the `Range` header was designed to handle this concern, but how does this play out in practice?  It would be foolish to just commit to using the header without making sure it was up to the task.

Let's evaluate its behavior in contrast to OData-style pagination.

*One thing to note:  
These examples contain partial HTTP requests.  Common elements between the OData and Ranger header styles have been factored out.  These include the http version; the `Host`, `Accept`, `Content-Type`, and `Content-Length` headers; and the data itself.*

### Querying the root of the collection. ###

**OData-style**

<pre><code>language: http
GET /users</code></pre>

<pre><code>language: http
200 OK

[ 0, …, 9 ]</code></pre>

**Range-header-style**

<pre><code>language: http
GET /users</code></pre>

<pre><code>language: http
200 OK
Accept-Ranges: users
Content-Range: users 0-9/200

[ 0, …, 9 ]</code></pre>

**Comparison**

Both of these have defaults for what the user is allowed to request (limited to 10), but the `Range` header style is allowed to send back the count, without `$inlinecount` being specified.  The `Accept-Ranges` header signals that the `users` range is accepted and implies that a `Content-Ranges` may be present. This makes for good discoverability.

Importantly, the response code for the `Range` header style is `200` (rather than `206` as you might expect) because the request did not include the `Range` header itself.  `Accept-Ranges` and `Content-Range` headers are still allowed in the response, keeping it semantically correct.

The OData-style, in contrast, will not automatically include the count of the collection in the response.  Even if this response were to include the count, unsolicited, there is still no easy way to discover how this data is sent.

### Pulling the first page of results normally. ###

**OData-style**

<pre><code>language: http
GET /users?$skip=0&$top=10&$inlinecount=allpages</code></pre>

<pre><code>language: http
200 OK
X-Some-Side-Channel: count=200

[ 0, …, 9 ]</code></pre>

**Range-header-style**

<pre><code>language: http
GET /users
Range: users=0-9</code></pre>

<pre><code>language: http
206 Partial Content
Accept-Ranges: users
Content-Range: users 0-9/200

[ 0, …, 9 ]</code></pre>

**Comparison**

Since the request included the `Range` header, the server is allowed to respond with a `206 Partial Content` status code, indicating the presence of the Content-Range response header.

OData had to specify the `$inlinecount=allpages` parameter in order to get the full length of the filtered collection, bloating the URL.

Additionally, the Range header style is allowed to return a Content-Range response looking something like this:

    language: http
    Content-Range: 200-250/*

This indicates that the full count is not included, possibly because it is too expensive to calculate.  This is often the case for complex queries.  This flexibility allows the server to chose whether or not to calculate the total length, based on the particular query at hand. In the OData version, however, the `$inlinecount` parameter is a command to get the count.  The server is not free to withold the count when it is expensive or difficult to obtain.

### Pulling subsequent pages of data. ###

Both systems perform roughly the same for pages in the middle of the collection.  Neither system has anything to offer here, nor does either fail in any special way.

### Requesting past the end of the collection. ###

**OData-style**

<pre><code>language: http
GET /users?$skip=1000</code></pre>

<pre><code>language: http
200 OK

[]</code></pre>


**Range-header-style**

<pre><code>language: http
GET /users
Range: users=1000-</code></pre>

<pre><code>language: http
416 Requested Range Not Satisfiable</code></pre>

*Notice that the unbounded range mimics the semantics of the OData-style request.*

**Comparison**

The response of the `Range` header style request is precisely in line with the spec:

> A server SHOULD return a response with this status code if a request included a `Range` request-header field, and none of the range-specifier values in this field overlap the current extent of the selected resource, and the request did not include an If-Range request-header field. (For byte-ranges, this means that the first-byte-pos of all of the byte-range-spec values were greater than the current length of the selected resource.)

Note, as well, that byte-ranges are specified here as a single use-case of the range header, firmly implying that the usage as shown here is the correct semantic usage.

The OData-style is not allowed to return a `416` status code, because it never sent a `Range` header.  One could argue, however, that this status code is semantically correct, even for the OData style request.

### Additional functionality of the range header. ###

Here are some things that the `Range` header supports that have no analog in the OData-style.

**Discoverability**

<pre><code>language: http
OPTIONS /users</code></pre>

<pre><code>language: http
200 OK
Accept-Ranges: users</code></pre>

The Range header style allows for discovery of acceptable ranges via the OPTIONS HTTP verb.

***Last-n* requests**

<pre><code>language: http
GET /users
Range: users=-5</code></pre>

<pre><code>language: http
206 Partial Content
Accept-Ranges: users
Content-Range: users 195-199/200

[ 195, …, 199 ]</code></pre>

The Range header style allows for requests rooted at the end of the entity, rather than the begining.

**Multipart ranges**

<pre><code>language: http
GET /users
Range: users=0-9,50-59</code></pre>

<pre><code>language: http
206 Partial Content
Accept-Ranges: users
Content-Type: multipart/mixed; boundary=next

--next
Content-Range: users 0-9/200

[ 0, …, 9 ]

--next
Content-Range: users 50-59/200

[ 50, …, 59 ]

--next--</code></pre>

The `Range` header style allows for requests that specify multiple ranges; HTTP supports sending results back as a multipart document.

**The `If-Range` header**

The `If-Range` header allows a range of the entity to be downloaded if it has not changed, but download the entire entity if it has changed.  These semantics don't really fit the pagination model very well, since it is pretty much aimed at resuming paused downloads.

**Infinite or indeterminate collections**

<pre><code>language: http
GET /users?name=Fred</code></pre>

<pre><code>language: http
206 Partial Content
Accept-Ranges: users
Content-Range: users 0-100/*

[ 0, …, 100 ]</code></pre>

As mentioned earlier, the `Content-Range` response header can specify `*` as the total size of the entity.  This means that the entity has an unknown or unbounded size.  This is particularly useful in search applications that may not know the full size of the result set for every query.

## Conclusion ##

To me, it seems that the `Range` header is both more powerful and more semantically correct than the OData-style of query string parameters (or any query string style, for that matter). As such, I will always use the standard `Range` HTTP header whenever I implement REST APIs.

I urge you to do the same.

[1]: http://stackoverflow.com/questions/924472/paging-in-a-rest-collection
[2]: {{ site.url }}/blog/images/Range%20Header%20-%201%20-%20I%20Choose%20You.jpg "(for pagination)"
[3]: http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.35.2
