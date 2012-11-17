---
layout: post
title: CoffeeDemo – A Simple Demo of IronJS, using CoffeeScript
---
> Warning: the APIs used in this demo are subject to improvement in the future.  This is just a demo to get your feet wet with the 0.2.0.1 release of IronJS.  IronJS is still in the early stages, so your mileage may vary.

How would you like to have a CoffeeScript compiler, running 100% managed code?  Well, I’ll leave out the foreplay and get right to it.

## Fire up an instance of Visual Studio, with NuGet installed. ##

This is pretty self-explanatory, but just in case you don’t have NuGet installed, you can [follow the directions on the NuGet website][1] to get started.

## Create a new Windows Application. ##

Create a new Windows Application and name it 'CoffeeDemo'.

## Use NuGet to install IronJS. ##

For those of you experienced with NuGet, the command in the Package Manager Console is:

    Install-Package IronJS

If you prefer to use the GUI to add your package, you can [consult the GUI directions][2] provided at NuGet.org

## Lay-out your project and form. ##

At a minimum, you should add the following to your form:

1. An input textbox, for CoffeeScript.
2. An output textbox, for JavaScript.
3. A button, for executing the JavaScript.

You will want to make your text boxes Multiline, and large enough to enter some JavaScript source.

Here is how mine looks:  
![CoffeeDemo - 1 - Layout][3]

I decided to use a split panel (anchored to all four sides) to contain my text boxes.  I set my text boxes to dock-fill and gave them both horizontal and vertical scroll bars.  I also anchored my Execute button to the bottom right.  Finally, I hate the name  Form1 , so I always rename my form to `View` or `MainView`.

Name your controls `CoffeeScriptBox`,  `JavaScriptBox`, and `ExecuteButton`.

## Create the IronJS context. ##

In the code for our view, we need to create an IronJS context, to do all of the heavy lifting behind the scenes.  We will do this with a function `InitializeContext`, called from the constructor:

    using System;
    using System.Windows.Forms;
    using IronJS;
    using IronJS.Hosting;
    using IronJS.Native;

    namespace CoffeeDemo
    {
        public partial class View : Form
        {
            private CSharp.Context context;

            public View()
            {
                InitializeContext();
                InitializeComponent();
            }

            private void InitializeContext()
            {
                Action<string> alert = message => MessageBox.Show(message);
                this.context = new CSharp.Context();
                this.context.SetGlobal("alert", Utils.CreateFunction(this.context.Environment, 1, alert));
            }
        }
    }

Here, we can see the basics of creating a contexts, as well as exposing a CLR function to JavaScript.  The alert function is now wired up to call directly into `MessageBox.Show`.

## Wire-up the execute button. ##

Just wire up the Click even of the execute button to a function like this,

    private void ExecuteButton_Click(object sender, EventArgs e)
    {
        try
        {
            this.context.Execute(this.JavaScriptBox.Text);
        }
        catch (IronJS.Error.Error ex)
        {
            MessageBox.Show(ex.ToString(), "Error from IronJS");
        }
    }

You can run a test like this:  
![CoffeeDemo - 2 - Hello World][4]

## Automatically download CoffeeScript. ##

There are a couple of different methods that we could use to bring CoffeeScript into our app.  We could include it in the folder, we could add it as an assembly resource, etc.

My preference for this demo, however, is to download CoffeeScript to the /bin directory on the first run of the app.

    …
    using System.IO;
    using System.Net;
    …
    namespace CoffeeDemo
    {
        public partial class View : Form
        {
            …
            public View()
            {
                …
                LoadCoffeeScript();
            }
            …
            private void LoadCoffeeScript()
            {
                if (!File.Exists("coffee-script.js"))
                {
                    var client = new WebClient();
                    client.DownloadFile("https://raw.github.com/jashkenas/coffee-script/master/extras/coffee-script.js", "coffee-script.js");
                }

                this.context.ExecuteFile("coffee-script.js");
            }
        }
    }

At this point CoffeeScript is ready to go, and can be tested in the JavaScript text box.  We are loading it in the constructor, which could negatively impact the application start-up time.  However, for this example, I’m not concentrating on performance.

Try this for an example:

    alert(CoffeeScript.compile('a = (x) -> x * x', { bare: true }));

## Wire-up the TextChanged event for live updating. ##

Add a field of type FunctionObject to the view’s class, and add this function as the TextChanged event on the CoffeeScript text box:

    private FunctionObject compile;
    …
    private void CoffeeScriptBox_TextChanged(object sender, EventArgs e)
    {
        if (this.compile == null)
        {
            this .context.Execute("var compile = function (src) { return CoffeeScript.compile(src, { bare: true }); };");
            this .compile = this.context.GetGlobalAs<FunctionObject>("compile");
        }
         
        try
        {
            var boxedResult = this.compile.Call(this.context.Globals, this.CoffeeScriptBox.Text);
            var result = TypeConverter.ToString(boxedResult);
            this.JavaScriptBox.Text = result.Replace("\n", "\r\n");
        }
        catch (IronJS.Error.Error)
        {
        }
    }

This shows you how to call a JavaScript function from the CLR.

## CoffeeDemo in action! ##

![CoffeeDemo - 3 - Epic Win!][5]

You should now have a working, live-updating CoffeeScript compiler.  You will almost certainly notice the compilation lag on the first key-press where we are compiling the helper function, and calling the CoffeeScript compiler for the first time.  The lag is due to IronJS pushing everything into an in-memory, dynamic assembly.  Subsequent key-presses should be pretty quick, tho, and we are striving to make it faster.

## Stay tuned. ##

We are actively working on better .NET integration so that you can use native .NET types, all without using wrapper functions.  So, stay with us, and please [follow us on Github][6]!

[1]: http://docs.nuget.org/docs/start-here/installing-nuget
[2]: http://docs.nuget.org/docs/start-here/managing-nuget-packages-using-the-dialog
[3]: {{ site.url }}/blog/images/CoffeeDemo%20-%201%20-%20Layout.png "CoffeeDemo - 1 - Layout"
[4]: {{ site.url }}/blog/images/CoffeeDemo%20-%202%20-%20Hello%20World.png "CoffeeDemo - 2 - Hello World"
[5]: {{ site.url }}/blog/images/CoffeeDemo%20-%203%20-%20Epic%20Win%21.png "CoffeeDemo - 3 - Epic Win!"
[6]: https://github.com/fholm/IronJS/commits/master
