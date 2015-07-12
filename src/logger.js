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
