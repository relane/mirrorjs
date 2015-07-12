/* *** mirrorjs UI ***
 *
 */


var widgets = require("./widgets");
var events = require("./events");
var base = require("./base");
var logger = require("./logger");


exports.handler = function (protocolHandler, uiHandlerName)
{
    var that = this;

    var handles = {};

    this.protocolHandler = protocolHandler;

    this.events = new events(this);

    this.create = function (o)
    {
        var widgetClass = widgets.getClass(o["t"]);

        logger.log("Frontend: Creating widget " + o["t"] + " [" + o["w"] + "]", logger.level.LOG_DEBUG);

        if (widgetClass === undefined)
        {
            logger.log("Frontend ERROR: The widget " + o["t"] + " [" + o["w"] + "] is not installed!!!", logger.level.LOG_DEBUG);
            return;
        }
        var widgetHandler = widgetClass[uiHandlerName];
        if (widgetHandler === undefined)
        {
            logger.log("Frontend ERROR: The widget " + o["t"] + " [" + o["w"] + "] doesn't have the UI Handler: [" + uiHandlerName + "]!!!", logger.level.LOG_DEBUG);
            return;
        }
        var handle = o["w"];
        var parent = undefined;
        var args = o["e"];
        if (args === undefined)
        {
            args = {};
        }

        if (o["p"] !== undefined)
        {
            parent = handles[o["p"]];
        }

        var ctl = new base.ui(this, handle, parent, args);
        ctl.type = o["t"];
        widgetHandler.call(ctl, this, handle, parent, args);

        handles[handle] = ctl;

        ctl.create();

        // console.log("Creating: ", o);
    };


    this.update = function (o)
    {
        // console.log("Updating: ", o);
        handles[o["w"]] && handles[o["w"]].parseState(o["s"]);
    };


    this.activateEvent = function (o)
    {
        // who, type, params (boolean)
        handles[o["w"]] && handles[o["w"]].activateEvent(o["t"], o["p"]);
    };


    this.handleEvent = function (o)
    {
        var ctl = handles[o["w"]];
        if (ctl)
        {
            // internal event (eg. "focus")
            if (ctl.__internal_events[o["t"]])
            {
                ctl.__internal_events[o["t"]].call(ctl, o["p"]);
            }

            // who, type, params
            if (ctl.events[o["t"]])
            {
                ctl.events[o["t"]].call(ctl, ctl, o["p"]);
            }
        }
    };


    this.getCtl = function (handle)
    {
        return handles[handle];
    };


    this.destroy = function (handle)
    {
        if (handles[handle])
        {
            logger.log("Frontend: Destroying widget " + handles[handle].type + " [" + handle + "]", logger.level.LOG_DEBUG);
            handles[handle].destroy();
            delete handles[handle];
        }
    };


    /** destroyAll
     *
     * Frontend-side destroyAll is unsafe!!!
     *
     * TODO: frontend-side is needed a hierarchical structure like that of the backend (widget.children)
     *
     * FIXME: Now the widgets are destroyed from the last to the first.
     * But this trick doesn't solve the problem anyway!!!
     *
     */
    this.destroyAll = function ()
    {
        Object.keys(handles).sort(function (a, b)
        {
            return b - a
        }).map(
            function (handle)
            {
                that.destroy(handle);
            });
    };


    this.domClassHandler = function (handle, className, /* boolean */ addClass)
    {
        if (handles[handle])
        {
            if (addClass === true)
            {
                handles[handle].addClass(className);
            }
            else
            {
                handles[handle].removeClass(className);
            }
        }
    };


    this.getFrontendProp = function (who, propName, params, frontendConnectorRequestID)
    {
        var ctl = handles[who];
        var tmpObj = {
            "a": "Fp", /* action: Sends property getter frontend -> backend */
            "w": who, /* handle */
            "r": frontendConnectorRequestID, /* requestID */
            "s": 0                               /* status (0=KO; 1=OK) */
        };
        if (ctl && ctl.props && ctl.props[propName] && ctl.props[propName]["get"])
        {
            var ret = ctl.props[propName]["get"].call(ctl, params);

            // (1=OK)
            tmpObj["s"] = 1;
            tmpObj["p"] = ret;
        }
        this.protocolHandler.handle([tmpObj]);
    };

};

exports.connectors =
{
    "local": function (name, connection)
    {
        // fat clients internally handle all packages (events and props)
        this.isRemote = false;
        this.name = name;
        this.connection = connection;
    },
    "remote": function (connection)
    {
        this.isRemote = true;
        this.connection = connection;
    }
};
