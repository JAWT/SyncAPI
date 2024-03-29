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
    error: "error",
    keep_alive: "keep_alive",
    user_count: "user_count"
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
                    this.type = type.toLowerCase();
                    this.method = method || exports.methods.message;
                    this.id = id;
                    this.data = {};
                },
    stringify:  function() {
                    return JSON.stringify(this.build());
                },
    build:      function() {
                    return {
                        body: this.data,
                        head: {
                            type: this.type,
                            method: this.method,
                            id: this.id
                        }
                    };
                },
    set:        function(key, value) {
                    this.data[key] = value;
                    return this;
                },
    get:        function(key) {
                    return this.data[key];
                },
    respond:    function(packet) {
                    packet.id = this.id;
                    packet.method = exports.methods.response;
                    return packet;
                },
    remoteTime: function(user, time) {
                    if(this.get('time') != undefined) {
                        if(time == undefined) {
                            time = this.get('time');
                        }
                        this.set('time', user.toRemoteTime(time));
                    }
                    return this;
                },
    assert:     function(field, type) {
                    if(typeof field == "string") {
                        if(this.get(field) == undefined) {
                            throw new util.Exception(util.missingField(field));
                        }
                        if(typeof this.get(field) != type) {
                            throw new util.Exception(util.wrongType(field, type));
                        }
                    } else {
                        for(var i in field) {
                            this.assert(field[i], type);
                        }
                    }
                }
});

exports.error = exports.packet.extend({
    init:       function(error) {
                    this._super(exports.types.error);
                    this.set('code', error[0]);
                    this.set('text', error[1]);
                }
});

exports.time = exports.packet.extend({
    init:       function() {
                    this._super(exports.types.time, exports.methods.request);
                    this.time = (new Date()).getTime();
                }
});

exports.new_session = exports.packet.extend({
    init:       function(id) {
                    this._super(exports.types.new_session);
                    this.set('id', id);
                }
});

exports.join_session = exports.packet.extend({
    init:       function() {
                    this._super(exports.types.join_session);
                }
});

exports.ward = exports.packet.extend({
    init:       function(ward) {
                    this._super(exports.types.ward);
                    this.set('id', ward.id);
                    this.set('x', ward.x);
                    this.set('y', ward.y);
                    this.set('allied', ward.allied);
                    this.set('vision', ward.vision);
                    this.set('time', ward.time);
                }
});

exports.remove_ward = exports.packet.extend({
    init:       function(id) {
                    this._super(exports.types.remove_ward);
                    this.set('id', id);
                }
});

exports.kill_monster = exports.packet.extend({
    init:       function(id, time) {
                    this._super(exports.types.kill_monster);
                    this.set('id', id);
                    this.set('time', time);
                }
});

exports.reset = exports.packet.extend({
    init:       function() {
                    this._super(exports.types.reset);
                }
});

exports.user_count = exports.packet.extend({
    init:       function(count) {
                    this._super(exports.types.user_count);
                    this.set('count', count);
                }
});

exports.keep_alive = exports.packet.extend({
    init:       function() {
                    this._super(exports.types.keep_alive);
                }
});

