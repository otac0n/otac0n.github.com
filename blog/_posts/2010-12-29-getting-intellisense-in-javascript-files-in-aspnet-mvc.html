---
layout: post
title: Getting IntelliSense in JavaScript files in ASP.NET MVC
---
## The Problem ##

If you are like me, you have probably had trouble in the past trying to get JavaScript IntelliSense to work well in Visual Studio.

You have probably gone through these steps:

**“I’ll just add my script here, and presto!”**  
![AddScript][1]

**“Well, that didn’t work.  It kept the App Path Modifier… dammit.”**  
![Result][2]

**“I’ll just add a run-at attribute, so that ASP.NET transforms the path for me…”**  
![RunAtServer][3]

**“Oh, my goodness gracious!”**  
![RunAtServerResult][4]

## So where does that leave us? ##

We can’t use `runat="server"` on script tags, because ASP.NET has repurposed this format in order to include server-side code into the page.  This in effect means that we can’t use the “virtual path” to reference the same script from everywhere in our app.  Since we can’t use a virtual path, and we can’t use a relative path, we are stuck.

Add on top of this that we often need to switch between different scripts for auto-completion, debugging, and production and you start to see the direness of the situation.</p>  <p>At the center of the issue is the fact that Visual Studio can’t execute code in the editor in order to “know” where a script will come from.  If it could, then we would just write a chunk of code to do the virtual path transformation based on current mode.  We would have minified scripts for production (by default), VSDoc scripts for IntelliSense (in design mode), and full source scripts for debugging (when DEBUG is defined or a debugger is attached).

At this point, I used to conclude that I had to live with all of my .aspx files living in one folder, or I had to live without JavaScript IntelliSense.

## A Solution ##

The little bit of magic required to make everything work in our favor is the fact that Visual Studio will treat everything outside of `<% ... %>` code sections as though it were one continuous block of HTML.  This means that we can use a technique similar to conditional comments in order to ignore sections of HTML, but still have it recognized as part of the HTML document.

Take these lines for example:

    <% if (false) { %>
        Test
    <%< } %>

After being transformed by ASP.NET into a pure C# listing, this code will be compiled into an assembly.  Since the code is unreachable, it will be ignored and will not be checked for definite assignment as per the C# spec (§5.3.3.1).

Extending this idea a little bit further, we can add our long-sought-after IntelliSense:

    <% if (false) { %>
        <script src="../../Scripts/jquery-1.4.1-vsdoc.js" type="text/javascript"></script>
    <% } %>

We can use the relative path here, since this will never make it across the wire.  Just make sure that the script is referenced relative to the physical file in which this tag exists.

Now, for the real script tag, we can use the static functions that ASP.NET provides to emit the proper path:

    <script src="<%: Url.Content("~/Scripts/jquery-1.4.1-vsdoc.js") %>" type="text/javascript"></script>

For ASP.NET WebForms, you would use the Server.ApplyAppPathModifier() function in place of Url.Content().

## Variations and Conclusion ##

Variations on this trick would include using compiler directives like `#if FALSE`, or `/* block comments */` to exclude the section of code.  Both of these methods seem to work.

If you use the method described above with a build server, or while compiling view locally, you may get a compiler warning saying “unreachable code detected.”  If this warning bothers you you can use `#pragma warning disable 162` and `#pragma warning enable 162` at the start and end of your if statement to suppress it.

I hope this helps you get the most out of Visual Studio and ASP.NET!  Your feedback is welcomed.

[1]: {{ site.url }}/blog/images/AddScript.png "AddScript"
[2]: {{ site.url }}/blog/images/Result.png "Result"
[3]: {{ site.url }}/blog/images/RunAtServer.png "RunAtServer"
[4]: {{ site.url }}/blog/images/RunAtServerResult.png "RunAtServerResult"
