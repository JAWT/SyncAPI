var packets = require('./packet.js');
var util = require('./util.js');
var Ward = require('./ward.js').Ward;
var Session = require('./session.js').Session;

var packetHandler = new packets.PacketHandler();
exports.packetHandler = packetHandler;

packetHandler.register(
    packets.types.time, function(packet) {
        var time = (new Date()).getTime();
        if(packet.request == undefined) {
            throw new util.Exception(util.error.invalid_method);
        }
        packet.assert('time', 'number');
        time = Math.floor((time + packet.request.time) / 2);
        this.timeOffset = packet.get('time') - time;
    }
);

packetHandler.register(
    packets.types.new_session, function(packet) {
        this.join(new Session());
        this.send(packet.respond(new packets.new_session(this.session.id)));
    }
);

packetHandler.register(
    packets.types.join_session, function(packet) {
        packet.assert('id', 'string');
        var session = Session.find(packet.get("id"));
        if(session == undefined) {
            throw new util.Exception(util.error.invalid_session);
        }
        this.join(session);
        this.send(packet.respond(new packets.join_session()));

        this.session.cleanup();
        for(var i in this.session.wards) {
            this.send((new packets.ward(this.session.wards[i])).remoteTime(this));
        }
        for(var i in this.session.monsters) {
            var time = this.session.monsters[i];
            this.send((new packets.kill_monster(i, time)).remoteTime(this));
        }
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
        broadcast(this, new packets.ward(ward), packet);
    }
);

packetHandler.register(
    packets.types.remove_ward, function(packet) {
        this.assertSession();
        packet.assert('id', 'number');
        var id = packet.get('id');
        this.session.removeWard(id);
        broadcast(this, new packets.remove_ward(id), packet);
    }
);

packetHandler.register(
    packets.types.kill_monster, function(packet) {
        this.assertSession();
        packet.assert(['id', 'time'], 'number');
        var id = packet.get('id');
        var time = packet.get('time');
        time = this.session.killMonster(id, this.toLocalTime(time));
        broadcast(this, new packets.kill_monster(id, time), packet);
    }
);

packetHandler.register(
    packets.types.reset, function(packet) {
        this.assertSession();
        time = this.session.reset();
        broadcast(this, new packets.reset(), packet);
    }
);

function broadcast(source, packet, request) {
    var time = packet.get('time');
    for(var i in source.session.users) {
        var user = source.session.users[i];
        if(user != source) {
            user.send(packet.remoteTime(user, time), user);;
        }
    }
    source.send(request.respond(packet.remoteTime(source, time)), source);
}
