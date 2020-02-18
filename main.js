const mc = require('minecraft-protocol'); // to handle minecraft login session
const webserver = require('./webserver.js'); // to serve the webserver
const opn = require('opn'); //to open a browser window

const secrets = require('./secrets.json'); // read the creds
const config = require('./config.json'); // read the config

webserver.createServer(config.connectivity.ports.web); // create the webserver
webserver.password = config.password
webserver.onstart(() => { // set up actions for the webserver
	start();
});
webserver.onstop(() => {
	stop();
});

if (config.openBrowserOnStart) {
    opn('http://localhost:' + config.connectivity.ports.web); //open a browser window
}

let proxyClient; // a reference to the client that is the actual minecraft game
let client; // the client to connect to the server
let server; // the minecraft server to pass packets

let loginPacket = {};
let posPacket = {};
let chunkArray = new Array();

// Prevent spam in console
const packetNameBlacklist = ["map_chunk", "look", "position_look", "position", "unload_chunk", "player_info", "unlock_recipes", "advancements", "update_time", "keep_alive"];

// function to disconnect from the server
function stop() {
	webserver.connected = false;
	if (proxyClient) {
		proxyClient.end("Stopped the proxy"); // boot the player from the server
	}
	client.end(); // disconnect
	server.close(); // close the server
}

// function to start the whole thing
function start() {
	webserver.connected = true;
	client = mc.createClient({
		host: config.connectivity.server.ip,
		port: config.connectivity.server.port,
		username: secrets.username,
		password: secrets.password,
		version: config.MCversion
	});

	client.on("packet", (data, meta) => { // each time the server sends a packet
		if (!proxyClient && !packetNameBlacklist.includes(meta.name)) {
			console.log("(Server) " + meta.name + ": " + JSON.stringify(data) + "\n");
		}

		if (meta.name == "login") {
			loginPacket = data;
		} else if (meta.name == "position") {
			posPacket = data;
		} else if (meta.name == "map_chunk") {
			chunkArray.push(data);
		}

		if (proxyClient) { // if we are connected to the proxy, forward the packet we recieved to our game.
			filterPacketAndSend(data, meta, proxyClient, false);
		}
	});

	// set up actions in case we get disconnected.
	client.on('end', () => {
		if (proxyClient) {
            proxyClient.end("Connection reset by server.\nReconnecting...");
            proxyClient = null
		}
		stop();
	});

	client.on('error', (err) => {
		if (proxyClient) {
            proxyClient.end(`Connection error by server.\n Error message: ${err}\nReconnecting...`);
            proxyClient = null
		}
		console.log('err', err);
		stop();
	});

	server = mc.createServer({ // create a server for us to connect to
		'online-mode': false,
		encryption: true,
		host: '0.0.0.0',
		port: config.connectivity.ports.minecraft,
		version: config.MCversion,
		'max-players': maxPlayers = 1
	});

	server.on('login', (newProxyClient) => { // handle login
		console.log("-------- Client Connected --------")
		filterPacketAndSend(loginPacket, {"name": "login"}, newProxyClient, false);
		filterPacketAndSend(posPacket, {"name": "position"}, newProxyClient, false);
		chunkArray.forEach(function (v) {filterPacketAndSend(v, {"name":"map_chunk"}, newProxyClient, false)});

		newProxyClient.on('packet', (data, meta) => { // redirect everything we do to server
			if (meta.name == "position") {
				posPacket = data;
			} else if (meta.name == "chat") {
				let chatMessage = data.message;
				if (chatMessage.startsWith("/receivepacket")) {
					let args = chatMessage.split(" ");
					if (args.length < 3) {
						filterPacketAndSend({"message": "{\"text\":\"Usage: /receivepacket <packet name> <packet data>\"}", "position": 1}, {"name": "chat"}, proxyClient, false);
					} else {
						try {
							filterPacketAndSend(JSON.parse(args[2]), {"name": args[1]}, proxyClient, false);
						} catch {
							filterPacketAndSend({"message": "{\"text\":\"Invalid JSON\"}", "position": 1}, {"name": "chat"}, proxyClient, true);
						}
					}

				} else if (chatMessage.startsWith("/sendpacket")) {
					let args = chatMessage.split(" ");
					if (args.length < 3) {
						filterPacketAndSend({"message": "{\"text\":\"Usage: /sendpacket <packet name> <packet data>\"}", "position": 1}, {"name": "chat"}, proxyClient, true);
					} else {
						try {
							filterPacketAndSend(JSON.parse(args[2]), {"name": args[1]}, client, true);
						} catch {
							filterPacketAndSend({"message": "{\"text\":\"Invalid JSON\"}", "position": 1}, {"name": "chat"}, proxyClient, true);
						}
					}
				} else {
					filterPacketAndSend(data, meta, client, true);
				}
			} else {
				filterPacketAndSend(data, meta, client, true);
			}
		});
		proxyClient = newProxyClient;
	});
}


function filterPacketAndSend(data, meta, dest, sentByClient) {
	if (meta.name != "keep_alive" && meta.name != "update_time") { //keep alive packets are handled by the client we created, so if we were to forward them, the minecraft client would respond too and the server would kick us for responding twice.
		dest.write(meta.name, data);
		if (!packetNameBlacklist.includes(meta.name)) {
			let prefix;
			if (sentByClient) {
				prefix = "(Client) ";
			} else {
				prefix = "(Server) ";
			}
			console.log(prefix + meta.name + ": " + JSON.stringify(data) + "\n");
		}
	}
}
