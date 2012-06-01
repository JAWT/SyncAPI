var util = require('./util.js');

exports.methods = {
    message: "message",
    request: "request",
    response: "response"
};

exports.types = {
    new_session: "new_session",
    join_session: "join_session",
    time: "time",
    reset: "reset",
    ward: "ward",
    remove_ward: "remove_ward",
    kill_monster: "kill_monster",
    error: "error"
};


// Helpers

exports.parse = function(json) {
    json = JSON.parse(json);
    var packet = new exports.packet(json.head.type, json.head.method, json.head.id);
    if(json.body != undefined) {
        packet.data = json.body;
    }
    return packet;
}

exports.PacketHandler = util.Class.extend({
    registry:       function() {
                        this.registry = {};
                    },
    register:       function(type, method) {
                        this.registry[type] = method;
                    },
    handle:         function(packet, user) {
                        if(this.registry[packet.type] == undefined) {
                            throw new util.Exception(util.error.invalid_type);
                        }
                        this.registry[packet.type].bind(user)(packet);
                    }
});


// Packets

exports.packet = util.Class.extend({
    init:       function(type, method, id) {
                    this.type = type;
                    this.method = method;
                    this.id = id;
                    this.data = {};
                },
    stringify:  function() {
                    return JSON.stringify({
                        body: this.data,
                        head: {
                            type: this.type,
                            method: this.method,
                            id: this.id
                        }
                    });
                },
    set:        function(key, value) {
                    this.data[key] = value;
                    return this
                },
    respond:    function(packet) {
                    packet.id = this.id;
                    packet.method = exports.methods.response;
                    return packet;
                }
});

exports.error = exports.packet.extend({
    init:       function(error) {
                    this._super(exports.methods.message, exports.types.error);
                    this.set('code', error[0]);
                    this.set('text', error[1]);
                }
});

exports.new_session = exports.packet.extend({
    init:       function(id) {
                    this._super(exports.methods.response, exports.types.new_session);
                    this.set('id', id);
                }
});
