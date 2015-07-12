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
    var net = r_equire('net');

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
