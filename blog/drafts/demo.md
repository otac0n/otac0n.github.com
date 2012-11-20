---
layout: post
title: Demo
---
<pre><code>language: msg
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary=frontier

This is a message with multiple parts in MIME format.
--frontier
Content-Type: text/plain

This is the body of the message.
--frontier
Content-Type: application/octet-stream
Content-Transfer-Encoding: base64

PGh0bWw+CiAgPGhlYWQ+CiAgPC9oZWFkPgogIDxib2R5PgogICAgPHA+VGhpcyBpcyB0aGUg
Ym9keSBvZiB0aGUgbWVzc2FnZS48L3A+CiAgPC9ib2R5Pgo8L2h0bWw+Cg=
--frontier--</code></pre>

<pre><code>language: msg
From: Nathaniel Borenstein <nsb@bellcore.com>
To: Ned Freed <ned@innosoft.com>
Date: Mon, 22 Mar 1993 09:41:09 -0800 (PST)
Subject: Formatted text mail
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary=boundary42

--boundary42
Content-Type: text/plain; charset=us-ascii

  ... plain text version of message goes here ...

--boundary42
Content-Type: text/enriched

  ... RFC 1896 text/enriched version of same message
      goes here ...

--boundary42
Content-Type: application/x-whatever

  ... fanciest version of same message goes here ...

--boundary42--</code></pre>

<pre><code>language: msg
From: Moderator-Address
To: Recipient-List
Date: Mon, 22 Mar 1994 13:34:51 +0000
Subject: Internet Digest, volume 42
MIME-Version: 1.0
Content-Type: multipart/mixed;
              boundary="---- main boundary ----"

------ main boundary ----

  ...Introductory text or table of contents...

------ main boundary ----
Content-Type: multipart/digest;
              boundary="---- next message ----"

------ next message ----

From: someone-else
Date: Fri, 26 Mar 1993 11:13:32 +0200
Subject: my opinion

  ...body goes here ...

------ next message ----

From: someone-else-again
Date: Fri, 26 Mar 1993 10:07:13 -0500
Subject: my different opinion

  ... another body goes here ...

------ next message ------

------ main boundary ------</code></pre>

<pre><code>language: msg
From: Whomever
To: Someone
Date: Whenever
Subject: whatever
MIME-Version: 1.0
Message-ID: <id1@host.com>
Content-Type: multipart/alternative; boundary=42
Content-ID: <id001@guppylake.bellcore.com>

--42
Content-Type: message/external-body; name="BodyFormats.ps";
              site="thumper.bellcore.com"; mode="image";
              access-type=ANON-FTP; directory="pub";
              expiration="Fri, 14 Jun 1991 19:13:14 -0400 (EDT)"

Content-type: application/postscript
Content-ID: <id42@guppylake.bellcore.com>

--42
Content-Type: message/external-body; access-type=local-file;
              name="/u/nsb/writing/rfcs/RFC-MIME.ps";
              site="thumper.bellcore.com";
              expiration="Fri, 14 Jun 1991 19:13:14 -0400 (EDT)"

Content-type: application/postscript
Content-ID: <id42@guppylake.bellcore.com>

--42
Content-Type: message/external-body;
              access-type=mail-server
              server="listserv@bogus.bitnet";
              expiration="Fri, 14 Jun 1991 19:13:14 -0400 (EDT)"

Content-type: application/postscript
Content-ID: <id42@guppylake.bellcore.com>

get RFC-MIME.DOC

--42--</code></pre>