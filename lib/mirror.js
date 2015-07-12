mirrorJSRequire=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof mirrorJSRequire=="function"&&mirrorJSRequire;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof mirrorJSRequire=="function"&&mirrorJSRequire;for(var o=0;o<r.length;o++)s(r[o]);return s})({"./base":[function(mirrorJSRequire,module,exports){
module.exports=mirrorJSRequire('Vlbn99');
},{}],"Vlbn99":[function(mirrorJSRequire,module,exports){
/* *** mirrorjs Base Widget ***
 *
 */


var baseHtmlMixin = mirrorJSRequire("./baseHtmlMixin");
var logger = mirrorJSRequire("./logger");


exports.ui = function (ui, handle, parent, args)
{
    var that = this;

    this.ui = ui;
    this.parent = parent;
    this.handle = handle;
    this.type = "";

    // widget's event registry
    this.events = {};

    // widget's backend-active events
    this.activeEvents = {};


    this.create = function ()
    {
        var parentElement;

        if (this.parent !== undefined)
        {
            parentElement = this.parent.getContainerNodeForChild(this, args);
        }
        else if (args && args["ParentElement"])
        {
            parentElement = $(args["ParentElement"]);
        }
        else
        {
            parentElement = $(document.body);
        }

        this.node_cnt$ = this.drawContainer(parentElement);

        // add base class
        this.decoratingContainer && this.decoratingContainer();

        this.show();
    };


    this.show = function ()
    {
    };


    /**
     * Returns the node where to place the child
     *
     * @param {instance} child Child instance
     * @param {object} childArgs Child's arguments
     *
     * @return {DOMNode}
     *
     *
     * NOTE: layout widgets can override this method
     *
     */
    this.getContainerNodeForChild = function (child, childArgs)
    {
        return this.node_cnt$;
    };


    /**
     * Default properties
     * ... called if not specified in the widget's class
     *
     *  NOTE: A widget could also override a method (eg. setPosition)
     *
     */
    var default_attr = {
        "Position": function (v)
        {
            that.setPosition(v);
        },
        "Top": function (v)
        {
            that.setTop(v);
        },
        "Left": function (v)
        {
            that.setLeft(v);
        },
        "Width": function (v)
        {
            that.setWidth(v);
        },
        "Height": function (v)
        {
            that.setHeight(v);
        },
        "Visible": function (v)
        {
            that.setVisible(v);
        },
        "Disabled": function (v)
        {
            that.setDisabled(v);
        },
        "Color": function (v)
        {
            that.setColor(v);
        },
        "Border": function (v)
        {
            that.setBorder(v);
        }
    };


    this.parseState = function (s)
    {
        for (var attr in s)
        {
            if (this.props !== undefined && this.props[attr] !== undefined && this.props[attr]["set"] !== undefined)
            {
                this.props[attr]["set"].call(this, s[attr]);
            }
            else if (default_attr[attr] !== undefined)
            {
                default_attr[attr].call(this, s[attr]);
            }

            triggerEventPropBased(attr);
        }
    };


    function triggerEventPropBased(propName)
    {
        if (propName === "Width" || propName === "Height")
        {
            if (that.afterResize)
            {
                that.afterResize();
            }

            /* Sends to the backend the event "widgetResize"
             *
             * NOTE: This event could have been triggered also directly in the backend
             * (when the props Width or Height change),
             * but in that case the event would have triggered (in the backend) before
             * the client (frontend) receives the props Width or Height
             */
            ui.events.fire(handle, "widgetResize");
        }
        else if (propName === "Top" || propName === "Left")
        {
            /* Sends to the backend the event "widgetMove"
             * ... (like above)
             */
            ui.events.fire(handle, "widgetMove");
        }
    }


    this.destroy = function ()
    {
        this.beforeDestroy && this.beforeDestroy();
        this.node_cnt$.remove();
        this.afterDestroy && this.afterDestroy();
    };


    /**
     * Widget's event registry
     *
     */
    this.activateEvent = function (what, s)
    {
        // dis/activate the event to send to the backend
        if (s)
        {
            this.activeEvents[what] = true;
            logger.log("Frontend: Activating event " + what + " [" + handle + "]", logger.level.LOG_EVENTS);
        }
        else
        {
            if (this.activeEvents[what])
            {
                delete this.activeEvents[what];
                logger.log("Frontend: Deactivating event " + what + " [" + handle + "]", logger.level.LOG_EVENTS);
            }
        }
    };


    this.addClass = function (className)
    {
        this.node_cnt$.addClass(className);
    };


    this.removeClass = function (className)
    {
        this.node_cnt$.removeClass(className);
    };


    this.focus = function ()
    {
        if (this.node$)
        {
            this.node$.focus();
        }
    };


    /**
     * Internal events registry
     *
     */
    this.__internal_events = {
        "__focus": this.focus
    };


    /**
     * Extends a widget
     *
     */
    var __mixins = {
        "keyboard": baseHtmlMixin["mixins"]["keyboard"]
    };
    this.loadMixin = function (mixin, mixinArgs)
    {
        if (__mixins[mixin])
        {
            __mixins[mixin].call(this, mixinArgs);
        }
    };


    // Inherits the defaults for the HTML adapter
    baseHtmlMixin["core"].call(this);

};

exports.backend = function (iApp, handle, parent, args)
{
    var that = this;

    this.handle = handle;
    this.parent = parent;
    this.children = {};

    // widget's name (used by getWidgetByName)
    var __name = "";

    // widgets's custom events (activated by the app (backend) with "on")
    var __events = {};

    // widget's internal events (overridden inside the widget)
    this.events = {};

    // internal widget's default properties registry
    var internalProperties = {};


    this.parseProps = function (props)
    {
        var pr;
        for (pr in props)
        {
            var _unused_ = function (ctl, prop_name, prop_params)
            {
                var callback = {};
                if (prop_params["get"] !== undefined && prop_params["set"] !== undefined)
                {
                    // user defined getter/setter
                    callback["get"] = prop_params["get"];
                    callback["set"] = prop_params["set"];
                }
                else if (prop_params["default"] !== undefined)
                {
                    // use internalProperties structure
                    internalProperties[prop_name] = prop_params["default"];
                    callback["get"] = function ()
                    {
                        return internalProperties[prop_name];
                    };
                    callback["set"] = function (nv)
                    {
                        internalProperties[prop_name] = nv;
                        return nv;
                    };
                }
                else
                {
                    console.log("Invalid property setting for [" + prop_name + "]");
                    return;
                }

                var paramType = prop_params["type"];

                Object.defineProperty(ctl, prop_name,
                    {
                        get: callback.get,
                        set: function (nv)
                        {
                            var ret = callback.set(nv);
                            if (paramType !== undefined)
                            {
                                // tries to convert to int; otherwise use the default value
                                if (paramType === "int")
                                {
                                    ret = parseInt(ret);
                                    if (isNaN(ret))
                                    {
                                        ret = prop_params["default"];
                                    }
                                }
                                else if (paramType === "float")
                                {
                                    ret = parseFloat(ret);
                                    if (isNaN(ret))
                                    {
                                        ret = prop_params["default"];
                                    }
                                }
                                else if (paramType === "boolean")
                                {
                                    if (ret !== true && ret !== false)
                                    {
                                        ret = prop_params["default"];
                                    }
                                }
                            }
                            iApp.setState(ctl.handle, prop_name, ret);
                        }
                    }
                );
            }(that, pr, props[pr]);
        }
    };


    /**
     * Executes a callback for each child
     *
     */
    this.mapChildren = function (callback, recursive)
    {
        for (var child in this.children)
        {
            var childInstance = iApp.getWidget(child);
            callback(childInstance);
            if (recursive === true)
            {
                childInstance.mapChildren(callback, true);
            }
        }
    };


    this.destroy = function ()
    {
        // send destroy event
        iApp.fireEvent(this.handle, "destroy");

        iApp.unregisterWidgetName(__name);

        iApp.destroy(this.handle);
    };


    this.on = function (what, callback)
    {
        logger.log("Backend: Binding event " + what + " [" + handle + "]", logger.level.LOG_EVENTS);

        // TODO: handling multiple events
        __events[what] = callback;

        // activate the event: what
        iApp.events.activate(this.handle, what, true);
    };


    this.off = function (what)
    {
        logger.log("Backend: Unbinding event " + what + " [" + handle + "]", logger.level.LOG_EVENTS);

        __events[what] = undefined;

        // deactivate the event: what
        iApp.events.activate(this.handle, what, false);
    };


    this.getCustomEventHandler = function (what)
    {
        // Return the event handler (activated with "on")
        return __events[what];
    };


    this.getState = function ()
    {
        return iApp.getState(this.handle);
    };


    this.addClass = function (className)
    {
        iApp.domClassHandler(this.handle, className, /* add */ true);
    };


    this.focus = function ()
    {
        iApp.events.fire(handle, "__focus");
    };


    this.removeClass = function (className)
    {
        iApp.domClassHandler(this.handle, className, /* remove */ false);
    };


    // global properties
    this.__base_props =
    {
        "Name": {
            "get": function ()
            {
                return __name;
            },
            "set": function (nv)
            {
                // Valid widget's name? Register it!
                if (iApp.registerWidgetName(nv, handle) === true || nv === "")
                {
                    // If the new name is "" or a valida name: the widget has been registered!
                    // ... removes the old name
                    iApp.unregisterWidgetName(__name);
                    __name = nv;
                }
                return __name;
            },
            "description": "The Name property specifies the name of the widget."
        },
        "Position": {
            "default": "",
            "description": "The Position property specifies the type of positioning method used for the widget (static, relative, absolute, fixed (or more if implemented by the frontend))."
        },

        "Top": {
            "default": 0,
            "type": "int",
            "description": "For absolutely positioned widgets, the Top property sets the top edge of the widget to a unit above/below the top edge of its containing widget. For relatively positioned widgets, the Top property sets the top edge of the widget to a unit above/below its normal position."
        },

        "Left": {
            "default": 0,
            "type": "int",
            "description": "For absolutely positioned widgets, the Left property sets the left edge of the widget to a unit to the left/right of the left edge of its containing widget. For relatively positioned widgets, the Left property sets the left edge of the widget to a unit to the left/right to its normal position."
        },

        "Width": {
            "default": 0,
            "type": "int",
            "description": "The Width property sets the width of the widget."
        },

        "Height": {
            "default": 0,
            "type": "int",
            "description": "The Height property sets the height of the widget."
        },

        "Visible": {
            "default": true,
            "type": "boolean",
            "description": "The Visible property sets the visibility of the widget."
        },

        "Disabled": {
            "default": false,
            "type": "boolean",
            "description": "The Disabled property sets or returns whether an element is disabled, or not."
        },

        "Color": {
            "default": "",
            "description": "The Color property sets the text color of the widget."
        },

        "Border": {
            "default": "",
            "description": "The Border property sets the style, size and color of a widget's border."
        }
    };

    this.parseProps(this.__base_props);

};

},{"./baseHtmlMixin":3,"./logger":7}],3:[function(mirrorJSRequire,module,exports){
/* *** HTML Defaults ***
 *
 */


module.exports = {
    "core": function()
        {

            this.drawContainer = function (parentElement)
            {
                parentElement.append(
                    '<div id="' + this.handle + '"></div>'
                );
                return $("#" + this.handle, parentElement);
            };


            this.decoratingContainer = function()
            {
                this.node_cnt$.addClass("mirrorJSWidget");
                this.node_cnt$.addClass("mirrorJS_" + this.type);
            };


            this.setPosition = function(v)
            {
                this.node_cnt$.css( "position", v );
            };


            this.setTop = function(v)
            {
                this.node$ && this.node_cnt$.css( "top", v + "px" );
            };


            this.setLeft = function(v)
            {
                this.node$ && this.node_cnt$.css( "left", v + "px" );
            };


            this.setWidth = function(v)
            {
                this.node$ && this.node$.css( "width", v + "px" );
            };


            this.setHeight = function(v)
            {
                this.node$ && this.node$.css( "height", v + "px" );
            };


            this.setVisible = function(v)
            {
                this.node_cnt$ && this.node_cnt$.css( "visibility", v ? "" : "hidden" );
            };

            this.setDisabled = function(v)
            {
                if (this.node$)
                {
                    this.node$.attr( "disabled", v );
                    if (v)
                    {
                        this.node$.addClass( "mirrorJS_disabled" );
                    }
                    else
                    {
                        this.node$.removeClass( "mirrorJS_disabled" );
                    }
                }
            };


            this.setColor = function(v)
            {
                this.node$ && this.node$.css( "color", v );
            };


            this.setBorder = function(v)
            {
                this.node$ && this.node$.css( "border", v );
            };
        },

    "mixins": {

        "keyboard": function(callback)
            {

                function getEventParams(event)
                {
                    return {
                        altKey: event["altKey"],
                        charCode: event["charCode"],
                        ctrlKey: event["ctrlKey"],
                        keyCode: event["keyCode"],
                        metaKey: event["metaKey"],
                        shiftKey: event["shiftKey"],
                        timeStamp: event["timeStamp"],
                        type: event["type"],
                        which: event["which"]
                    }
                }

                this.bindKeyboardEvents = function(node)
                {

                    node.keyup( function(event)
                        {
                            callback("keyup", event, getEventParams(event));
                        } );
                    node.keydown( function(event)
                        {
                            callback("keydown", event, getEventParams(event));
                        } );
                    node.keypress( function(event)
                        {
                            callback("keypress", event, getEventParams(event));
                        } );
                };

            }

        }

    };

},{}],4:[function(mirrorJSRequire,module,exports){
/* *** mirrorjs Connectors ***
 *
 */


exports.SockJS = function (conf)
{
    var sock = null;
    var isConnected = false;

    var buffer = "";

    var host = conf["host"], port = conf["port"] || 80, protocol = conf["protocol"];

    this.connect = function (onopen, onmessage, onclose)
    {
        if (protocol === undefined)
        {
            protocol = "http:";
        }
        sock = new SockJS(protocol + "//" + host + ":" + port + "/mirror");
        sock.onopen = function ()
        {
            isConnected = true;
            onopen();
        };

        sock.onmessage = function (e)
        {
            var completePkg = "";
            buffer += e.data;
            if (buffer.substr(-1) === "\n")
            {
                completePkg = buffer
                buffer = "";
            }
            else
            {
                var pkgs = buffer.split("\n");
                buffer = pkgs.pop();
                completePkg = pkgs.join("\n");
            }
            onmessage(completePkg);
        };

        sock.onclose = function (obj)
        {
            isConnected = false;
            onclose(obj);
        };

    };

    this.send = function (w)
    {
        if (isConnected && sock)
        {
            sock.send(w);
        }
    };

    // TODO: needs more testing
    this.close = function ()
    {
        if (isConnected && sock)
        {
            sock.close();
        }
    };

};


exports.Socket = function (conf)
{
    var net = require('net');

    var client = null;
    var isConnected = false;

    var buffer = "";

    var host = conf["host"], port = conf["port"];

    this.connect = function (onopen, onmessage, onclose)
    {
        client = new net.Socket();
        client.connect(port, host, function ()
        {
            isConnected = true;
            onopen();
        });

        client.on('data', function (data)
        {
            var completePkg = "";
            buffer += data.toString();
            if (buffer.substr(-1) === "\n")
            {
                completePkg = buffer;
                buffer = "";
            }
            else
            {
                var pkgs = buffer.split("\n");
                buffer = pkgs.pop();
                completePkg = pkgs.join("\n");

                // console.log("full buffer: [" + completePkg + "]");
                // console.log("partial buffer: [" + buffer + "]");

            }
            onmessage(completePkg);
        });

        client.on('close', function (obj)
        {
            isConnected = false;
            onclose(obj);
        });
    };

    this.send = function (w)
    {
        if (isConnected && client)
        {
            client.write(w);
        }
    };

    // TODO: needs more testing
    this.close = function ()
    {
        if (isConnected && sock)
        {
            sock.close();
        }
    };

};

},{}],5:[function(mirrorJSRequire,module,exports){
/* *** mirrorjs Events ***
 *
 */


var logger = mirrorJSRequire("./logger");

module.exports = function (ui)
{
    this.fire = function (who, what, obj, forceSend)
    {
        var ctl = ui.getCtl(who);
        if (ctl)
        {
            // Sends all active events and all that beginning with "__"
            if (forceSend === true || ctl.activeEvents[what])
            {
                // Sends only active events
                var tmpObj = {
                    "a": "e", /* action: send frontend -> backend */
                    "t": what, /* event name */
                    "w": who         /* handle */
                };
                if (obj !== undefined)
                {
                    tmpObj["p"] = obj;
                }
                logger.log("Frontend: Firing event " + what + " [" + who + "]", logger.level.LOG_EVENTS);
                ui.protocolHandler.handle([tmpObj]);
            }
        }
    };


    /**
     * Sends an event frontend to frontend (unused?)
     *
     */
    this.trigger = function (who, what, obj)
    {
        ui.handleEvent({
            "w": who,
            "t": what,
            "p": obj
        });
    };

};

},{"./logger":7}],6:[function(mirrorJSRequire,module,exports){
/* *** mirrorjs Application Interface ***
 *
 */


var widgets = mirrorJSRequire("./widgets");
var base = mirrorJSRequire("./base");
var logger = mirrorJSRequire("./logger");


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

},{"./base":"Vlbn99","./logger":7,"./widgets":"RD6lrm"}],7:[function(mirrorJSRequire,module,exports){
/* *** mirrorjs Logger ***
 *
 */


var debugLevel = 0;

exports.level = {
        LOG_INFO    : 0x01,
        LOG_DEBUG   : 0x02,
        LOG_EVENTS  : 0x04,
        LOG_SOCKET  : 0x08
    };

exports.log = function(msg, logLevel)
{
    if ( (logLevel & debugLevel) !== 0 )
    {
        var x = new Date();
        var y = x.getHours() + ':' + x.getMinutes() + ':' + x.getSeconds() + ':' + x.getMilliseconds() + ' :: ';

        console.log( y + msg );
    }
};


exports.setDebugLevel = function(level)
{
    debugLevel = level;
};

},{}],"mirrorJS":[function(mirrorJSRequire,module,exports){
module.exports=mirrorJSRequire('N1UtQB');
},{}],"N1UtQB":[function(mirrorJSRequire,module,exports){
/* *** mirrorJS ***
 *
 */


var iApp = mirrorJSRequire("./iApp");
var protocol = mirrorJSRequire("./protocol");
var logger = mirrorJSRequire("./logger");

var __VERSION = {
    "MAJOR": 0,
    "MINOR": 2,
    "REVISION": 1
};

exports.VERSION = __VERSION["MAJOR"] + "." + __VERSION["MINOR"] + "." + __VERSION["REVISION"];


exports.servers = mirrorJSRequire("./servers");


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
    "controller": mirrorJSRequire("./widgets"),
    "base": mirrorJSRequire("./base")
};


exports.connectors = mirrorJSRequire("./connectors");

exports.ui = mirrorJSRequire("./ui");

exports.logger = mirrorJSRequire("./logger");


// banner
console.log("mirrorjs v" + exports.VERSION);

},{"./base":"Vlbn99","./connectors":4,"./iApp":6,"./logger":7,"./protocol":"D5yDcg","./servers":12,"./ui":13,"./widgets":"RD6lrm"}],"D5yDcg":[function(mirrorJSRequire,module,exports){
/* *** mirrorjs Handlers ***
 *
 */


var iUI = mirrorJSRequire("./ui");
var logger = mirrorJSRequire("./logger");


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

},{"./logger":7,"./ui":13}],"./protocol":[function(mirrorJSRequire,module,exports){
module.exports=mirrorJSRequire('D5yDcg');
},{}],12:[function(mirrorJSRequire,module,exports){
/* *** mirrorjs Servers ***
 *
 */


exports.readConf = function (path, checkAliases)
{
    var fs = require('fs');
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
                tmpReq = require(global.__base_path + conf["aliases"][alias]);
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
    var mirrorJSRequiredApp = null;
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
                            mirrorJSRequiredApp = require(global.__base_path + conf["aliases"][o["w"]]);
                            tmpLog += "OK!";

                            runningApp = mirrorJSRequiredApp({
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
                            mirrorJSRequiredApp = null;
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
    var http = require('http');
    var sockjs = require('sockjs');

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
    var net = require('net');

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

},{}],13:[function(mirrorJSRequire,module,exports){
/* *** mirrorjs UI ***
 *
 */


var widgets = mirrorJSRequire("./widgets");
var events = mirrorJSRequire("./events");
var base = mirrorJSRequire("./base");
var logger = mirrorJSRequire("./logger");


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

},{"./base":"Vlbn99","./events":5,"./logger":7,"./widgets":"RD6lrm"}],"./widgets":[function(mirrorJSRequire,module,exports){
module.exports=mirrorJSRequire('RD6lrm');
},{}],"RD6lrm":[function(mirrorJSRequire,module,exports){
/* *** mirrorjs Widgets ***
 *
 */


var base = mirrorJSRequire("./base");


var widgets = {};


exports.getClass = function(t)
{
    return widgets[t];
};


exports.map = function(callback)
{
    for(var w in widgets)
    {
        callback(w, widgets[w]);
    }
};


function getWidgetProperties(wc)
{
    var widgetInstance = new base.backend();
    wc.backend.call(widgetInstance);

    var ret = {};

    function addPropsFrom(propsObj)
    {
        for(var prop in propsObj)
        {
            ret[prop] = {
                "default": propsObj[prop]["default"],
                "type": propsObj[prop]["type"],
                "description": propsObj[prop]["description"]
            };
        }
    }

    // base props
    if(widgetInstance.__base_props)
    {
        addPropsFrom(widgetInstance.__base_props);
    }

    // widget's props
    if ( widgetInstance.props )
    {
        addPropsFrom(widgetInstance.props);
    }
    widgetInstance = null;
    return ret;
}


exports.getInfo = function(widgetName)
{
    if ( widgets[widgetName] )
    {
        return {
            "name": widgets[widgetName]["name"],
            "author": widgets[widgetName]["author"],
            "version": widgets[widgetName]["version"],
            "properties": getWidgetProperties(widgets[widgetName])
            };
    }
    return undefined;
};


exports.install = function(wc)
{
    widgets[wc["name"]] = wc;
};


exports.installAll = function(path)
{
    var fs = require('fs');

    if ( path === undefined )
    {
        path = __dirname + "/widgets";
    }

    fs.readdir(path, function(err, files)
        {
            // console.log("Installing all available widgets in [" + path + "]...");
            if ( err || !files )
            {
                console.log("ERROR: Invalid widget's path: [" + path + "]");
                return;
            }

            files.filter(function(file)
                {
                    return file !== "mirror.js" && file.substr(-3) == '.js';
                }).forEach(function(file)
                    {
                        var tmpReq, tmpLog;
                        tmpLog = "Trying to install widget [" + file + "] ...";
                        try
                        {
                            tmpReq = require(path + "/" + file);
                            tmpLog += "OK!";
                        }
                        catch(e)
                        {
                            tmpLog += "ERROR [" + e + "]!";
                            console.log(tmpLog);
                        }
                        // console.log(tmpLog);
                    });
        });

};

},{}]},{},[]);

var mirrorjs;
(function () {
	if (typeof module !== 'undefined' && module.exports)
	{
		module.exports = mirrorJSRequire("mirrorJS");
	}
	else
	{
		mirrorjs = mirrorJSRequire("mirrorJS");
	}
})();

