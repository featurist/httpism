(function() {
    var self = this;
    var mergeInto;
    module.exports = mergeInto = function(x, y) {
        var r, gen1_items, gen2_i, ykey, gen3_items, gen4_i, xkey;
        if (x && y) {
            r = {};
            gen1_items = Object.keys(y);
            for (gen2_i = 0; gen2_i < gen1_items.length; ++gen2_i) {
                ykey = gen1_items[gen2_i];
                r[ykey] = y[ykey];
            }
            gen3_items = Object.keys(x);
            for (gen4_i = 0; gen4_i < gen3_items.length; ++gen4_i) {
                xkey = gen3_items[gen4_i];
                r[xkey] = x[xkey];
            }
            return r;
        } else if (y) {
            return y;
        } else {
            return x;
        }
    };
}).call(this);