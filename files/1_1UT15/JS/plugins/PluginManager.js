(function(global) {
	"use strict";

	var INDEX_KEY = "tuff.plugins.index";
	var ENABLED_KEY = "tuff.plugins.enabled";
	var PLUGIN_PREFIX = "tuff.plugins.";
	var SETTINGS_PREFIX = "tuff.pluginSettings.";
	var ID_PATTERN = /^[a-z0-9][a-z0-9-_]{2,40}$/i;

	function parseJSON(raw, fallback) {
		if(typeof raw !== "string" || raw.length === 0) {
			return fallback;
		}
		try {
			return JSON.parse(raw);
		}catch(e) {
			return fallback;
		}
	}

	function arrayUnique(list) {
		var out = [];
		for(var i = 0; i < list.length; ++i) {
			if(out.indexOf(list[i]) === -1) {
				out.push(list[i]);
			}
		}
		return out;
	}

	function extractVersionParts(v) {
		var str = String(v || "");
		var match = str.match(/\d+(?:\.\d+)*/);
		if(!match) {
			return [0];
		}
		var parts = match[0].split(".");
		var out = [];
		for(var i = 0; i < parts.length; ++i) {
			out.push(parseInt(parts[i], 10) || 0);
		}
		return out;
	}

	function compareVersions(a, b) {
		var aa = extractVersionParts(a);
		var bb = extractVersionParts(b);
		var len = aa.length > bb.length ? aa.length : bb.length;
		for(var i = 0; i < len; ++i) {
			var av = i < aa.length ? aa[i] : 0;
			var bv = i < bb.length ? bb[i] : 0;
			if(av < bv) return -1;
			if(av > bv) return 1;
		}
		return 0;
	}

	function PluginManager(eventBus, runtime, clientVersion) {
		this.eventBus = eventBus;
		this.runtime = runtime;
		this.clientVersion = clientVersion || "0.0.0";
		this.loaded = {};
		this.hudRegistry = {};
		this.moduleRegistry = {};
	}

	PluginManager.prototype.getStorage = function() {
		return global["localStorage"];
	};

	PluginManager.compareVersions = compareVersions;

	PluginManager.prototype.toast = function(msg) {
		console.log("[Plugins] " + msg);
	};

	PluginManager.prototype.getClientBridge = function() {
		return global["__tuffClientBridge"] || null;
	};

	PluginManager.prototype.ensureClientControl = function() {
		var control = global["__tuffClientControl"];
		if(!control || typeof control !== "object") {
			control = {};
			global["__tuffClientControl"] = control;
		}
		return control;
	};

	PluginManager.prototype.hasPermission = function(pluginId, permission) {
		var bundle = this.getBundle(pluginId);
		if(!bundle || !bundle.meta || !Array.isArray(bundle.meta.permissions)) {
			return false;
		}
		return bundle.meta.permissions.indexOf(permission) !== -1;
	};

	PluginManager.prototype.setPerspective = function(mode) {
		var bridge = this.getClientBridge();
		if(!bridge || typeof bridge.setPerspective !== "function") {
			return false;
		}
		bridge.setPerspective(mode);
		return true;
	};

	PluginManager.prototype.getPerspective = function() {
		var bridge = this.getClientBridge();
		if(!bridge || typeof bridge.getPerspective !== "function") {
			return 0;
		}
		return bridge.getPerspective() | 0;
	};

	PluginManager.prototype.setFreelookEnabled = function(enabled) {
		var bridge = this.getClientBridge();
		if(!bridge || typeof bridge.setFreelook !== "function") {
			return false;
		}
		bridge.setFreelook(!!enabled);
		return true;
	};

	PluginManager.prototype.isFreelookEnabled = function() {
		var bridge = this.getClientBridge();
		if(!bridge || typeof bridge.isFreelook !== "function") {
			return false;
		}
		return !!bridge.isFreelook();
	};

	PluginManager.prototype.resetFreelook = function() {
		var bridge = this.getClientBridge();
		if(!bridge || typeof bridge.resetFreelook !== "function") {
			return false;
		}
		bridge.resetFreelook();
		return true;
	};

	PluginManager.prototype.requestClientReload = function() {
		if(global["location"] && typeof global["location"]["reload"] === "function") {
			global["location"]["reload"]();
			return true;
		}
		return false;
	};

	PluginManager.prototype.sendChatMessage = function(message) {
		var control = this.ensureClientControl();
		control.chatMessage = String(message == null ? "" : message);
		return true;
	};

	PluginManager.prototype.setSprint = function(enabled) {
		var control = this.ensureClientControl();
		control.sprintRequest = enabled ? 1 : 0;
		return true;
	};

	PluginManager.prototype.setSneak = function(enabled) {
		var control = this.ensureClientControl();
		control.sneakRequest = enabled ? 1 : 0;
		return true;
	};

	PluginManager.prototype.setHudHidden = function(hidden) {
		var control = this.ensureClientControl();
		control.hideGuiRequest = hidden ? 1 : 0;
		return true;
	};

	PluginManager.prototype.setGamma = function(gamma) {
		var n = Number(gamma);
		if(!isFinite(n)) {
			return false;
		}
		var control = this.ensureClientControl();
		control.gammaRequest = n;
		return true;
	};

	PluginManager.prototype.setFov = function(fov) {
		var n = Number(fov);
		if(!isFinite(n)) {
			return false;
		}
		var control = this.ensureClientControl();
		control.fovRequest = n;
		return true;
	};

	PluginManager.prototype.setMobCullingEnabled = function(enabled) {
		var control = this.ensureClientControl();
		control.mobCullingRequest = enabled ? 1 : 0;
		return true;
	};

	PluginManager.prototype.setMobCullingDistance = function(distance) {
		var n = Number(distance);
		if(!isFinite(n)) {
			return false;
		}
		var control = this.ensureClientControl();
		control.mobCullingDistanceRequest = n;
		return true;
	};

	PluginManager.prototype.getIndex = function() {
		var storage = this.getStorage();
		return storage ? parseJSON(storage.getItem(INDEX_KEY), []) : [];
	};

	PluginManager.prototype.saveIndex = function(ids) {
		var storage = this.getStorage();
		if(storage) {
			storage.setItem(INDEX_KEY, JSON.stringify(arrayUnique(ids)));
		}
	};

	PluginManager.prototype.getEnabled = function() {
		var storage = this.getStorage();
		return storage ? parseJSON(storage.getItem(ENABLED_KEY), []) : [];
	};

	PluginManager.prototype.saveEnabled = function(ids) {
		var storage = this.getStorage();
		if(storage) {
			storage.setItem(ENABLED_KEY, JSON.stringify(arrayUnique(ids)));
		}
	};

	PluginManager.prototype.getBundle = function(id) {
		var storage = this.getStorage();
		return storage ? parseJSON(storage.getItem(PLUGIN_PREFIX + id), null) : null;
	};

	PluginManager.prototype.setBundle = function(id, bundle) {
		var storage = this.getStorage();
		if(storage) {
			storage.setItem(PLUGIN_PREFIX + id, JSON.stringify(bundle));
		}
	};

	PluginManager.prototype.validateBundle = function(bundle) {
		if(!bundle || typeof bundle !== "object") {
			throw new Error("Bundle JSON must be an object");
		}
		if(!bundle.meta || typeof bundle.meta !== "object") {
			throw new Error("Missing meta object");
		}
		if(!bundle.files || typeof bundle.files !== "object") {
			throw new Error("Missing files object");
		}

		var meta = bundle.meta;
		if(!ID_PATTERN.test(meta.id || "")) {
			throw new Error("meta.id must match /^[a-z0-9][a-z0-9-_]{2,40}$/i");
		}
		if(typeof meta.name !== "string" || !meta.name) {
			throw new Error("meta.name is required");
		}
		if(typeof meta.version !== "string" || !meta.version) {
			throw new Error("meta.version is required");
		}
		if(typeof meta.author !== "string" || !meta.author) {
			throw new Error("meta.author is required");
		}
		if(typeof meta.entry !== "string" || !meta.entry) {
			throw new Error("meta.entry is required");
		}
		if(typeof bundle.files[meta.entry] !== "string") {
			throw new Error("meta.entry must exist in files");
		}
		if(!Array.isArray(meta.permissions)) {
			throw new Error("meta.permissions must be an array of strings");
		}
		for(var i = 0; i < meta.permissions.length; ++i) {
			if(typeof meta.permissions[i] !== "string") {
				throw new Error("meta.permissions must be an array of strings");
			}
		}
		if(meta.minClientVersion && compareVersions(this.clientVersion, meta.minClientVersion) < 0) {
			throw new Error("Plugin requires client version " + meta.minClientVersion + " or newer");
		}
		if(!/module\.exports\s*=/.test(bundle.files[meta.entry])) {
			throw new Error("Entry must use CommonJS module.exports");
		}
		var hasUnsafePermission = meta.permissions.indexOf("unsafe") !== -1;
		if(!hasUnsafePermission && /\beval\s*\(/.test(bundle.files[meta.entry])) {
			throw new Error("eval is not allowed in plugin entry");
		}
		if(!hasUnsafePermission && /\bFunction\s*\(/.test(bundle.files[meta.entry])) {
			throw new Error("Function constructor is not allowed in plugin entry");
		}
	};

	PluginManager.prototype.installBundle = function(bundle) {
		this.validateBundle(bundle);
		var id = bundle.meta.id;
		this.setBundle(id, bundle);
		var index = this.getIndex();
		if(index.indexOf(id) === -1) {
			index.push(id);
			this.saveIndex(index);
		}
		return id;
	};

	PluginManager.prototype.registerHUD = function(pluginId, hudId, renderFn) {
		if(typeof hudId !== "string" || typeof renderFn !== "function") {
			return;
		}
		this.hudRegistry[pluginId + ":" + hudId] = { pluginId: pluginId, id: hudId, renderFn: renderFn };
	};

	PluginManager.prototype.unregisterHUD = function(pluginId, hudId) {
		delete this.hudRegistry[pluginId + ":" + hudId];
	};

	PluginManager.prototype.registerModule = function(pluginId, def) {
		if(!Array.isArray(this.moduleRegistry[pluginId])) {
			this.moduleRegistry[pluginId] = [];
		}
		this.moduleRegistry[pluginId].push(def || {});
		return def;
	};

	PluginManager.prototype.clearPluginRuntimeState = function(pluginId) {
		for(var key in this.hudRegistry) {
			if(Object.prototype.hasOwnProperty.call(this.hudRegistry, key) && this.hudRegistry[key].pluginId === pluginId) {
				delete this.hudRegistry[key];
			}
		}
		delete this.moduleRegistry[pluginId];
		delete this.loaded[pluginId];
		this.eventBus.removePluginHandlers(pluginId);
	};

	PluginManager.prototype.getPluginSettingsObj = function(pluginId) {
		var storage = this.getStorage();
		return storage ? parseJSON(storage.getItem(SETTINGS_PREFIX + pluginId), {}) : {};
	};

	PluginManager.prototype.getPluginSetting = function(pluginId, key, fallback) {
		var obj = this.getPluginSettingsObj(pluginId);
		return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : fallback;
	};

	PluginManager.prototype.setPluginSetting = function(pluginId, key, value) {
		var obj = this.getPluginSettingsObj(pluginId);
		obj[key] = value;
		var storage = this.getStorage();
		if(storage) {
			storage.setItem(SETTINGS_PREFIX + pluginId, JSON.stringify(obj));
		}
	};

	PluginManager.prototype.enable = function(id, apiFactory) {
		var bundle = this.getBundle(id);
		if(!bundle) {
			throw new Error("Plugin not found: " + id);
		}
		this.validateBundle(bundle);

		var enabled = this.getEnabled();
		if(enabled.indexOf(id) === -1) {
			enabled.push(id);
			this.saveEnabled(enabled);
		}

		if(this.loaded[id]) {
			return;
		}
		var api = apiFactory(id);
		this.runtime.execute(id, bundle, api, {
			unsafe: this.hasPermission(id, "unsafe")
		});
		this.loaded[id] = true;
	};

	PluginManager.prototype.disable = function(id) {
		var enabled = this.getEnabled();
		var idx = enabled.indexOf(id);
		if(idx !== -1) {
			enabled.splice(idx, 1);
			this.saveEnabled(enabled);
		}
		this.clearPluginRuntimeState(id);
	};

	PluginManager.prototype.uninstall = function(id) {
		this.disable(id);
		var index = this.getIndex();
		var idx = index.indexOf(id);
		if(idx !== -1) {
			index.splice(idx, 1);
			this.saveIndex(index);
		}
		var storage = this.getStorage();
		if(storage) {
			storage.removeItem(PLUGIN_PREFIX + id);
			storage.removeItem(SETTINGS_PREFIX + id);
		}
	};

	PluginManager.prototype.listInstalled = function() {
		var index = this.getIndex();
		var enabled = this.getEnabled();
		var out = [];
		for(var i = 0; i < index.length; ++i) {
			var id = index[i];
			var bundle = this.getBundle(id);
			out.push({
				id: id,
				enabled: enabled.indexOf(id) !== -1,
				meta: bundle && bundle.meta ? bundle.meta : null
			});
		}
		return out;
	};

	PluginManager.prototype.renderHUD = function(payload) {
		for(var key in this.hudRegistry) {
			if(!Object.prototype.hasOwnProperty.call(this.hudRegistry, key)) {
				continue;
			}
			var item = this.hudRegistry[key];
			try {
				item.renderFn(payload && payload.ctx, payload);
			}catch(err) {
				console.error("[Plugin " + item.pluginId + "] " + (err && err.message ? err.message : String(err)));
			}
		}
	};

	global["TuffPluginManager"] = PluginManager;
})(typeof window !== "undefined" ? window : self);
