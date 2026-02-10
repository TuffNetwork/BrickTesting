(function () {
    var servers = [
        { addr: "wss://play.aethermc.cc", name: "§c§AetherMC" },
        { addr: "wss://tuffest.org", name: "§c§ltuffnet" },
        { addr: "wss://tuff.ws", name: "§c§ltuffnet" }
    ];

    var real = Object.defineProperty;
    Object.defineProperty = function (obj, prop, desc) {
        if (obj === window && prop === "eaglercraftXOpts") {
            var get = desc.get, set = desc.set;
            if (get && set) {
                desc.set = function (v) {
                    set.call(this, v);
                    var opts = get.call(this);
                    if (opts) opts.servers = servers;
                };
            }
            Object.defineProperty = real;
        }
        return real.call(this, obj, prop, desc);
    };
})();
