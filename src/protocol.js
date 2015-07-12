/* *** mirrorjs Handlers ***
 *
 */


var iUI = require("./ui");
var logger = require("./logger");


module.exports = function (uiHandler, livingAppInstance)
{
    var that = this;

    var ui = new iUI.handler(this, uiHandler.name);

    // UI packets manager
    this.handle = function (m)
    {
        if (uiHandler.isRemote)
        {
            // Remote UI
            // Sends the packet to the frontend
            this.send(m.map(function (o)
                {
                    return JSON.stringify(o)
                }).join("\n") + "\n");
        }
        else
        {
            // backend to frontend
            // Parses the packages
            m.map(function (o)
            {
                if (o)
                {
                    __mj_parse(o);
                }
            });
        }
    };


    this.iApp = undefined;
    this.attachApplicationInterface = function (iApp)
    {
        this.iApp = iApp;
    };


    this.close = function ()
    {
        // UNSAFE!!!
        ui.destroyAll();

        if (uiHandler.connection !== undefined && uiHandler.connection.close !== undefined)
        {
            uiHandler.connection.close();
        }
    };

    // Sends packets to the backend
    this.send = function (m)
    {
        if (uiHandler.connection !== undefined)
        {
            logger.log("Fontend: Sending [" + m.length + " bytes]...", logger.level.LOG_SOCKET + logger.level.LOG_DEBUG);
            uiHandler.connection.send(m);
            // console.log("Sending: ", m);
        }
    };


    function __mj_parse(o)
    {
        logger.log("Fontend: Parsing protocol...", logger.level.LOG_DEBUG);

        switch (o["a"])
        {
            case "c":
                // create control
                ui.create(o);
                break;

            case "d":
                // destroy control
                ui.destroy(o["w"]);
                break;

            case "u":
                // update control
                ui.update(o);
                break;

            case "A":
                // dis/activate an event
                ui.activateEvent(o);
                break;

            case "E":
                // Backend to frontend event
                ui.handleEvent(o);
                break;

            case "e":
                // fire event
                if (uiHandler.isRemote == false && uiHandler.connection)
                {
                    // Frontend to backend
                    // Sends the pachet to the server
                    that.send(JSON.stringify(o) + "\n");
                }
                else
                {
                    // Frontend to backend
                    // console.log("INTERNAL::protocol >>> " + JSON.stringify(o));
                    that.iApp.fireEvent(o["w"], o["t"], o["p"]);
                }
                break;

            case "wc":
                // widget Class
                // add/remove class
                ui.domClassHandler(o["w"], o["p"], (o["t"] === "a" ));
                break;

            case "fp":
                // frontend prop
                // The backend asks for a frontend prop (the number of elements of a list, ...)
                ui.getFrontendProp(o["w"], o["t"], o["p"], o["r"]);
                break;

            case "Fp":
                // frontend prop
                // frontend replies with the asked prop
                if (uiHandler.isRemote == false && uiHandler.connection)
                {
                    that.send(JSON.stringify(o) + "\n");
                }
                else
                {
                    that.iApp.handleFrontendProp(/* handle */ o["w"],
                        /* requestID */ o["r"],
                        /* status */ o["s"],
                        /* params */ o["p"]);
                }
                break;

            case "m":
                // custom event (emit/on)
                livingAppInstance.triggerCustomEvent(/* custom event name */ o["t"],
                    /* params */ o["w"]);
                break;

            default:
                console.log("Protocol Error!!! ", o);
        }
    }

};
