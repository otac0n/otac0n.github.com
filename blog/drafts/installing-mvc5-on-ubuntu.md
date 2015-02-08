<pre><code>language: sh
# Add the Xamarin public code-signing key.
sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 3FA7E0328081BFF6A14DA29AA6A19B38D3D831EF

# Add the Mono repository to apt sources.
echo "deb http://download.mono-project.com/repo/debian wheezy main" | sudo tee /etc/apt/sources.list.d/mono-xamarin.list

# Install Mono
sudo apt-get update
sudo apt-get install -y mono-complete</code></pre>

<pre><code>language: sh
# Install other prerequisites
sudo apt-get -y install autoconf build-essential git-core libtool unzip

# Compile libuv
cd /opt
sudo git clone https://github.com/libuv/libuv.git
cd libuv
sudo ./autogen.sh
sudo ./configure
sudo make
sudo make install
sudo ln -s /usr/local/lib/libuv.so /usr/lib/libuv.so.1</code></pre>

<pre><code>language: sh
# Get the K Version Manager
curl -sSL https://raw.githubusercontent.com/aspnet/Home/master/kvminstall.sh | sh && source ~/.kre/kvm/kvm.sh

# Install the runtime.
kvm upgrage</code></pre>
