/* *** mirrorJS ***
 *
 */


var iApp = require("./iApp");
var protocol = require("./protocol");
var logger = require("./logger");

var __VERSION = {
    "MAJOR": 0,
    "MINOR": 2,
    "REVISION": 1
};

exports.VERSION = __VERSION["MAJOR"] + "." + __VERSION["MINOR"] + "." + __VERSION["REVISION"];


exports.servers = require("./servers");


var livingApp = function (uiHandler, onStartupCallback, conf, isLocal)
{
    var protocolHandler = new protocol(uiHandler, this);

    // app interface instance
    this.app = new iApp(protocolHandler);

    protocolHandler.attachApplicationInterface(this.app);

    if (conf === undefined)
    {
        conf = {};
    }

    if (conf["widgets"] && conf["widgets"]["prefixID"])
    {
        this.app.prefixID = conf["widgets"]["prefixID"];
    }


    // Application ID (used for remote apps by the server manager (servers.js))
    this.applicationID = 0;


    /**
     * Parses remote app protocol
     * @param o
     */
    this.parseRequests = function (o)
    {

        logger.log("Backend: Parsing protocol...", logger.level.LOG_DEBUG);

        switch (o["a"])
        {
            case "u":
                // Update (unused)
                // all widget's modification should pass via events
                break;

            case "e":
                // fire event
                this.app.fireEvent(o["w"], o["t"], o["p"]);
                break;

            case "Fp":
                // Replies the backend with the prop asked to the frontend
                this.app.handleFrontendProp(/* handle */ o["w"],
                    /* requestID */ o["r"],
                    /* status */ o["s"],
                    /* params */ o["p"]);
                break;

            case "m":
                // custom event (emit/on)
                this.triggerCustomEvent(/* custom event name */ o["t"],
                    /* params */ o["w"]);
                break;

            default:
                console.log("parseRequests ", o);
        }
    };


    var __app_instance__ = new onStartupCallback(this.app, conf["args"]);


    this.onClose = function ()
    {
        // Calls the application's instance "onClose" handler (if defined)
        if (__app_instance__.onClose !== undefined)
        {
            __app_instance__.onClose();
        }

        if (conf["events"] && conf["events"]["onClose"] !== undefined)
        {
            conf["events"]["onClose"](this.app);
        }
    };


    // TODO: needs more testing
    this.onError = function ()
    {
        // Calls the application's instance "onError" handler (if defined)
        if (__app_instance__.onError !== undefined)
        {
            __app_instance__.onError();
        }

        if (conf["events"] && conf["events"]["onError"] !== undefined)
        {
            conf["events"]["onError"](this.app);
        }
    };


    // **** Emit/On ****

    // custom events registry (emit/on)
    var __customEvents = {};

    if (isLocal === true)
    {
        this.on = function (eventName, callback)
        {
            logger.log("Fontend: Binding custom event " + eventName, logger.level.LOG_EVENTS);
            __customEvents[eventName] = callback;
        };

        this.emit = function (eventName, object)
        {
            this.app.triggerCustomEvent(eventName, object);
        };

        this.triggerCustomEvent = function (eventName, object)
        {
            if (__customEvents[eventName] !== undefined)
            {
                __customEvents[eventName](eventName, object);
            }
        };
    }
    else
    {
        // remote apps use the app.on and app.emit methods
        this.on = this.app.on;
        this.emit = this.app.emit;
        this.triggerCustomEvent = this.app.triggerCustomEvent;
    }

};

exports.app = {};

// fat clients
exports.app["local"] = function (uiHandler, onStartupCallback, conf)
{
    return new livingApp(uiHandler, onStartupCallback, conf, /* isLocal */ true);
};


// thin clients (backend)
exports.app["server"] = function (uiHandler, onStartupCallback, conf)
{
    return new livingApp(uiHandler, onStartupCallback, conf, /* isLocal */ false);
};


// thin clients (frontend)
exports.app["remote"] = function (uiHandler, alias, conf)
{
    var protocolHandler = new protocol(uiHandler, this);
    var app = new iApp(protocolHandler);
    protocolHandler.attachApplicationInterface(app);

    uiHandler.connection.connect(function ()   //onopen
        {
            // sends the alias (protocol)
            uiHandler.connection.send('{"a":"x","w":"' + alias + '"}\n');

            if (conf && conf["onConnect"])
            {
                conf["onConnect"]();
            }
        },
        function (msg)   //onmessage
        {
            protocolHandler.handle(msg.split("\n").map(function (m)
            {
                if (m.length > 0)
                {
                    return JSON.parse(m)
                }
            }));
        },
        function (obj)   //onclose
        {
            protocolHandler.close();

            if (conf && conf["onClose"])
            {
                conf["onClose"](obj);
            }
        }
    );


    // **** Emit/On ****

    // custom events registry (emit/on)
    var __customEvents = {};

    this.on = function (eventName, callback)
    {
        logger.log("Fontend: Binding custom event " + eventName, logger.level.LOG_EVENTS);
        __customEvents[eventName] = callback;
    };

    this.emit = function (eventName, object)
    {
        var buffer = JSON.stringify({
                "a": "m",
                "t": eventName,
                "w": object
            }) + "\n";

        protocolHandler.send(buffer);
    };

    this.triggerCustomEvent = function (eventName, object)
    {
        if (__customEvents[eventName] !== undefined)
        {
            __customEvents[eventName](eventName, object);
        }
    };


};


exports.widgets = {
    "controller": require("./widgets"),
    "base": require("./base")
};


exports.connectors = require("./connectors");

exports.ui = require("./ui");

exports.logger = require("./logger");


// banner
console.log("mirrorjs v" + exports.VERSION);
