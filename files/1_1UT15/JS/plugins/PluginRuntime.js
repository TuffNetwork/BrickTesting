(function(global) {
	"use strict";

	function PluginRuntime() {
	}

	PluginRuntime.prototype.sanitizeSource = function(src) {
		var code = String(src || "");
		if(code.length > 0 && code.charCodeAt(0) === 0xFEFF) {
			code = code.substring(1);
		}
		if(code.indexOf("#!") === 0) {
			var nl = code.indexOf("\n");
			code = nl !== -1 ? code.substring(nl + 1) : "";
		}
		code = code.replace(/\u2028/g, "\n").replace(/\u2029/g, "\n");

		if(code.indexOf("\n") === -1 && (code.indexOf("\\n") !== -1 || code.indexOf("\\\"") !== -1)) {
			try {
				var decoded = JSON.parse("\"" + code
					.replace(/"/g, "\\\"")
					.replace(/\r/g, "\\r")
					.replace(/\n/g, "\\n") + "\"");
				if(typeof decoded === "string" && decoded.length > 0) {
					code = decoded;
				}
			}catch(e) {
			}
		}
		return code;
	};

	PluginRuntime.prototype.execute = function(pluginId, bundle, api, options) {
		options = options || {};
		var unsafe = !!options.unsafe;
		var meta = bundle.meta;
		var entryName = meta.entry;
		var entryCode = this.sanitizeSource(bundle.files[entryName]);
		var moduleObj = { exports: {} };
		var exportsObj = moduleObj.exports;

		var wrapped = "\"use strict\";\n" +
			String(entryCode) + "\n" +
			"return module.exports;";

		var factory;
		try {
			factory = new Function(
				"module",
				"exports",
				"api",
				"window",
				"document",
				"fetch",
				"WebSocket",
				"XMLHttpRequest",
				"navigator",
				"localStorage",
				"Function",
				wrapped
			);
		}catch(err) {
			throw new Error("Syntax error in " + entryName + ": " + (err && err.message ? err.message : String(err)));
		}

		factory(
			moduleObj,
			exportsObj,
			api,
			unsafe ? global["window"] : undefined,
			unsafe ? global["document"] : undefined,
			unsafe ? global["fetch"] : undefined,
			unsafe ? global["WebSocket"] : undefined,
			unsafe ? global["XMLHttpRequest"] : undefined,
			unsafe ? global["navigator"] : undefined,
			unsafe ? global["localStorage"] : undefined,
			unsafe ? global["Function"] : undefined
		);

		if(typeof moduleObj.exports !== "function") {
			throw new Error("Entry must export a function: module.exports = function(api) { ... }");
		}

		moduleObj.exports(api);
	};

	global["TuffPluginRuntime"] = PluginRuntime;
})(typeof window !== "undefined" ? window : self);
