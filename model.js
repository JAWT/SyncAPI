var packets = require('./packets');
var util = require('./util.js');

var debug = true;

exports.User = util.Class.extend({
    init:           function(connection) {
                        this.connection = connection;
                        this.requests = {};
                        this.nextId = 0;
                        this.send(new packets.time());
                    },
    onMessage:      function(message) {
                        if(debug) {
                            console.log("< received from " + this.connection.remoteAddress);
                            console.log(message);
                            console.log();
                        }
                        if(message.method == packets.methods.response) {
                            message.request = this.requests[message.id];
                            if(message.request == undefined) {
                                this.send(new packets.error(util.error.no_request));
                                return;
                            } else if(message.request.type != message.type) {
                                this.send(new packets.error(util.error.response_type));
                                return;
                            }
                            delete this.requests[message.id];
                        }
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
                        if(this.session != undefined) {
                            this.session.leave(this);
                        }
                        console.log("User " + this.connection.remoteAddress + " disconnected.");
                    },
    send:           function(packet) {
                        if(packet.id == undefined) {
                            packet.id = this.nextId += 2;
                        }
                        this.connection.sendUTF(packet.stringify());
                        if(debug) {
                            console.log("> sent to " + this.connection.remoteAddress);
                            console.log(packet.build());
                            console.log();
                        }
                        if(packet.method == packets.methods.request) {
                            this.requests[packet.id] = packet;
                        }
                    },
    join:           function(session) {
                        if(this.session != undefined) {
                            this.session.leave(this);
                        }
                        this.session = session;
                        session.join(this);
                    },
    assertSession:  function() {
                        if(this.session == undefined) {
                            throw new util.Exception(util.error.no_session);
                        }
                    },
    toLocalTime:    function(time) {
                        if(this.timeOffset == undefined) {
                            throw new util.Exception(util.error.missing_time);
                        }
                        return time - this.timeOffset;
                    },
    toRemoteTime:   function(time) {
                        if(this.timeOffset == undefined) {
                            throw new util.Exception(util.error.missing_time);
                        }
                        return time + this.timeOffset;
                    }
});

var packetHandler = new packets.PacketHandler();
packetHandler.register(
    packets.types.new_session, function(packet) {
        this.join(new Session());
        this.send(packet.respond(new packets.new_session(this.session.id)));
    }
);
packetHandler.register(
    packets.types.join_session, function(packet) {
        var session = sessions[packet.get("id")];
        if(session == undefined) {
            throw new util.Exception(util.error.invalid_session);
        }
        this.join(session);
        this.send(packet.respond(new packets.join_session()));
    }
);
packetHandler.register(
    packets.types.ward, function(packet) {
        this.assertSession();
        packet.assert(['x', 'y', 'time'], 'number');
        packet.assert(['allied', 'vision'], 'boolean');
        var ward = new Ward(packet.get('x'), packet.get('y'),
                            packet.get('allied'), packet.get('vision'),
                            this.toLocalTime(packet.get('time')));
        this.session.addWard(ward);
        for(var i in this.session.users) {
            var user = this.session.users[i];
            var broadcast = new packets.ward(ward);
            broadcast.set('time', this.toRemoteTime(ward.time));
            if(user == this) {
                packet.respond(broadcast);
            }
            user.send(broadcast);
        }
    }
);
packetHandler.register(
    packets.types.time, function(packet) {
        var time = (new Date()).getTime();
        if(packet.request == undefined) {
            throw new util.Exception(util.error.invalid_method);
        }
        packet.assert('time', 'number');
        time = (time + packet.request.time) / 2;
        this.timeOffset = packet.get('time') - time;
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
                        this.wards = {};
                        this.nextId = 1;
                        console.log("New session: " + this.id);
                    },
    generateId:     function() {
                        this.id = "";
                        var vocal = false;
                        var last;
                        for(var i = 0; i < 6; i++) {
                            var chars = vocal ? this.VOCALS : this.CONSONANTS;
                            do {
                                var j = Math.floor((Math.random() * chars.length));
                            } while(last == chars[j])
                            last = chars[j];
                            this.id = this.id + last;
                            if(!vocal || Math.random() > 0.2) {
                                vocal = !vocal;
                            }
                        }
                    },
    join:           function(user) {
                        this.users.push(user);
                    },
    leave:          function(user) {
                        this.users.splice(this.users.indexOf(user), 1);
                        if(this.users.length == 0) {
                            delete sessions[this.id];
                            console.log("Destroied session: " + this.id);
                        }
                    },
    addWard:        function(ward) {
                        this.cleanup();
                        var id = this.nextId++;
                        ward.id = id;
                        this.wards[id] = ward;
                    },
    cleanup:        function() {
                        var time = (new Date()).getTime();
                        for(var id in this.wards) {
                            if(this.wards[id].time < time) {
                                delete this.wards[id];
                            }
                        }
                    },
    VOCALS:         ['a', 'e', 'i', 'o', 'u'],
    CONSONANTS:     ['b', 'c', 'd', 'f', 'g' , 'h', 'k', 'l', 'm',
                     'n', 'p', 'r', 's', 't', 'w', 'x', 'z']
});

Ward = util.Class.extend({
    init:           function(x, y, allied, vision, time) {
                        this.x = x;
                        this.y = y;
                        this.allied = allied;
                        this.vision = vision;
                        this.time = time + 3*60*1000;
                    }
});
