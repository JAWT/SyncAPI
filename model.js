var packets = require('./packets');
var util = require('./util.js');

exports.User = util.Class.extend({
    init:           function(connection) {
                        this.connection = connection;
                    },
    onMessage:      function(message) {
                        try {
                            packetHandler.handle(message, this);
                        } catch(e) {
                            if(e instanceof util.Exception) {
                                e = e.error;
                            } else {
                                console.log(e);
                                e = util.error.internal_error;
                            }
                            this.send(new packets.error(e));
                        }
                    },
    onDisconnect:   function() {
                        console.log("User " + this.connection.remoteAddress + " disconnected.");
                    },
    send:            function(packet) {
                        this.connection.sendUTF(packet.stringify());
                    }
});

var packetHandler = new packets.PacketHandler();
packetHandler.register(
    packets.types.new_session, function(packet) {
        this.session = new Session();
        this.session.join(this);
        this.send(packet.respond(new packets.new_session(this.session.id)));
    }
);

var sessions = {};

Session = util.Class.extend({
    init:           function() {
                        while(this.id == undefined || sessions[this.id] != undefined) {
                            this.generateId();
                        }
                        sessions[this.id] = this;
                        this.users = [];
                    },
    generateId:     function() {
                        this.id = "";
                        var vocal = false;
                        for(var i = 0; i < 6; i++) {
                            var chars = vocal ? this.VOCALS : this.CONSONANTS;
                            var j = Math.floor((Math.random() * chars.length));
                            this.id = this.id + chars[j];
                            if(!vocal || Math.random() > 0.2) {
                                vocal = !vocal;
                            }
                        }
                    },
    join:           function(user) {
                        this.users.push(user);
                    },
    VOCALS:         ['a', 'e', 'i', 'o', 'u'],
    CONSONANTS:     ['b', 'c', 'd', 'f', 'g' , 'h', 'k', 'l', 'm', 
                     'n', 'p', 'r', 's', 't', 'w', 'x', 'z']
});
