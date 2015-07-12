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
