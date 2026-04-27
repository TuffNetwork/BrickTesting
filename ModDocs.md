# Tuff Mods Documentation

This guide is for making `.tuff` mods in TuffClient. it's also for how to enable and manage the mods you installed.

## 1. What a `.tuff` file is

A `.tuff` file is JSON
It is made of two things:

- `meta` (mod info. ex. your username, minimum client version, etc.)
- `files` (your JS code, what you want the mod to do)

## 2. How to install a mod

1. Press `Right Shift`
2. Press `Add Mods` at the bottom
3. Pick one or more `.tuff` files
4. Press `Manage Mods` to enable, disable, uninstall, etc. Basically just manage the mods.

If a mod makes big changes, it can use `api.reloadClient()`. I added this because well: for a Fabric mod you always have to restart your game, so if your mod does something that will need a reload, use that.

## 3. Basic file format

```json
{
  "meta": {
    "id": "my-mod-id",
    "name": "My Mod",
    "version": "1.0.0",
    "author": "You",
    "entry": "main.js",
    "minClientVersion": "1.0.0",
    "permissions": ["hud", "events", "modules"]
  },
  "files": {
    "main.js": "module.exports = function(api){ api.log('loaded'); };"
  }
}
```

## 4. Rules your mod must pass

- `meta.id` must start with a letter or number, and only use letters, numbers, or - and _
- `meta.entry` must exist in `files` (thats the js file name. ex. `"main.js": "module.exports = function(api){ api.log('loaded'); };"`  here in that example it's main.js)
- `permissions` must be an strings. They tell the user what the mod does. What it changes.
- `minClientVersion` must not be newer than the client. If it is, it will fail to open.
- Entry must export a function:
  - `module.exports = function(api){ ... }` (you need to use the runtime API, or else my JS api won't work)

## 5. Things you can make

You can make a lot with this system, not only UI:

- HUD widgets (text, timers, status)
- PvP trainers (like WTap timing help)
- QoL tools (chat macros, key tools, view tools)
- Camera/perspective tools (freelook, third person stuff)
- Cosmetic changes and client side changes
- Settings saved per mod
- Tick based stuff and key based stuff

## 6. Events you can use for mods

- `tick` -> `{ now, delta }`
- `render2d` -> `{ ctx, width, height, partialTicks }`
- `keyDown` -> `{ keyCode, isRepeat }`
- `keyUp` -> `{ keyCode }`
- `attackEntity` -> `{ targetId, isPlayer, targetName?, reach? }`

## 7. Main API you get in mods

- `api.version`
- `api.on(event, fn)` / `api.off(event, fn)`
- `api.registerHUD(id, renderFn)` / `api.unregisterHUD(id)`
- `api.registerModule(def)`
- `api.getSetting(key, fallback)`
- `api.setSetting(key, value)`
- `api.drawText(ctx, text, x, y, opts?)`
- `api.toast(message, type?)`
- `api.log(...args)`

## 8. Client control API

These can change gameplay too:

- `api.setPerspective(mode)` where mode is `0`, `1`, `2`
- `api.getPerspective()`
- `api.setFreelookEnabled(bool)`
- `api.isFreelookEnabled()`
- `api.resetFreelook()`
- `api.sendChat(message)`
- `api.setSprint(bool)`
- `api.setSneak(bool)`
- `api.setHudHidden(bool)`
- `api.setGamma(number)`
- `api.setFov(number)`
- `api.reloadClient()`

## 9. Unsafe permission (full power mode)

If you add `"unsafe"` in permissions, your mod gets full power mode.

```json
"permissions": ["hud", "events", "modules", "unsafe"]
```

What it does:

- allows browser globals in runtime
- allows `eval` and `Function` (these allow you to do more complex things)
- allows `api.getUnsafeGlobal()`

Use this careful, because unsafe mods can change almost everything.

## 10. No cheat rule

Mods should stay legit:

1. HUD
2. trainers
3. cosmetics
4. QoL
These are safe examples

Do not make cheat mods: aim assist, velocity, auto clickers or unfair reach.

## Rendering mods (HUD + view stuff)

Rendering mods are mods that change what the player views on their screen, without changing server.

### What you can do

- Make custom text and status on screen with `api.registerHUD(...)`
- Update visuals every frame with the `render2d` event
- React every tick with the `tick` event
- Change camera/view settings:
  - `api.setPerspective(mode)` (`0` first person, `1` third person back, `2` third person front)
  - `api.setFreelookEnabled(bool)`
  - `api.resetFreelook()`
- Control entity culling for non-player entities:
  - `api.setMobCullingEnabled(bool)`
  - `api.setMobCullingDistance(number)`

Players are rendered normal. Culling only affects non-player entities.

### Simple HUD render example

```js
module.exports = function(api){
  api.registerHUD("my-hud", function(ctx){
    if(!ctx) return;
    api.drawText(ctx, "My Render Mod Active", 10, 20, {
      color: "#ffffff",
      font: "16px monospace"
    });
  });
};

## 12. Example 1: Hello HUD

```json
{
  "meta": {
    "id": "hello-hud",
    "name": "Hello HUD",
    "version": "1.0.0",
    "author": "Community",
    "entry": "main.js",
    "minClientVersion": "1.0.0",
    "permissions": ["hud", "events", "modules"]
  },
  "files": {
    "main.js": "module.exports = function(api){ api.registerHUD('hello', function(ctx){ if(!ctx) return; api.drawText(ctx, 'Tuff Mod Loaded', 10, 20, { color: '#ffffff', font: '16px monospace' }); }); };"
  }
}
```

## 13. Example 2: Freelook toggle (first person)

```json
{
  "meta": {
    "id": "freelook-toggle",
    "name": "Freelook Toggle",
    "version": "1.0.0",
    "author": "Community",
    "entry": "main.js",
    "minClientVersion": "1.0.0",
    "permissions": ["hud", "events", "modules"]
  },
  "files": {
    "main.js": "module.exports = function(api){ var key=46; var on=false; api.on('keyDown', function(e){ if(e.keyCode===key && !e.isRepeat){ on=!on; api.setFreelookEnabled(on); if(!on){ api.resetFreelook(); } } }); api.registerHUD('free', function(ctx){ if(!ctx||!on) return; api.drawText(ctx, 'Freelook ON', 10, 40, { color:'#aaffaa', font:'16px monospace' }); }); };"
  }
}
```

## 14. Example 3: Quick chat macro

```json
{
  "meta": {
    "id": "quick-gg",
    "name": "Quick GG",
    "version": "1.0.0",
    "author": "Community",
    "entry": "main.js",
    "minClientVersion": "1.0.0",
    "permissions": ["hud", "events", "modules"]
  },
  "files": {
    "main.js": "module.exports = function(api){ var key=34; api.on('keyDown', function(e){ if(e.keyCode===key && !e.isRepeat){ api.sendChat('gg'); api.toast('Sent: gg'); } }); };"
  }
}
```

## 15. Debug tips

- If install fails read the stacktrace in the text popup.
- Keep `main.js` small at first and then if it works make it bigger
- Check JSON commas, etc.
- Check `meta.entry` file name exactly matches.
- If a mod acts weird, reload once and test again.
