var util = require('./util.js');
var monster = require('./monster.js');

var sessions = {};

exports.Session = util.Class.extend({
    init:           function() {
                        while(this.id == undefined || sessions[this.id] != undefined) {
                            this.generateId();
                        }
                        sessions[this.id] = this;
                        this.users = [];
                        this.wards = {};
                        this.monsters = {};
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
    removeWard:     function(id) {
                        this.cleanup();
                        var ward = this.wards[id];
                        if(ward == undefined) {
                            throw new util.Exception(util.error.invalid_ward);
                        }
                        delete this.wards[id];
                    },
    cleanup:        function() {
                        var time = (new Date()).getTime();
                        for(var id in this.wards) {
                            if(this.wards[id].time < time) {
                                delete this.wards[id];
                            }
                        }
                        for(var id in this.monsters) {
                            if(this.monsters[id] < time) {
                                delete this.monsters[id];
                            }
                        }
                    },
    killMonster:    function(id, time) {
                        if(time - 10000 > (new Date()).getTime()) {
                            throw new util.Exception(util.error.invalid_time);
                        }
                        var respawn = monster.respawn[id];
                        if(respawn == undefined) {
                            throw new util.Exception(util.error.invalid_monster);
                        }
                        time += respawn*60*60*1000;
                        this.monsters[id] = time;
                        return time;
                    },
    reset:          function() {
                        this.monsters = {};
                        this.wards = {};
                    },
    VOCALS:         ['a', 'e', 'i', 'o', 'u'],
    CONSONANTS:     ['b', 'c', 'd', 'f', 'g', 'k', 'l', 'm',
                     'n', 'p', 'r', 's', 't', 'w', 'x', 'z']
});

exports.Session.find = function(id) {
    return sessions[id];
}
