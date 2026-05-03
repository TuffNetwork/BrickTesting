(function(global) {
	"use strict";

	function EventBus() {
		this.handlers = {};
	}

	EventBus.prototype.on = function(event, fn, pluginId) {
		if(typeof event !== "string" || typeof fn !== "function") {
			return;
		}
		if(!this.handlers[event]) {
			this.handlers[event] = [];
		}
		this.handlers[event].push({ fn: fn, pluginId: pluginId || "unknown" });
	};

	EventBus.prototype.off = function(event, fn) {
		var list = this.handlers[event];
		if(!list || typeof fn !== "function") {
			return;
		}
		for(var i = list.length - 1; i >= 0; --i) {
			if(list[i].fn === fn) {
				list.splice(i, 1);
			}
		}
	};

	EventBus.prototype.removePluginHandlers = function(pluginId) {
		var names = Object.keys(this.handlers);
		for(var i = 0; i < names.length; ++i) {
			var list = this.handlers[names[i]];
			for(var j = list.length - 1; j >= 0; --j) {
				if(list[j].pluginId === pluginId) {
					list.splice(j, 1);
				}
			}
		}
	};

	EventBus.prototype.emit = function(event, payload) {
		var list = this.handlers[event];
		if(!list || list.length === 0) {
			return;
		}
		var copy = list.slice(0);
		for(var i = 0; i < copy.length; ++i) {
			var entry = copy[i];
			try {
				entry.fn(payload);
			}catch(err) {
				console.error("[Plugin " + entry.pluginId + "] " + (err && err.message ? err.message : String(err)));
			}
		}
	};

	global["TuffPluginEventBus"] = EventBus;
})(typeof window !== "undefined" ? window : self);
