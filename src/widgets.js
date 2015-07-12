/* *** mirrorjs Widgets ***
 *
 */


var base = require("./base");


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
    var fs = r_equire('fs');

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
                            tmpReq = r_equire(path + "/" + file);
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
