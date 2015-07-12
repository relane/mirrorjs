/* *** mirrorjs Application Interface ***
 *
 */


var widgets = require("./widgets");
var base = require("./base");
var logger = require("./logger");


module.exports = function (protocolHandler)
{
    var handles = {};
    var counter = 1;
    var __new_state__ = {};
    var stateTimeout = null;
    var that = this;

    // Buffering flag
    var __disableBuffering__ = false;

    this.fireEvents = true;

    this.prefixID = "";


    /** exit
     * Destroys all widgets, closes the connection
     */
    this.exit = function ()
    {
        this.disableBuffering(true);

        this.destroyAll();

        setTimeout(protocolHandler.close, 50);
    };


    this.create = function (what, parent, args)
    {
        if (counter > 1000000)
        {
            counter = 1;
        }
        var handle = this.prefixID + (counter++);
        var widgetClass = widgets.getClass(what);

        logger.log("Backend: Creating widget " + what + " [" + handle + "]", logger.level.LOG_DEBUG);

        if (widgetClass === undefined)
        {
            logger.log("Backend ERROR: The widget " + what + " [" + handle + "] is not installed!!!", logger.level.LOG_INFO + logger.level.LOG_DEBUG);
            return undefined;
        }
        var ctl = new base.backend(this, handle, parent, args);
        ctl.type = what;
        widgetClass.backend.call(ctl, this, handle, parent, args);

        // parses custom props
        if (ctl.props !== undefined)
        {
            ctl.parseProps(ctl.props);
        }

        if (ctl && ctl.isGoodParent && ctl.isGoodParent() == false)
        {
            // this widget can't be child of the parent (eg. tabber only accepts tab)
            logger.log("Backend ERROR: The widget " + what + " [" + handle + "] cannot be child of [" + handles[parent.handle]["t"] + "]!!!", logger.level.LOG_INFO + logger.level.LOG_DEBUG);
            return undefined;
        }

        if (parent && parent.isGoodChild && parent.isGoodChild(ctl) == false)
        {
            // the parent can't accept this child
            logger.log("Backend ERROR: The widget " + what + " [" + handle + "] cannot be child of [" + handles[parent.handle]["t"] + "]!!!", logger.level.LOG_INFO + logger.level.LOG_DEBUG);
            return undefined;
        }

        handles[handle] =
        {
            "c": ctl, /* reference*/
            "a": args, /* args */
            "t": what, /* type */
            "s": {}     /* state */
        };

        if (args === undefined)
        {
            args = {};
        }

        var tmpObj = {"a": "c", "t": what, "w": handle, "e": args};
        if (parent && parent.handle !== undefined)
        {
            tmpObj["p"] = parent.handle;

            // the parent widget implemented the child's structure; use it!
            if (parent.children)
            {
                parent.children[handle] = ctl;
            }
        }
        this.send(tmpObj);

        return ctl;
    };


    // widget's name registry (used by getWidgetByName)
    var widgetsNames = {};

    this.checkWidgetName = function (widgetName)
    {
        return !!(widgetName !== "" && widgetsNames[widgetName] === undefined);
    };


    this.registerWidgetName = function (widgetName, handle)
    {
        var ctl = this.getWidget(handle);
        if (this.checkWidgetName(widgetName) && ctl)
        {
            widgetsNames[widgetName] = ctl;
            return true;
        }
        if (widgetName !== "")
        {
            logger.log("Backend: Invalid widget name [" + widgetName + "]", logger.level.LOG_INFO + logger.level.LOG_DEBUG);
        }
        return false;
    };


    this.unregisterWidgetName = function (widgetName)
    {
        if (widgetName !== "")
        {
            delete widgetsNames[widgetName];
        }
    };


    this.getWidgetByName = function (widgetName)
    {
        if (widgetName !== "")
        {
            return widgetsNames[widgetName];
        }
        return undefined;
    };


    this.destroy = function (who)
    {
        if (handles[who])
        {
            var ctl = handles[who]["c"];

            logger.log("Backend: Destroying widget " + handles[who]["t"] + " [" + who + "]", logger.level.LOG_DEBUG);

            delete handles[who];
            if (ctl && ctl.children)
            {
                for (var child in ctl.children)
                {
                    ctl.children[child].destroy();
                }
            }

            // removes the widget from the parent's children structure (if implemented)
            if (ctl.parent && ctl.parent.children)
            {
                delete ctl.parent.children[who];
            }

            this.send({"a": "d", "w": who});
        }
    };


    this.destroyAll = function ()
    {
        for (var obj in handles)
        {
            this.destroy(obj);
        }
    };


    this.getWidget = function (who)
    {
        if (handles[who])
        {
            return handles[who]["c"];
        }
        return undefined;
    };


    this.disableBuffering = function (s)
    {
        if (s === true)
        {
            logger.log("Backend: Disabling buffering...", logger.level.LOG_DEBUG);
            __disableBuffering__ = true;

            this.flushState();
        }
        else
        {
            logger.log("Backend: Enabling buffering...", logger.level.LOG_DEBUG);
            __disableBuffering__ = false;
        }
    };


    this.getState = function (w)
    {
        if (w !== undefined)
        {
            if (handles[w])
            {
                return handles[w];
            }
        }
        return {};
    };


    this.setState = function (who, k, v)
    {
        // console.log("setState:" , who, "[" + k + "] = ", v);
        if (handles[who] === undefined)
        {
            return;
        }
        handles[who]["s"][k] = v;

        if (this.fireEvents === true)
        {
            logger.log("Backend: Setting widget [" + who + "] state: (" + k + ": " + v + ")", logger.level.LOG_DEBUG);

            // updates temporary widget's status
            if (__new_state__[who] === undefined)
            {
                __new_state__[who] = {};
            }
            __new_state__[who][k] = v;
            if (__disableBuffering__ === true)
            {
                // immediately sends the state
                this.flushState();
            }
            else
            {
                // timeoutize the sending to the client to bufferize packets
                clearTimeout(stateTimeout);
                stateTimeout = setTimeout(this.flushState, 5);
            }
        }
    };


    this.flushState = function ()
    {
        logger.log("Backend: Flushing state...", logger.level.LOG_DEBUG);
        for (w in __new_state__)
        {
            that.send({"a": "u", "w": w, "s": __new_state__[w]});
        }

        __new_state__ = {};
    };


    var sendingBuffer = [];
    var sendingTimeout = null;
    this.send = function (obj)
    {
        sendingBuffer.push(obj);
        if (__disableBuffering__ === true)
        {
            this.flushBuffer();
        }
        else
        {
            clearTimeout(sendingTimeout);
            sendingTimeout = setTimeout(this.flushBuffer, 5);
        }
    };


    this.flushBuffer = function ()
    {
        logger.log("Backend: Sending state...", logger.level.LOG_DEBUG);
        protocolHandler.handle(sendingBuffer);
        sendingBuffer = [];
    };


    this.fireEvent = function (who, what, obj)
    {
        var ctl = handles[who];

        if (ctl && ctl.c)
        {
            if (ctl.c.events[what])
            {
                logger.log("Backend: Firing internal event " + what + " [" + who + "]", logger.level.LOG_EVENTS);
                ctl.c.events[what].call(ctl.c, ctl.c, obj);
            }

            var customEvent = ctl.c.getCustomEventHandler(what);
            if (customEvent)
            {
                // executes the custom event handler ((if) set with "on")
                logger.log("Backend: Firing event " + what + " [" + who + "]", logger.level.LOG_EVENTS);
                customEvent.call(ctl.c, ctl.c, obj);
            }

            if (what === "widgetResize")
            {
                // the widget chanded size! propagates the event to children (if interested)
                ctl.c.mapChildren(function (child)
                {
                    that.fireEvent(child.handle, "parentWidgetResize", {"parentWidgetInstance": ctl.c});
                }, /* recursive */ true);
            }

        }
    };


    this.events = {
        "fire": function (who, what, obj)
        {
            // events backend to frontend (protocol)
            var tmpPkg = {
                "a": "E",
                "t": what,
                "w": who
            };
            if (obj !== undefined)
            {
                tmpPkg["p"] = obj;
            }
            that.send(tmpPkg);
        },
        "activate": function (who, what, active)
        {
            // enable/disable an event (protocol)
            that.send({"a": "A", "t": what, "w": who, "p": active});
        }
    };


    this.domClassHandler = function (who, className, /* boolean */ addClass)
    {
        // add/remove class
        that.send({
            "a": "wc",
            "t": (addClass === true ? "a" : "r"),
            "w": who,
            "p": className
        });
    };


    /*
     * frontend "connector"
     *
     */

    function askFrontendProp(who, propName, params, frontendConnectorRequestID)
    {
        that.send({
            "a": "fp",
            "t": propName,
            "w": who,
            "p": params,
            "r": frontendConnectorRequestID
        });
    }

    var frontendConnectorHandlers = {};
    var frontendConnectorRequestID = 0;
    this.frontend = {
        "getProp": function (handle, propName, callback, params)
        {
            frontendConnectorRequestID++;
            if (frontendConnectorRequestID > 1000000)
            {
                frontendConnectorRequestID = 0;
            }
            frontendConnectorHandlers[frontendConnectorRequestID] = callback;
            askFrontendProp(handle, propName, params, frontendConnectorRequestID);
        }
    };


    this.handleFrontendProp = function (who, frontendConnectorRequestID, status, params)
    {
        var ctl = handles[who];
        if (ctl && ctl.c && frontendConnectorHandlers[frontendConnectorRequestID])
        {
            var booleanStatus = false;
            if (status === 1)
            {
                booleanStatus = true;
            }

            frontendConnectorHandlers[frontendConnectorRequestID].call(ctl.c, ctl.c, booleanStatus, params);
        }

        if (frontendConnectorHandlers[frontendConnectorRequestID])
        {
            delete frontendConnectorHandlers[frontendConnectorRequestID];
        }
    };


    /**
     * Messages broadcasting
     */
    var __broadcastCallback = null;
    this.broadcast = {
        /**
         * Sends a message to all active apps (interface)
         * Implemented by the server manager (servers.js)
         *
         */
        "send": function (eventGroup, eventName, obj)
        {
            console.log("0x90 NOP");
        },

        /**
         * Registers an handler
         *
         */
        "onmessage": function (callback)
        {
            __broadcastCallback = callback;
        },

        /**
         * Triggers an event (if a callback has been defined (with "onmessage"))
         *
         */
        "trigger": function (eventGroup, eventName, obj)
        {
            if (__broadcastCallback !== null)
            {
                __broadcastCallback(eventGroup, eventName, obj);
            }
        }
    };


    // custom events registry (emit/on)
    var __customEvents = {};

    /**
     * Emit
     * Sends a custom event backend to frontend
     *
     */
    this.emit = function (eventName, object)
    {
        // emit (protocol)
        that.send({
            "a": "m",
            "t": eventName,
            "w": object
        });
    };

    /**
     * On
     * Registers an handler
     *
     */
    this.on = function (eventName, callback)
    {
        logger.log("Backend: Binding custom event " + eventName, logger.level.LOG_EVENTS);

        __customEvents[eventName] = callback;
    };


    /**
     * triggerCustomEvent
     *
     */
    this.triggerCustomEvent = function (eventName, object)
    {
        if (__customEvents[eventName] !== undefined)
        {
            __customEvents[eventName](eventName, object);
        }
    };

};
