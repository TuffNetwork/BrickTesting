(function(global) {
	"use strict";

	function createPluginAPI(pluginId, eventBus, manager) {
		var hasUnsafe = manager.hasPermission(pluginId, "unsafe");
		return {
			version: manager.clientVersion,
			on: function(event, fn) {
				eventBus.on(event, fn, pluginId);
			},
			off: function(event, fn) {
				eventBus.off(event, fn);
			},
			registerHUD: function(id, renderFn) {
				manager.registerHUD(pluginId, id, renderFn);
			},
			unregisterHUD: function(id) {
				manager.unregisterHUD(pluginId, id);
			},
			registerModule: function(def) {
				return manager.registerModule(pluginId, def);
			},
			getSetting: function(key, fallback) {
				return manager.getPluginSetting(pluginId, key, fallback);
			},
			setSetting: function(key, value) {
				manager.setPluginSetting(pluginId, key, value);
			},
			setPerspective: function(mode) {
				return manager.setPerspective(mode);
			},
			getPerspective: function() {
				return manager.getPerspective();
			},
			setFreelookEnabled: function(enabled) {
				return manager.setFreelookEnabled(enabled);
			},
			isFreelookEnabled: function() {
				return manager.isFreelookEnabled();
			},
			resetFreelook: function() {
				return manager.resetFreelook();
			},
			reloadClient: function() {
				return manager.requestClientReload();
			},
			sendChat: function(message) {
				return manager.sendChatMessage(message);
			},
			setSprint: function(enabled) {
				return manager.setSprint(enabled);
			},
			setSneak: function(enabled) {
				return manager.setSneak(enabled);
			},
			setHudHidden: function(hidden) {
				return manager.setHudHidden(hidden);
			},
			setGamma: function(gamma) {
				return manager.setGamma(gamma);
			},
			setFov: function(fov) {
				return manager.setFov(fov);
			},
			setMobCullingEnabled: function(enabled) {
				return manager.setMobCullingEnabled(enabled);
			},
			setMobCullingDistance: function(distance) {
				return manager.setMobCullingDistance(distance);
			},
			hasPermission: function(permission) {
				return manager.hasPermission(pluginId, permission);
			},
			getUnsafeGlobal: function() {
				if(!hasUnsafe) {
					return undefined;
				}
				return global;
			},
			drawText: function(ctx, text, x, y, opts) {
				if(!ctx || typeof ctx.fillText !== "function") {
					return;
				}
				opts = opts || {};
				if(opts.font) {
					ctx.font = opts.font;
				}
				if(opts.color) {
					ctx.fillStyle = opts.color;
				}
				ctx.fillText(String(text), x, y);
			},
			toast: function(message, type) {
				manager.toast("[" + (type || "info") + "] " + String(message));
			},
			log: function() {
				var args = Array.prototype.slice.call(arguments);
				args.unshift("[Plugin " + pluginId + "]");
				console.log.apply(console, args);
			}
		};
	}

	global["TuffCreatePluginAPI"] = createPluginAPI;
})(typeof window !== "undefined" ? window : self);
