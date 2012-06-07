var controller = require('./controller.js');
var util = require('./util.js');
var packets = require('./packet.js');

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
                            console.log(message.build());
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
                            controller.packetHandler.handle(message, this);
                        } catch(e) {
                            if(e instanceof util.Exception) {
                                e = e.error;
                            } else {
                                console.log(e);
                                e = util.error.internal_error;
                            }
                            this.send(message.respond(new packets.error(e)));
                        }
                    },
    onDisconnect:   function() {
                        if(this.session != undefined) {
                            this.session.leave(this);
                        }
                        console.log("User " + this.connection.remoteAddress + " disconnected.");
                    },
    send:           function(packet) {
                        if(packet.method != packets.methods.response) {
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
    keepAlive:      function() {
                        this.send(new packets.keep_alive());
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
