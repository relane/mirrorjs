/* *** mirrorjs Events ***
 *
 */


var logger = require("./logger");

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
