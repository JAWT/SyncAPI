var util = require('./util.js')
var model = require('./model.js');
var packets = require('./packets.js');

var debug = true;

util.createServer(1337, handleConnection)

function handleConnection(connection) {
    console.log("Connection from " + connection.remoteAddress + " accepted.");
    var user = new model.User(connection)

    connection.addListener('message', function(wsMessage) {
        var message = wsMessage;
        if (typeof wsMessage.type !== 'undefined') {
            if (wsMessage.type !== 'utf8') {
                return;
            }
            message = wsMessage.utf8Data;
        }
        try {
            var packet = packets.parse(message)
        } catch(e) {
            user.send(new packets.error(util.error.invalid_packet));
            return;
        }
        if(!debug) {
            try {
                user.onMessage(packet)
            } catch(e) {
                user.send(new packets.error(util.error.internal_error));
                return;
            }
        } else {
            user.onMessage(packet)
        }
    });
    
    connection.addListener('close', function() {
        user.onDisconnect()
    });
}
