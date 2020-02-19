# Minecraft Packet Proxy
This is a proxy server running on node.js that will display packets sent between the server and client

# Features
* In game commands to send and receive fake packets
* Display data sent between the server and client in the console

# How to install
1. Download node.js and install it. On non-windows platforms, you also need npm.
2. Download this repository with the green button (top right of this page). If you downloaded it as zip, unzip it.
3. Open a terminal and navigate to the folder you downloaded it
4. Run `npm install`
5. Make a secrets.json file. Fill it out like this: (Note that you must use your email adress and not your minecraft username)
```
{
    "username":"<YOUR EMAIL>",
    "password":"<YOUR PASSWORD>"
}
```
6. If you so wish, edit the configuration in config.json. (On Linux, all ports below 1024 \[including port 80\], require you to run the program with administrator rights.)

# How to use
1. Read the code to ensure i'm not stealing your credentials. i'm not, but you shouldn't take my word for it. If you don't know how to read it, downloading stuff off the internet and giving it your password is probably a bad idea anyway.
2. Run `npm start`
3. A browser window should open. You can close it if you want at any moment, and you can access it again at adress http://localhost
4. Press the "Connect" button. This will connect your account to the actual server.
5. Connect to the minecraft server at address `localhost` or `127.0.0.1`.

# Credits
This repository was originally cloned from themoonisacheese/2bored2wait and has a lot of the code from there. This is more of a developer tool than a tool for waiting in 2b2t queue.
