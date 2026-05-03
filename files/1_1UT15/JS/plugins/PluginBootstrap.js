(function(global) {
	"use strict";

	function noop() {}

	function createUI(bootstrap) {
		var doc = global.document;
		if(!doc) {
			return { open: noop, log: noop, refresh: noop };
		}

		var modal = doc.createElement("div");
		modal.style.position = "fixed";
		modal.style.left = "0";
		modal.style.top = "0";
		modal.style.right = "0";
		modal.style.bottom = "0";
		modal.style.background = "rgba(0,0,0,0.6)";
		modal.style.zIndex = "2147483647";
		modal.style.display = "none";

		var panel = doc.createElement("div");
		panel.style.width = "min(820px, 95vw)";
		panel.style.maxHeight = "85vh";
		panel.style.overflow = "auto";
		panel.style.margin = "5vh auto";
		panel.style.background = "#111";
		panel.style.color = "#ddd";
		panel.style.padding = "14px";
		panel.style.border = "1px solid #444";
		panel.style.fontFamily = "monospace";
		panel.style.borderRadius = "8px";
		modal.appendChild(panel);

		var heading = doc.createElement("div");
		heading.textContent = "Tuff Plugin Manager";
		heading.style.fontSize = "18px";
		heading.style.marginBottom = "10px";
		panel.appendChild(heading);

		var topRow = doc.createElement("div");
		topRow.style.display = "flex";
		topRow.style.gap = "8px";
		topRow.style.marginBottom = "10px";
		panel.appendChild(topRow);

		var addBtn = doc.createElement("button");
		addBtn.textContent = "Add Mods";
		topRow.appendChild(addBtn);

		var closeBtn = doc.createElement("button");
		closeBtn.textContent = "Close";
		topRow.appendChild(closeBtn);

		var fileInput = doc.createElement("input");
		fileInput.type = "file";
		fileInput.accept = ".tuff";
		fileInput.multiple = true;
		fileInput.style.display = "none";
		panel.appendChild(fileInput);

		var logBox = doc.createElement("pre");
		logBox.style.background = "#181818";
		logBox.style.border = "1px solid #333";
		logBox.style.padding = "8px";
		logBox.style.minHeight = "90px";
		logBox.style.whiteSpace = "pre-wrap";
		panel.appendChild(logBox);

		var listTitle = doc.createElement("div");
		listTitle.textContent = "Installed Plugins";
		listTitle.style.margin = "10px 0 6px";
		panel.appendChild(listTitle);

		var listWrap = doc.createElement("div");
		panel.appendChild(listWrap);

		function log(msg) {
			logBox.textContent += msg + "\n";
			logBox.scrollTop = logBox.scrollHeight;
		}

		function downloadText(name, text) {
			var blob = new Blob([text], { type: "application/json;charset=utf-8" });
			var url = URL.createObjectURL(blob);
			var a = doc.createElement("a");
			a.href = url;
			a.download = name;
			a.click();
			setTimeout(function() {
				URL.revokeObjectURL(url);
			}, 500);
		}

		function refresh() {
			listWrap.innerHTML = "";
			var list = bootstrap.listInstalled();
			if(list.length === 0) {
				listWrap.textContent = "No plugins installed.";
				return;
			}
			for(var i = 0; i < list.length; ++i) {
				(function(item) {
					var row = doc.createElement("div");
					row.style.display = "grid";
					row.style.gridTemplateColumns = "1fr auto auto auto";
					row.style.gap = "6px";
					row.style.alignItems = "center";
					row.style.padding = "6px";
					row.style.borderTop = "1px solid #2a2a2a";

					var info = doc.createElement("div");
					var nm = item.meta && item.meta.name ? item.meta.name : item.id;
					var ver = item.meta && item.meta.version ? item.meta.version : "?";
					info.textContent = nm + " (" + item.id + ") v" + ver;
					row.appendChild(info);

					var toggle = doc.createElement("button");
					toggle.textContent = item.enabled ? "Disable" : "Enable";
					toggle.onclick = function() {
						try {
							if(item.enabled) {
								bootstrap.disable(item.id);
								log("Disabled: " + item.id);
							}else {
								bootstrap.enable(item.id);
								log("Enabled: " + item.id);
							}
							refresh();
						}catch(e) {
							log("Failed toggle " + item.id + ": " + e.message);
						}
					};
					row.appendChild(toggle);

					var uninstall = doc.createElement("button");
					uninstall.textContent = "Uninstall";
					uninstall.onclick = function() {
						bootstrap.uninstall(item.id);
						log("Uninstalled: " + item.id);
						refresh();
					};
					row.appendChild(uninstall);

					var exportBtn = doc.createElement("button");
					exportBtn.textContent = "Export";
					exportBtn.onclick = function() {
						var bundle = bootstrap.getBundle(item.id);
						if(!bundle) {
							log("Cannot export missing bundle: " + item.id);
							return;
						}
						downloadText(item.id + ".tuff", JSON.stringify(bundle, null, 2));
					};
					row.appendChild(exportBtn);

					listWrap.appendChild(row);
				})(list[i]);
			}
		}

		addBtn.onclick = function() {
			fileInput.value = "";
			fileInput.click();
		};

		closeBtn.onclick = function() {
			modal.style.display = "none";
		};

		fileInput.onchange = function() {
			var files = fileInput.files || [];
			if(files.length === 0) {
				return;
			}
			for(var i = 0; i < files.length; ++i) {
				(function(file) {
					bootstrap.installFromFile(file).then(function(res) {
						if(res.ok) {
							log("Installed + enabled: " + file.name + " -> " + res.id);
						}else {
							log("Failed: " + file.name + " -> " + res.error);
						}
						refresh();
					});
				})(files[i]);
			}
		};

		doc.body.appendChild(modal);

		return {
			open: function() {
				modal.style.display = "block";
				refresh();
			},
			log: log,
			refresh: refresh
		};
	}

	function ensureRenderCanvas() {
		if(global["__tuffPluginHudCanvas"]) {
			return global["__tuffPluginHudCanvas"];
		}
		if(!global.document) {
			return null;
		}
		var canvas = global.document.createElement("canvas");
		canvas.style.position = "fixed";
		canvas.style.left = "0";
		canvas.style.top = "0";
		canvas.style.width = "100%";
		canvas.style.height = "100%";
		canvas.style.pointerEvents = "none";
		canvas.style.zIndex = "999999";
		global.document.body.appendChild(canvas);
		global["__tuffPluginHudCanvas"] = canvas;
		return canvas;
	}

	function createBootstrap() {
		var EventBus = global["TuffPluginEventBus"];
		var PluginRuntime = global["TuffPluginRuntime"];
		var PluginManager = global["TuffPluginManager"];
		var createPluginAPI = global["TuffCreatePluginAPI"];
		if(!EventBus || !PluginRuntime || !PluginManager || !createPluginAPI) {
			throw new Error("Plugin runtime files missing");
		}

		var eventBus = new EventBus();
		var runtime = new PluginRuntime();
		var manager = new PluginManager(eventBus, runtime, global["__tuffClientVersion"] || "0.0.0");
		var ui;
		var lastTick = 0;

		function apiFactory(pluginId) {
			return createPluginAPI(pluginId, eventBus, manager);
		}

		eventBus.on("render2d", function(payload) {
			manager.renderHUD(payload || {});
		}, "core");

		return {
			eventBus: eventBus,
			manager: manager,
			init: function(clientVersion) {
				manager.clientVersion = clientVersion || manager.clientVersion;
				if(!ui) {
					ui = createUI(this);
				}
				var enabled = manager.getEnabled();
				for(var i = 0; i < enabled.length; ++i) {
					try {
						manager.enable(enabled[i], apiFactory);
					}catch(e) {
						console.error("[Plugin " + enabled[i] + "] " + e.message);
					}
				}
			},
			openManager: function() {
				if(!ui) {
					ui = createUI(this);
				}
				ui.open();
			},
			installFromJsonString: function(jsonString) {
				var bundle;
				try {
					bundle = JSON.parse(jsonString);
				}catch(e) {
					return { ok: false, error: "Invalid .tuff JSON: " + (e && e.message ? e.message : String(e)) };
				}
				try {
					var id = manager.installBundle(bundle);
					manager.enable(id, apiFactory);
					if(ui) {
						ui.refresh();
					}
					return { ok: true, id: id };
				}catch(ex) {
					return { ok: false, error: ex && ex.message ? ex.message : String(ex) };
				}
			},
			installFromFile: function(file) {
				return new Promise(function(resolve) {
					var reader = new FileReader();
					reader.onload = function() {
						try {
							resolve(global["__tuffPlugins"]["installFromJsonString"](String(reader.result || "")));
						}catch(e) {
							resolve({ ok: false, error: e.message || String(e) });
						}
					};
					reader.onerror = function() {
						resolve({ ok: false, error: "Failed reading file" });
					};
					reader.readAsText(file);
				});
			},
			enable: function(id) {
				return manager.enable(id, apiFactory);
			},
			disable: function(id) {
				return manager.disable(id);
			},
			uninstall: function(id) {
				return manager.uninstall(id);
			},
			listInstalled: function() {
				return manager.listInstalled();
			},
			getBundle: function(id) {
				return manager.getBundle(id);
			},
			emitTick: function(now, delta) {
				var tickNow = typeof now === "number" ? now : Date.now();
				var tickDelta = typeof delta === "number" ? delta : (lastTick === 0 ? 0 : (tickNow - lastTick));
				lastTick = tickNow;
				eventBus.emit("tick", { now: tickNow, delta: tickDelta });
			},
			emitRender2d: function(width, height, partialTicks) {
				var canvas = ensureRenderCanvas();
				var ctx = null;
				if(canvas) {
					if(canvas.width !== width) canvas.width = width;
					if(canvas.height !== height) canvas.height = height;
					ctx = canvas.getContext("2d");
					if(ctx) {
						ctx.clearRect(0, 0, width, height);
					}
				}
				eventBus.emit("render2d", { ctx: ctx, width: width, height: height, partialTicks: partialTicks });
			},
			emitKeyDown: function(keyCode, isRepeat) {
				eventBus.emit("keyDown", { keyCode: keyCode, isRepeat: !!isRepeat });
			},
			emitKeyUp: function(keyCode) {
				eventBus.emit("keyUp", { keyCode: keyCode });
			},
			emitAttackEntity: function(targetId, isPlayer, targetName, reach) {
				eventBus.emit("attackEntity", {
					targetId: targetId,
					isPlayer: !!isPlayer,
					targetName: targetName || undefined,
					reach: reach
				});
			},
			emitChatReceive: function(message, senderName) {
				eventBus.emit("chatReceive", {
					message: message || "",
					sender: senderName || ""
				});
			},
			emitWorldJoin: function(serverIp, dimension) {
				eventBus.emit("worldJoin", {
					serverIp: serverIp || "",
					dimension: dimension || 0
				});
			},
			emitWorldLeave: function() {
				eventBus.emit("worldLeave", {});
			}
		};
	}

	global["TuffPluginBootstrapFactory"] = createBootstrap;

	if(!global["__tuffPlugins"]) {
		var bootstrap = createBootstrap();
		global["__tuffPlugins"] = {
			bootstrap: bootstrap,
			init: function(clientVersion) { bootstrap.init(clientVersion); },
			openManager: function() { bootstrap.openManager(); },
			installFromJsonString: function(jsonString) { return bootstrap.installFromJsonString(jsonString); },
			installFromFile: function(file) { return bootstrap.installFromFile(file); },
			enable: function(id) { return bootstrap.enable(id); },
			disable: function(id) { return bootstrap.disable(id); },
			uninstall: function(id) { return bootstrap.uninstall(id); },
			listInstalled: function() { return bootstrap.listInstalled(); },
			getBundle: function(id) { return bootstrap.getBundle(id); },
			emitTick: function(now, delta) { bootstrap.emitTick(now, delta); },
			emitRender2d: function(width, height, partialTicks) { bootstrap.emitRender2d(width, height, partialTicks); },
			emitKeyDown: function(keyCode, isRepeat) { bootstrap.emitKeyDown(keyCode, isRepeat); },
			emitKeyUp: function(keyCode) { bootstrap.emitKeyUp(keyCode); },
			emitAttackEntity: function(targetId, isPlayer, targetName, reach) {
				bootstrap.emitAttackEntity(targetId, isPlayer, targetName, reach);
			},
			emitChatReceive: function(message, senderName) {
				bootstrap.emitChatReceive(message, senderName);
			},
			emitWorldJoin: function(serverIp, dimension) {
				bootstrap.emitWorldJoin(serverIp, dimension);
			},
			emitWorldLeave: function() {
				bootstrap.emitWorldLeave();
			}
		};
	}
})(typeof window !== "undefined" ? window : self);
