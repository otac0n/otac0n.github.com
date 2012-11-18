---
layout: post
title: Getting a Proper MVC Date-picker using jQuery UI
---
There are plenty of tutorials out there on how to get date-pickers to work in MVC, but most of them that I have seen fall short for some reason or another.  Here are my requirements for a "proper" date-picker in MVC:

1. It must be automatic, when using the `EditorFor` family of methods.
2. It must degrade gracefully. That is, it should fall back to a regular text box for users without JavaScript.
3. It must *always* work for any complex model.
4. It must round-trip the data entered, even if the data is an invalid date.
5. It must be self-contained.  That is, it should not require a script at the top of the page to work.

Some demos fail to work for complex models, and most require a surrogate script at the top of the page.  We'll see how to avoid those problems in the coming sections.  I will be assuming that your project already has jQuery and jQuery UI.

## Automatic Editor ##

The ability for MVC to automatically pick an editor based on the data-type has been covered at length before, just [search Google for "EditorTemplates"][1] if you are looking for examples.

Quickly, then, here is how to add an automatic template for any type:

1. Navigate to the ~/Views/Shared folder of your web project.
2. Create a folder named "EditorTemplates", if it does not already exist.
3. Inside of this folder, create a partial view with the name of your type. (DateTime, in our case).

We will also choose to have a strongly-typed view, using `DateTime?` as our type.  This will allow it to work for both nullable and non-nullable dates

Here is how the folder structure should be laid out:

[Date Picker - 1 - Layout][2]

Now, MVC will automatically select our editor whenever it has a `DateTime` or a `Nullable<DateTime>` to render.

## Round-trippin' With My Two Favorite Allies ##

We need to use a regular HTML text box for our date picker for two reasons:

1. It will allow for date-input, even if the user has disabled JavaScript.
2. MVC will automatically round-trip the data and perform model binding, if it is rendered in a certain way.

We chose to use a dynamic partial view, so that we could round-trip textual data, above, so the simplest way to get the editor working is this, placed in the DateTime.cshtml file:


    @model DateTime?
    @Html.TextBox("", Model)

Interestingly, we are passing an empty string in for the "name" parameter for the text box.  This is the *secret sauce* for getting MVC to render the proper name to support complex models and for it to automatically round-trip the model for.  Second, we are simply passing the model as the value of the text box.  MVC will take this and call `ToString()` on the value, which will give us the default formatting for dates.

We may, however, want dates to be shown without their time component. To do that, we need to override the default formatting to our liking:

    @model DateTime?
    @Html.TextBox("", Model.HasValue ? Model.Value.ToString("d MMM yyyy") : "")

This will not prevent the users' input from round-tripping, but will instead provide a default formatting for views where there is no posted data to reference, e.g. loading the edit view for the first time.

## Self-contained Script ##

Some people prefer to have a single script for wiring-up their date-pickers at the top of the page.  I find this to be less than ideal, because I usually don't date pickers on a page, so it doesn't belong in the master layout.  I also don't want to duplicate the code on every page, because it means that a simple change to the date picker would have to be performed in many places, and it could easily be forgotten on a page, preventing date pickers from working there.

With that in mind, my preference is to have a self-contained script for creating the date-picker immediately following the text box.  The challenge that we face when we want to do this is coming up with a way to refer to the specific text-box in a jQuery selector.  The easiest way, from a jQuery standpoint, would be to use the ID of the text box.

Luckily, MVC allows us access to the field name using the `Html.ViewContext.ViewData.TemplateInfo.GetFullHtmlFieldName` method.  This is, in fact, the way that MVC assigns the name and ID to the text box.  However, there is no built-in way to turn that name into an ID.  A quick perusal of the MVC source code shows that the ID is a simple text replacement.  We can precisely emulate their text replacement with a regular expression replacement.  Here is the completed control:

    @model DateTime?
    @{
        var name = Html.ViewContext.ViewData.TemplateInfo.GetFullHtmlFieldName(string.Empty);
        var id = System.Text.RegularExpressions.Regex.Replace(name, @"[^-\w\d:_]", HtmlHelper.IdAttributeDotReplacement);
    }
    @Html.TextBox("", Model.HasValue ? Model.Value.ToString("d MMM yyyy") : "")
    <script type="text/javascript">$(function () { $("#@id").datepicker({ dateFormat: 'd M yy' }); });</script>

Now, we have a feature-complete, self-contained date picker, that is automatically applied for all DateTime fields!

[1]: http://www.google.com/search?q=EditorTemplates
[2]: {{ site.url }}/blog/images/Date%20Picker%20-%201%20-%20Layout.png "Date Picker - 1 - Layout"
