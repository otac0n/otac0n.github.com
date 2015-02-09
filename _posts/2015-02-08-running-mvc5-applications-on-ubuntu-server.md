---
layout: post
title: Running MVC5 Applications on Ubuntu Server (14.04.1 LTS)
---

We will be following the steps outline in the [Install Mono on Linux][1] guide and the
[ASP.NET 5 Getting Started][2] guide.

When I installed Mono, KVM, and KPM as described in the above guides, I ran in to a couple of issues.  First, `unzip` was not installed, causing the `kvm upgrade` command to fail.  Secondly, `libtool` was not found, yielding the following exception:

<pre>System.DllNotFoundException: libdl
  at (wrapper managed-to-native) Microsoft.AspNet.Server.Kestrel.Networking.PlatformApis/LinuxApis:dlopen (string,int)
  at Microsoft.AspNet.Server.Kestrel.Networking.PlatformApis+LinuxApis.LoadLibrary (System.String dllToLoad) [0x00000] in <filename unknown>:0
  at Microsoft.AspNet.Server.Kestrel.Networking.Libuv.Load (System.String dllToLoad) [0x00000] in <filename unknown>:0
  at Microsoft.AspNet.Server.Kestrel.KestrelEngine..ctor (ILibraryManager libraryManager) [0x00000] in <filename unknown>:0
  at Kestrel.ServerFactory.Start (IServerInformation serverInformation, System.Func`2 application) [0x00000] in <filename unknown>:0
  at Microsoft.AspNet.Hosting.HostingEngine.Start (Microsoft.AspNet.Hosting.HostingContext context) [0x00000] in <filename unknown>:0
  at Microsoft.AspNet.Hosting.Program.Main (System.String[] args) [0x00000] in <filename unknown>:0
  at (wrapper managed-to-native) System.Reflection.MonoMethod:InternalInvoke (System.Reflection.MonoMethod,object,object[],System.Exception&)
  at System.Reflection.MonoMethod.Invoke (System.Object obj, BindingFlags invokeAttr, System.Reflection.Binder binder, System.Object[] parameters, System.Globalization.CultureInfo culture) [0x00000] in <filename unknown>:0</pre>

Installing the `libtool` package fixed the issue.  Lastly, once `libtool` was installed, I was greeted with this exception:

<pre>System.NullReferenceException: Object reference not set to an instance of an object
  at Microsoft.AspNet.Server.Kestrel.Networking.Libuv.loop_size () [0x00000] in <filename unknown>:0
  at Microsoft.AspNet.Server.Kestrel.Networking.UvLoopHandle.Init (Microsoft.AspNet.Server.Kestrel.Networking.Libuv uv) [0x00000] in <filename unknown>:0
  at Microsoft.AspNet.Server.Kestrel.KestrelThread.ThreadStart (System.Object parameter) [0x00000] in <filename unknown>:0</pre>

This was remedied by downloading, compiling, and installing `libuv`.  In particular, `libuv` needs to be installed (or symlinked) to `/usr/lib/libuv.so.1` for everything to work correctly.

So without further ado, here is a quick step-by-step guide to Running MVC5 applications on Ubuntu Server (14.04.1 LTS).

### Install Mono ###

First, install Mono.  These steps are pulled straight from the [Install Mono on Linux][1] guide.

    language: sh
    # Add the Xamarin public code-signing key
    sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 3FA7E0328081BFF6A14DA29AA6A19B38D3D831EF

    # Add the Mono repository to apt sources
    echo "deb http://download.mono-project.com/repo/debian wheezy main" | sudo tee /etc/apt/sources.list.d/mono-xamarin.list

    # Install Mono
    sudo apt-get update
    sudo apt-get install -y mono-complete

### Install libtool, libuv, unzip and Their Dependencies ###

Next we install the rest of the dependencies.

    language: sh
    # Install other prerequisites
    sudo apt-get install -y autoconf build-essential git-core libtool unzip

    # Compile libuv
    cd /opt
    sudo git clone https://github.com/libuv/libuv.git
    cd libuv
    sudo ./autogen.sh
    sudo ./configure
    sudo make
    sudo make install
    sudo ln -s /usr/local/lib/libuv.so /usr/lib/libuv.so.1

*`autoconf`, `build-essential`, and `git-core` are necessary to build and install `libuv`.*

### Install the K Version Manager and the K Runtime Environment ###

These steps are pulled from the [ASP.NET 5 Getting Started][2] guide.

    language: sh
    # Get the K Version Manager
    curl -sSL https://raw.githubusercontent.com/aspnet/Home/master/kvminstall.sh | sh && source ~/.kre/kvm/kvm.sh

    # Install the runtime
    kvm upgrage

## All Done? ##

Here we could call it a day, since your Ubuntu system is now set up to run ASP.NET 5 applications. Why don't we follow through with the rest of the guide so we can see it working?

    language: sh
    # Obtain the ASP.NET 5 samples
    git clone https://github.com/aspnet/Home.git ~/AspNetHome
    cd ~/AspNetHome/samples/HelloMvc

    # Get all of the .NET dependencies necessary to run the sample
    kpm restore

    # Run the sample
    k kestrel

Here it is, running on my machine:

![Running Kestrel][3]

![Working Sample][4]

[1]: http://www.mono-project.com/docs/getting-started/install/linux/
[2]: https://github.com/aspnet/Home#getting-started
[3]: {{ site.url }}/blog/images/AspNetUbuntu%20-%201%20-%20Running%20Kestrel.png "Running Kestrel"
[4]: {{ site.url }}/blog/images/AspNetUbuntu%20-%202%20-%20Working%20Sample.png "Working sample"
