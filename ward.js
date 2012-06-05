var util = require('./util.js');

exports.Ward = util.Class.extend({
    init:           function(x, y, allied, vision, time) {
                        if(time - 10000 > (new Date()).getTime()) {
                            throw new util.Exception(util.error.invalid_time);
                        }
                        this.x = x;
                        this.y = y;
                        this.allied = allied;
                        this.vision = vision;
                        this.time = time + 3*60*1000;
                    }
});
