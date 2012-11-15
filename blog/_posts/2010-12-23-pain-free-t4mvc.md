---
layout: post
title: Pain Free T4MVC
---
Here is how to get T4MVC to run every time you build, without the mark-as-dirty hack or any Visual Studio support:

1.  **Download and install the prerequisites.**

    Unfortunately, Plain-old-VS2010 does not have the ability to run T4 Templates on every build built-in, so we have to rely on an external toolkit to help us along.  On the bright side, it's just the Visual Studio SDK (which you might already have) plus an additional little tidbit.

    These must be installed in order, and you should probably exit VS to do so:

   1.  [Visual Studio SDK][1]
   2.  [Visualization and Modeling SDK][2]

2.  **Start Visual Studio and open your project file for editing.**

    Right-click on the project in question, and choose "Unload Project"; this will make it show up as "(unavailable)".  Now, you can right-click it again and choose "Edit YourProject.csproj".

3.  **Add the relevant sections to your project file.**

    Set the following properties in your project:

        <MvcBuildViews>true</MvcBuildViews>
        <TransformOnBuild>true</TransformOnBuild>

    The result should look something like this:  
    ![.csproj Snippet][3]

    Add the toolkit magic as an MSBuild import:

        <Import Project="$(MSBuildExtensionsPath)\Microsoft\VisualStudio\TextTemplating\v10.0\Microsoft.TextTemplating.targets" />

    Again, here is a visual of the result:  
    ![.csproj Snippet][4]

4.  **Save your changes and reload your project.**

    Right-click your project, which should still be showing as "(unavailable)", and Voila!  Your T4 templates will re-gen on every build!

-------------

"That's pretty great," you say, "but will it work on my build server?"

Yes, it will work!  You simply need to follow the [MSDN instructions][5] for this.  Just a few files need to be copied on to the build server.

I hope this helps people get the most out of MVC.  Your feedback is welcomed.

[1]: http://go.microsoft.com/fwlink/?LinkID=186904
[2]: http://www.microsoft.com/downloads/details.aspx?FamilyID=0def949d-2933-49c3-ac50-e884e0ff08a7
[3]: {{ site.url }}/blog/images/TransformOnBuild.png
[4]: {{ site.url }}/blog/images/TextTemplatingTargets.png
[5]: http://msdn.microsoft.com/en-us/library/ee847423.aspx#buildserver
