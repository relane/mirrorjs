/* *** mirrorjs Servers ***
 *
 */


exports.readConf = function (path, checkAliases)
{
    var fs = r_equire('fs');
    var conf;

    if (global.__base_path === undefined)
    {
        global.__base_path = __dirname;
    }

    conf = JSON.parse(fs.readFileSync(path));

    if (checkAliases === true)
    {
        // checking aliases
        console.log("Checking aliases...");
        var tmpReq, tmpLog;
        for (var alias in conf["aliases"])
        {
            tmpLog = "Trying to load alias [" + alias + "]: [" + conf["aliases"][alias] + "]...";
            try
            {
                tmpReq = r_equire(global.__base_path + conf["aliases"][alias]);
                tmpLog += "OK!";
            }
            catch (e)
            {
                tmpLog += "ERROR [" + e + "]!";
            }
            console.log(tmpLog);
        }
    }

    return conf;
};


function createServerMessage(t, w)
{
    console.log("Creating server [" + t + "] listening on " + w);
}


/**
 * Registers an active app
 *
 * TODO: needs more testing
 *
 */
var runningApps = {};
var runningAppsID = 0;
function registerRunningApp(app)
{
    runningAppsID++;
    if (runningAppsID > 1000000)
    {
        runningAppsID = 0;
    }

    runningApps[runningAppsID] = app;
    app.applicationID = runningAppsID;

    // console.log("TEST: registerRunningApp: " + runningAppsID);

    return runningAppsID;
}


function unregisterRunningApp(appID)
{
    delete runningApps[appID];
    // console.log("TEST: unregisterRunningApp: " + appID);
}


function broadcastMessage(thisApp, eventGroup, eventName, obj)
{
    for (var curApp in runningApps)
    {
        if (runningApps[curApp] && runningApps[curApp].applicationID !== thisApp.applicationID)
        {
            runningApps[curApp].app.broadcast.trigger(eventGroup, eventName, obj);
            // console.log("TEST: broadcastMessage from " + thisApp.applicationID + " to appID: " + runningApps[curApp].applicationID);
        }
    }
}


function injectBroadcasting(app)
{
    // implements the sender (interface defined in iApp.js)
    app.app.broadcast.send = function (eventGroup, eventName, obj)
    {
        broadcastMessage(app, eventGroup, eventName, obj)
    };
}


/** Connection(s) handler (Socket, SockJS)
 *
 */
function handleConnection(conn, conf, appParams)
{
    var requiredApp = null;
    var runningApp = null;
    var runningAppID = null;
    var buffer = "";

    // console.log("New connection from [" + conn.remoteAddress + "]");

    conn.on('data', function (message)
    {
        var pkg;
        var strMessage = buffer + message.toString();
        pkg = strMessage.split("\n");

        if (strMessage.substr(-1) !== "\n")
        {
            buffer = pkg.pop();
        }

        pkg.map(function (jsonPkg)
        {
            if (jsonPkg.length < 2)
            {
                return;
            }

            var o = JSON.parse(jsonPkg);
            switch (o["a"])
            {
                case "x":
                    // if the alias exists: executes it
                    if (conf["aliases"] && conf["aliases"][o["w"]])
                    {
                        var tmpLog = "Starting [" + o["w"] + "] ...";
                        try
                        {
                            requiredApp = r_equire(global.__base_path + conf["aliases"][o["w"]]);
                            tmpLog += "OK!";

                            runningApp = requiredApp({
                                "send": function (m)
                                {
                                    conn.write(m);
                                },
                                "close": function ()
                                {
                                    runningApp.app.destroyAll();
                                    conn.close();
                                }
                            }, appParams);
                        }
                        catch (e)
                        {
                            requiredApp = null;
                            runningApp = null;
                            tmpLog += "ERROR [" + e + "]!";
                        }

                        if (runningApp !== null)
                        {
                            // registers the app
                            runningAppID = registerRunningApp(runningApp);
                            // enables the broadcasting
                            injectBroadcasting(runningApp);
                        }

                        console.log(tmpLog);
                    }
                    else
                    {
                        console.log('Error: Alias [' + o["w"] + '] not found!');
                    }
                    break;
                default:
                    // packages handled by the app itself
                    runningApp && runningApp.parseRequests(o);
            }

        });

    });
    conn.on('close', function ()
    {
        runningApp && runningApp.onClose();

        if (runningAppID !== null)
        {
            unregisterRunningApp(runningAppID);
        }
    });
    conn.on('error', function ()
    {
        runningApp && runningApp.onError();

        console.log("Connection ERROR!!!");
    });
}


exports.SockJS = function (conf, appParams, httpServer)
{
    var http = r_equire('http');
    var sockjs = r_equire('sockjs');

    var sockJSServer = sockjs.createServer();
    sockJSServer.on('connection', function (conn)
    {
        handleConnection(conn, conf, appParams);
    });

    if (httpServer === undefined)
    {
        var server = http.createServer();
        sockJSServer.installHandlers(server, {prefix: '/mirror'});

        var host = conf["host"], port = conf["port"];
        if (host === undefined)
        {
            host = "0.0.0.0";
        }

        createServerMessage("SockJS", host + ":" + port);
        server.listen(port, host);
    }
    else
    {
        sockJSServer.installHandlers(httpServer, {prefix: '/mirror'});
    }
};


exports.Socket = function (conf, appParams)
{
    var net = r_equire('net');

    var host = conf["host"], port = conf["port"];
    if (host === undefined)
    {
        host = "0.0.0.0";
    }

    var socketServer = net.createServer();

    createServerMessage("Socket", host + ":" + port);

    socketServer.listen(port, host);

    socketServer.on('connection', function (conn)
    {
        handleConnection(conn, conf, appParams);
    });

};
