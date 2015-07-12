/* *** mirrorjs Base Widget ***
 *
 */


var baseHtmlMixin = require("./baseHtmlMixin");
var logger = require("./logger");


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
