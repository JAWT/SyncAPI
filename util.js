var http = require('http');
var WebSocketRequest = require('websocket').request;
var WebSocketServer = require('websocket').server;
var ws = require('websocket-server');

// Support for multiple WebSocket versions
WebSocketRequest.prototype.connections = [];
WebSocketRequest.prototype.handleRequestAccepted = WebSocketServer.prototype.handleRequestAccepted;
WebSocketRequest.prototype.handleConnectionClose = WebSocketServer.prototype.handleConnectionClose;
WebSocketRequest.prototype.broadcastUTF = WebSocketServer.prototype.broadcastUTF;

exports.createServer = function(port, connectionHanlder) {
    var httpServer = http.createServer(function(request, response) {
        response.writeHead(404);
        response.end();
    });
    httpServer.listen(port, function() {
        console.log("Server is listening on port " + port);
    });

    var miksagoConnection = require('./node_modules/websocket-server/lib/ws/connection');
    var miksagoServer = ws.createServer();
    miksagoServer.server = httpServer;

    miksagoServer.addListener('connection', function(connection) {
        // Add remoteAddress property
        connection.remoteAddress = connection._socket.remoteAddress;

        // We want to use "sendUTF" regardless of the server implementation
        connection.sendUTF = connection.send;
        connectionHanlder(connection);
    });

    var wsServerConfig =  {
        maxReceivedFrameSize: 0x10000,
        maxReceivedMessageSize: 0x100000,
        fragmentOutgoingMessages: true,
        fragmentationThreshold: 0x4000,
        keepalive: true,
        keepaliveInterval: 20000,
        assembleFragments: true,
        disableNagleAlgorithm: true,
        closeTimeout: 5000
    };

    var wsRequest={};
    httpServer.on('upgrade', function(req, socket, head) {
        if (typeof req.headers['sec-websocket-version'] !== 'undefined') {
            wsRequest = new WebSocketRequest(socket, req, wsServerConfig);
            try {
                wsRequest.readHandshake();
                var wsConnection = wsRequest.accept(wsRequest.requestedProtocols[0], wsRequest.origin);
                wsRequest.handleRequestAccepted(wsConnection);
                connectionHanlder(wsConnection);
            }
            catch(e) {
                console.log("WebSocket Request unsupported by WebSocket-Node: " + e.toString());
                return;
            }
        } else {
            if (req.method === 'GET' &&
                (req.headers.upgrade && req.headers.connection) &&
                req.headers.upgrade.toLowerCase() === 'websocket' &&
                req.headers.connection.toLowerCase() === 'upgrade') {
                new miksagoConnection(miksagoServer.manager, miksagoServer.options, req, socket, head);
            }

        }
    });
};

exports.error = {
    invalid_packet: [400, "Invalid packet format"],
    invalid_type:   [401, "Invalid packet type"],
    invalid_method: [402, "Invalid packet method"],
    missing_field:  [403, "Missing field"],
    invalid_session:[404, "Invalid session id"],
    wrong_type:     [405, "Invalid field type"],
    no_request:     [406, "Invalid response id"],
    no_session:     [407, "Not in a game session"],
    response_type:  [408, "Response type mismatches request"],
    missing_time:   [409, "Time offset unknown"],
    internal_error: [500, "Internal error"]
};

exports.missingField = function(field) {
    return [403, "Missing field: '" + field + "'"];
}

exports.wrongType = function(field, type) {
    return [405, "Expected type '" + type + "' for field '" + field + "'"];
}

exports.Exception = function(error) {
    this.error = error;
};


/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
(function(){
  var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
  this.Class = function(){};
  Class.extend = function(prop) {
    var _super = this.prototype;
    initializing = true;
    var prototype = new this();
    initializing = false;
    for (var name in prop) {
      prototype[name] = typeof prop[name] == "function" &&
        typeof _super[name] == "function" && fnTest.test(prop[name]) ?
        (function(name, fn){
          return function() {
            var tmp = this._super;
            this._super = _super[name];
            var ret = fn.apply(this, arguments);
            this._super = tmp;
            return ret;
          };
        })(name, prop[name]) :
        prop[name];
    }
    function Class() {
      if ( !initializing && this.init )
        this.init.apply(this, arguments);
    }
    Class.prototype = prototype;
    Class.prototype.constructor = Class;
    Class.extend = arguments.callee;
    return Class;
  };
})();
exports.Class = Class;
