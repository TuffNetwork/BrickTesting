(function () {
    var servers = [
        { addr: "wss://play.aethermc.cc", name: "§c§lAetherMC" },
        { addr: "wss://tuffest.org", name: "§c§ltuffnet" },
        { addr: "wss://tuff.ws", name: "§c§ltuffnet" }
    ];

    var internalValue;

    Object.defineProperty(window, "eaglercraftXOpts", {
        configurable: true,
        enumerable: true,
        get: function () {
            return internalValue;
        },
        set: function (v) {
            if (v && typeof v === "object") {
                v.servers = servers;
            }
            internalValue = v;
        }
    });

    if (window.eaglercraftXOpts) {
        window.eaglercraftXOpts.servers = servers;
    }
})();
