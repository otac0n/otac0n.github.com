---
layout: post
title: Getting JavaScript IntelliSense in MVC Razor Views
---
A while ago, I posted about Getting IntelliSense working in ASP.NET MVC 3.  Since the release MVC 3, the primary view engine has changed to Razor, and the previous technique isn’t as elegant.

With that in mind, I searched for a slightly prettier way to get IntelliSense working in Razor views.  I was, unfortunately, unable to get the scripts to be referenced in the views *automatically*, but I think that this way is clean enough.

I used a `@section` directive to scoop out a part of the page during rendering, in order to prevent the “vsdoc” scripts files from being rendered to the final output. Here is how it looks in action:

![Razor Intellisense - 1 - Working][1]

But now we have a couple of challenges to deal with. If we just ignore the section, we get this:

> The following sections have been defined but have not been rendered for the layout page "~/Views/Shared/_Layout.cshtml": "intellisense".

And we know that we don’t want to render it to the final output, so we have to come up with a way to trick the Razor engine into thinking that we did, in fact, render the output.

My first attempt at solving this was to put this into the _Layout.cshtml page:

    language: cshtml
    @{RenderSection("intellisense", required: false);}

But that was not enough to trick the view engine. Apparently, you have to actually *render* the section *somewhere* in order for it to be considered "rendered. Luckily, we can just render it to a throw-away StringWriter, like so:

    language: cshtml
    @{WriteTo(new StringWriter(), RenderSection("intellisense", required: false));}

That is *just enough* to get it to work properly and display the IntelliSense as desired.

I am still looking for a way to get this to happen automatically, but for now, placing the `@section intellisense` region at the top of each view will have to do.

[1]: {{ site.url }}/blog/images/Razor%20Intellisense%20-%201%20-%20Working.png "Razor Intellisense - 1 - Working"
