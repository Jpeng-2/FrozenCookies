// Add polyfills:
(function (global) {
  const global_isFinite = global.isFinite;
  Object.defineProperty(Number, "isFinite", {
    value: function isFinite(value) {
      return typeof value === "number" && global_isFinite(value);
    },
    configurable: true,
    enumerable: false,
    writable: true,
  });
})(this);

function registerMod(mod_id = "frozen_cookies") {
  Game.registerMod(mod_id, {
    init: function () {
      Game.registerHook("reincarnate", function () {
        if (FrozenCookies.autoBulk != 0) {
          if (FrozenCookies.autoBulk == 1) {
            document.getElementById("storeBulk10")?.click();
          }
          if (FrozenCookies.autoBulk == 2) {
            document.getElementById("storeBulk100")?.click();
          }
        }
      });
      Game.registerHook("draw", updateTimers);
      Game.registerHook("ticker", function () {
        return [
          "News: Debate about whether using Frozen Cookies constitutes cheating continues to rage. Violence escalating.",
          "News: Supreme Court rules Frozen Cookies not unauthorized cheating after all.",
        ];
      });
      Game.registerHook("reset", function (hard) {
        if (hard) {
          emptyCaches();
        }
      });
    },
    save: saveFCData,
    load: setOverrides,
  });

  if (!FrozenCookies.loadedData) {
    setOverrides();
  }
  logEvent(
    "Load",
    "Initial Load of Frozen Cookies v " +
      FrozenCookies.branch +
      "." +
      FrozenCookies.version +
      ". (You should only ever see this once.)"
  );
}

function setOverrides(gameSaveData) {
  if (gameSaveData) {
    FrozenCookies.loadedData = JSON.parse(gameSaveData);
  } else {
    FrozenCookies.loadedData = {};
  }
  loadFCData();
  FrozenCookies.frequency = 100;
  FrozenCookies.efficiencyWeight = 1.0;
  FrozenCookies.timeTravelAmount = 0;
  FrozenCookies.autobuyCount = 0;

  FrozenCookies.hc_gain = 0;
  FrozenCookies.hc_gain_time = Date.now();
  FrozenCookies.last_gc_state =
    (Game.hasBuff("Frenzy") ? Game.buffs["Frenzy"].multCpS : 1) *
    clickBuffBonus();
  FrozenCookies.last_gc_time = Date.now();
  FrozenCookies.lastCPS = Game.cookiesPs;
  FrozenCookies.lastBaseCPS = Game.cookiesPs;
  FrozenCookies.lastCookieCPS = 0;
  FrozenCookies.lastUpgradeCount = 0;
  FrozenCookies.currentBank = { cost: 0, efficiency: 0 };
  FrozenCookies.targetBank = { cost: 0, efficiency: 0 };
  FrozenCookies.disabledPopups = true;
  FrozenCookies.trackedStats = [];
  FrozenCookies.lastGraphDraw = 0;
  FrozenCookies.calculatedCpsByType = {};

  FrozenCookies.processing = false;
  FrozenCookies.priceReductionTest = false;

  FrozenCookies.cookieBot = 0;
  FrozenCookies.autoclickBot = 0;
  FrozenCookies.autoFrenzyBot = 0;
  FrozenCookies.frenzyClickBot = 0;

  FrozenCookies.smartTrackingBot = 0;
  FrozenCookies.minDelay = 1000 * 10;
  FrozenCookies.delayPurchaseCount = 0;

  emptyCaches();

  FrozenCookies.showAchievements = true;

  if (!blacklist[FrozenCookies.blacklist]) {
    FrozenCookies.blacklist = 0;
  }

  if (!window.App) window.App = undefined;

  Beautify = fcBeautify;
  Game.sayTime = function (time, detail) {
    return timeDisplay(time / Game.fps);
  };
  if (typeof Game.tooltip.oldDraw != "function") {
    Game.tooltip.oldDraw = Game.tooltip.draw;
    Game.tooltip.draw = fcDraw;
  }
  if (typeof Game.oldReset != "function") {
    Game.oldReset = Game.Reset;
    Game.Reset = fcReset;
  }
  Game.Win = fcWin;

  nextPurchase(true);
  Game.RefreshStore();
  Game.RebuildUpgrades();
  beautifyUpgradesAndAchievements();

  eval(
    "Game.shimmerTypes.golden.popFunc = " +
      Game.shimmerTypes.golden.popFunc
        .toString()
        .replace(/Game\.Popup\((.+)\)\;/g, 'logEvent("GC", $1, true);')
  );
  eval(
    "Game.UpdateWrinklers = " +
      Game.UpdateWrinklers.toString().replace(
        /Game\.Popup\((.+)\)\;/g,
        'logEvent("Wrinkler", $1, true);'
      )
  );
  eval(
    "FrozenCookies.safeGainsCalc = " +
      Game.CalculateGains.toString()
        .replace(/eggMult\+=\(1.+/, "eggMult++; // CENTURY EGGS SUCK")
        .replace(/Game\.cookiesPs/g, "FrozenCookies.calculatedCps")
        .replace(/Game\.globalCpsMult/g, "mult")
  );

  if (!Game.HasAchiev("Third-party")) {
    Game.Win("Third-party");
  }

  function loadFCData() {
    _.keys(FrozenCookies.preferenceValues).forEach(function (preference) {
      FrozenCookies[preference] = preferenceParse(
        preference,
        FrozenCookies.preferenceValues[preference].default
      );
    });
    FrozenCookies.cookieClickSpeed = preferenceParse("cookieClickSpeed", 0);
    FrozenCookies.frenzyClickSpeed = preferenceParse("frenzyClickSpeed", 0);
    FrozenCookies.HCAscendAmount = preferenceParse("HCAscendAmount", 0);
    FrozenCookies.minCpSMult = preferenceParse("minCpSMult", 1);
    FrozenCookies.maxSpecials = preferenceParse("maxSpecials", 1);

    FrozenCookies.cursorMax = preferenceParse("cursorMax", 500);
    FrozenCookies.farmMax = preferenceParse("farmMax", 500);
    FrozenCookies.manaMax = preferenceParse("manaMax", 100);

    FrozenCookies.frenzyTimes =
      JSON.parse(
        FrozenCookies.loadedData["frenzyTimes"] ||
          localStorage.getItem("frenzyTimes")
      ) || {};
    FrozenCookies.lastHCAmount = preferenceParse("lastHCAmount", 0);
    FrozenCookies.lastHCTime = preferenceParse("lastHCTime", 0);
    FrozenCookies.prevLastHCTime = preferenceParse("prevLastHCTime", 0);
    FrozenCookies.maxHCPercent = preferenceParse("maxHCPercent", 0);
    if (Object.keys(FrozenCookies.loadedData).length > 0) {
      logEvent("Load", "Restored Frozen Cookies settings from previous save");
    }
  }

  function preferenceParse(setting, defaultVal) {
    var value = defaultVal;
    if (setting in FrozenCookies.loadedData) {
      value = FrozenCookies.loadedData[setting];
    } else if (localStorage.getItem(setting)) {
      value = localStorage.getItem(setting);
    }
    return Number(value);
  }
  FCStart();
}

function decodeHtml(html) {
  var txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

function emptyCaches() {
  FrozenCookies.recalculateCaches = true;
  FrozenCookies.caches = {};
  FrozenCookies.caches.nextPurchase = {};
  FrozenCookies.caches.recommendationList = [];
  FrozenCookies.caches.buildings = [];
  FrozenCookies.caches.upgrades = [];
}

function scientificNotation(value) {
  if (
    value === 0 ||
    !Number.isFinite(value) ||
    (Math.abs(value) >= 1 && Math.abs(value) <= 1000)
  ) {
    return rawFormatter(value);
  }
  value = parseFloat(value);
  value = value.toExponential(2);
  value = value.replace("+", "");
  return value;
}

var numberFormatters = [
  rawFormatter,
  formatEveryThirdPower([
    "",
    " million",
    " billion",
    " trillion",
    " quadrillion",
    " quintillion",
    " sextillion",
    " septillion",
    " octillion",
    " nonillion",
    " decillion",
    " undecillion",
    " duodecillion",
    " tredecillion",
    " quattuordecillion",
    " quindecillion",
    " sexdecillion",
    " septendecillion",
    " octodecillion",
    " novemdecillion",
    " vigintillion",
    " unvigintillion",
    " duovigintillion",
    " trevigintillion",
    " quattuorvigintillion",
    " quinvigintillion",
    " sexvigintillion",
    " septenvigintillion",
    " octovigintillion",
    " novemvigintillion",
    " trigintillion",
    " untrigintillion",
    " duotrigintillion",
    " tretrigintillion",
    " quattuortrigintillion",
    " quintrigintillion",
    " sextrigintillion",
    " septentrigintillion",
    " octotrigintillion",
    " novemtrigintillion",
  ]),

  formatEveryThirdPower([
    "",
    " M",
    " B",
    " T",
    " Qa",
    " Qi",
    " Sx",
    " Sp",
    " Oc",
    " No",
    " De",
    " UnD",
    " DoD",
    " TrD",
    " QaD",
    " QiD",
    " SxD",
    " SpD",
    " OcD",
    " NoD",
    " Vg",
    " UnV",
    " DoV",
    " TrV",
    " QaV",
    " QiV",
    " SxV",
    " SpV",
    " OcV",
    " NoV",
    " Tg",
    " UnT",
    " DoT",
    " TrT",
    " QaT",
    " QiT",
    " SxT",
    " SpT",
    " OcT",
    " NoT",
  ]),

  formatEveryThirdPower(["", " M", " G", " T", " P", " E", " Z", " Y"]),
  scientificNotation,
];

function fcBeautify(value) {
  var negative = value < 0;
  value = Math.abs(value);
  var formatter = numberFormatters[FrozenCookies.numberDisplay];
  var output = formatter(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return negative ? "-" + output : output;
}

function beautifyUpgradesAndAchievements() {
  function beautifyFn(str) {
    return Beautify(parseInt(str.replace(/,/, ""), 10));
  }

  var numre = /\d\d?\d?(?:,\d\d\d)*/;
  Object.values(Game.AchievementsById).forEach(function (ach) {
    ach.desc = ach.desc.replace(numre, beautifyFn);
  });

  Object.values(Game.UpgradesById).forEach(function (upg) {
    upg.desc = upg.desc.replace(numre, beautifyFn);
  });
}

function timeDisplay(seconds) {
  if (seconds === "---" || seconds === 0) {
    return "Done!";
  } else if (seconds == Number.POSITIVE_INFINITY) {
    return "Never!";
  }
  seconds = Math.floor(seconds);
  var days, hours, minutes;
  days = Math.floor(seconds / (24 * 60 * 60));
  days = days > 0 ? Beautify(days) + "d " : "";
  seconds %= 24 * 60 * 60;
  hours = Math.floor(seconds / (60 * 60));
  hours = hours > 0 ? hours + "h " : "";
  seconds %= 60 * 60;
  minutes = Math.floor(seconds / 60);
  minutes = minutes > 0 ? minutes + "m " : "";
  seconds %= 60;
  seconds = seconds > 0 ? seconds + "s" : "";
  return (days + hours + minutes + seconds).trim();
}

function fcDraw(from, text, origin) {
  if (typeof text == "string") {
    if (text.includes("Devastation")) {
      text = text.replace(
        /\+\d+\%/,
        "+" +
          Math.round((Game.hasBuff("Devastation").multClick - 1) * 100) +
          "%"
      );
    }
  }
  Game.tooltip.oldDraw(from, text, origin);
}

function fcReset() {
  Game.CollectWrinklers();
  if (Game.HasUnlocked("Chocolate egg") && !Game.Has("Chocolate egg")) {
    Game.ObjectsById.forEach(function (b) {
      b.sell(-1);
    });
    Game.Upgrades["Chocolate egg"].buy();
  }
  Game.oldReset();
  FrozenCookies.frenzyTimes = {};
  FrozenCookies.last_gc_state =
    (Game.hasBuff("Frenzy") ? Game.buffs["Frenzy"].multCpS : 1) *
    clickBuffBonus();
  FrozenCookies.last_gc_time = Date.now();
  FrozenCookies.lastHCAmount = Game.HowMuchPrestige(
    Game.cookiesEarned + Game.cookiesReset + wrinklerValue()
  );
  FrozenCookies.lastHCTime = Date.now();
  FrozenCookies.maxHCPercent = 0;
  FrozenCookies.prevLastHCTime = Date.now();
  FrozenCookies.lastCps = 0;
  FrozenCookies.lastBaseCps = 0;
  FrozenCookies.trackedStats = [];
  recommendationList(true);
}

function saveFCData() {
  var saveString = {};
  _.keys(FrozenCookies.preferenceValues).forEach(function (preference) {
    saveString[preference] = FrozenCookies[preference];
  });
  saveString.frenzyClickSpeed = FrozenCookies.frenzyClickSpeed;
  saveString.cookieClickSpeed = FrozenCookies.cookieClickSpeed;
  saveString.HCAscendAmount = FrozenCookies.HCAscendAmount;
  saveString.cursorMax = FrozenCookies.cursorMax;
  saveString.farmMax = FrozenCookies.farmMax;
  saveString.minCpSMult = FrozenCookies.minCpSMult;
  saveString.frenzyTimes = JSON.stringify(FrozenCookies.frenzyTimes);
  saveString.lastHCAmount = FrozenCookies.lastHCAmount;
  saveString.maxHCPercent = FrozenCookies.maxHCPercent;
  saveString.lastHCTime = FrozenCookies.lastHCTime;
  saveString.manaMax = FrozenCookies.manaMax;
  saveString.maxSpecials = FrozenCookies.maxSpecials;
  saveString.prevLastHCTime = FrozenCookies.prevLastHCTime;
  saveString.saveVersion = FrozenCookies.version;
  return JSON.stringify(saveString);
}

function divCps(value, cps) {
  var result = 0;
  if (value) {
    if (cps) {
      result = value / cps;
    } else {
      result = Number.POSITIVE_INFINITY;
    }
  }
  return result;
}

function nextHC(tg) {
  var futureHC = Math.ceil(
    Game.HowMuchPrestige(Game.cookiesEarned + Game.cookiesReset)
  );
  var nextHC = Game.HowManyCookiesReset(futureHC);
  var toGo = nextHC - (Game.cookiesEarned + Game.cookiesReset);
  return tg ? toGo : timeDisplay(divCps(toGo, Game.cookiesPs));
}

function copyToClipboard(text) {
  Game.promptOn = 1;
  window.prompt("Copy to clipboard: Ctrl+C, Enter", text);
  Game.promptOn = 0;
}

function getBuildingSpread() {
  return Game.ObjectsById.map(function (a) {
    return a.amount;
  }).join("/");
}

document.addEventListener("keydown", function (event) {
  if (!Game.promptOn) {
    if (event.keyCode == 65) {
      Game.Toggle("autoBuy", "autobuyButton", "Autobuy OFF", "Autobuy ON");
      toggleFrozen("autoBuy");
    }
    if (event.keyCode == 66) {
      copyToClipboard(getBuildingSpread());
    }
    if (event.keyCode == 67) {
      Game.Toggle(
        "autoGC",
        "autogcButton",
        "Autoclick GC OFF",
        "Autoclick GC ON"
      );
      toggleFrozen("autoGC");
    }
    if (event.keyCode == 69) {
      copyToClipboard(Game.WriteSave(true));
    }
    if (event.keyCode == 82) {
      Game.Reset();
    }
    if (event.keyCode == 83) {
      Game.WriteSave();
    }
    if (event.keyCode == 87) {
      Game.Notify(
        "Wrinkler Info",
        "Popping all wrinklers will give you " +
          Beautify(wrinklerValue()) +
          ' cookies. <input type="button" value="Click here to pop all wrinklers" onclick="Game.CollectWrinklers()"></input>',
        [19, 8],
        7
      );
    }
  }
});

function userInputPrompt(title, description, existingValue, callback) {
    Game.Prompt(`<h3>${title}</h3><div class="block" style="text-align:center;">${description}</div><div class="block"><input type="text" style="text-align:center;width:100%;" id="fcGenericInput" value="${existingValue}"/></div>`,
        [
            'Confirm',
            'Cancel'
        ]);
    $('#promptOption0').click(() => {callback(l('fcGenericInput').value)});
    l('fcGenericInput').focus();
    l('fcGenericInput').select();
}

function validateNumber(value, minValue = null, maxValue = null) {
    if (typeof value == "undefined" || value == null) {
          return false;
    }
    const numericValue = Number(value);
    return !isNaN(numericValue) &&
      (minValue == null || numericValue >= minValue) &&
      (maxValue == null || numericValue <= maxValue);
}

function storeNumberCallback(base, min, max) {
    return (result) => {
        if (!validateNumber(result, min, max)) {
            result = FrozenCookies[base];
        }
        FrozenCookies[base] = Number(result);
        FCStart();
    }
}

function updateSpeed(base) {
    userInputPrompt(
        'Autoclicking!',
        "How many times per second do you want to click? (Current maximum is 250 clicks per second)",
        FrozenCookies[base],
        storeNumberCallback(base, 0, 250)
    );
}

function updateCpSMultMin(base) {
    userInputPrompt(
        'Autocasting!',
        'What CpS multiplier should trigger Auto Casting (e.g. "7" will trigger when you have full mana and a Frenzy, "1" prevents triggering during a clot, etc.)?',
        FrozenCookies[base],
        storeNumberCallback(base, 0)
    );
}

function updateAscendAmount(base) {
    userInputPrompt(
        'Autoascending!',
        'How many heavenly chips do you want to auto-ascend at?',
        FrozenCookies[base],
        storeNumberCallback(base, 1)
    );
}

function updateManaMax(base) {
    userInputPrompt(
        'Mana Cap!',
        'Choose a maximum mana amount',
        FrozenCookies[base],
        storeNumberCallback(base, 0)
    );
}

function updateMaxSpecials(base) {
    userInputPrompt(
        'Harvest Bank!',
        'Set amount of stacked Building specials for Harvest Bank',
        FrozenCookies[base],
        storeNumberCallback(base, 0)
    );
}

function updateCursorMax(base) {
    userInputPrompt(
        'Cursor Cap!',
        'How many Cursors should Autobuy stop at?',
        FrozenCookies[base],
        storeNumberCallback(base, 0)
    );
}

function updateFarmMax(base) {
    userInputPrompt(
        'Farm Cap!',
        'How many Farms should Autobuy stop at?',
        FrozenCookies[base],
        storeNumberCallback(base, 0)
    );
}

function updateTimeTravelAmount() {
  userInputPrompt(
    'Time Travel!',
    "Warning: Time travel is highly unstable, and large values are highly likely to either cause long delays or crash the game. Be careful!\nHow much do you want to time travel by? This will happen instantly.",
    FrozenCookies.timeTravelAmount,
    storeNumberCallback('timeTravelAmount', 0)
  );
}

function cyclePreference(preferenceName) {
  var preference = FrozenCookies.preferenceValues[preferenceName];
  if (preference) {
    var display = preference.display;
    var current = FrozenCookies[preferenceName];
    var preferenceButton = $("#" + preferenceName + "Button");
    if (
      display &&
      display.length > 0 &&
      preferenceButton &&
      preferenceButton.length > 0
    ) {
      var newValue = (current + 1) % display.length;
      preferenceButton[0].innerText = display[newValue];
      FrozenCookies[preferenceName] = newValue;
      FrozenCookies.recalculateCaches = true;
      Game.RefreshStore();
      Game.RebuildUpgrades();
      FCStart();
    }
  }
}

function toggleFrozen(setting) {
  if (!FrozenCookies[setting]) {
    FrozenCookies[setting] = 1;
  } else {
    FrozenCookies[setting] = 0;
  }
  FCStart();
}

var T = Game.Objects["Temple"]?.minigame;
var M = Game.Objects["Wizard tower"]?.minigame;

function rigiSell() {
  if (Game.BuildingsOwned % 10)
    Game.Objects["Cursor"].sell(Game.BuildingsOwned % 10);
  return;
}

function lumpIn(mins) {
  Game.lumpT = Date.now() - Game.lumpRipeAge + 60000 * mins;
}

function swapIn(godId, targetSlot) {
  if (!T || T.swaps == 0) return;
  T.useSwap(1);
  T.lastSwapT = 0;
  var div = l("templeGod" + godId);
  var prev = T.slot[targetSlot];
  if (prev != -1) {
    prev = T.godsById[prev];
    var prevDiv = l("templeGod" + prev.id);
    if (T.godsById[godId].slot != -1)
      l("templeSlot" + T.godsById[godId].slot).appendChild(prevDiv);
    else {
      var other = l("templeGodPlaceholder" + prev.id);
      other.parentNode.insertBefore(prevDiv, other);
    }
  }
  l("templeSlot" + targetSlot).appendChild(l("templeGod" + godId));
  T.slotGod(T.godsById[godId], targetSlot);

  PlaySound("snd/tick.mp3");
  PlaySound("snd/spirit.mp3");

  var rect = l("templeGod" + godId).getBoundingClientRect();
  Game.SparkleAt(
    (rect.left + rect.right) / 2,
    (rect.top + rect.bottom) / 2 - 24
  );
}

function autoRigidel() {
  if (!T) return;
  var timeToRipe =
    (Math.ceil(Game.lumpRipeAge) - (Date.now() - Game.lumpT)) / 60000;
  var orderLvl = Game.hasGod("order") ? Game.hasGod("order") : 0;
  switch (orderLvl) {
    case 0:
      if (T.swaps < 2 || (T.swaps == 1 && T.slot[0] == -1)) return;
      if (timeToRipe < 60) {
        var prev = T.slot[0];
        swapIn(10, 0);
        Game.computeLumpTimes();
        rigiSell();
        Game.clickLump();
        if (prev != -1) swapIn(prev, 0);
      }
      break;
    case 1:
      if (timeToRipe < 60 && Game.BuildingsOwned % 10) {
        rigiSell();
        Game.computeLumpTimes();
        Game.clickLump();
      }
      break;
    case 2:
      if (timeToRipe < 40 && Game.BuildingsOwned % 10) {
        rigiSell();
        Game.computeLumpTimes();
        Game.clickLump();
      }
      break;
    case 3:
      if (timeToRipe < 20 && Game.BuildingsOwned % 10) {
        rigiSell();
        Game.computeLumpTimes();
        Game.clickLump();
      }
      break;
  }
}

function autoTicker() {
  if (Game.TickerEffect && Game.TickerEffect.type == "fortune") {
    Game.tickerL.click();
  }
}

function autoCast() {
  if (!M) return;
  if (M.magic == M.magicM) {
    if (
      cpsBonus() >= FrozenCookies.minCpSMult ||
      Game.hasBuff("Dragonflight") ||
      Game.hasBuff("Click frenzy")
    ) {
      switch (FrozenCookies.autoSpell) {
        case 0:
          return;
        case 1:
          var CBG = M.spellsById[0];
          if (M.magicM < Math.floor(CBG.costMin + CBG.costPercent * M.magicM))
            return;
          M.castSpell(CBG);
          logEvent("AutoSpell", "Cast Conjure Baked Goods");
          return;
        case 2:
          var FTHOF = M.spellsById[1];
          if (
            M.magicM < Math.floor(FTHOF.costMin + FTHOF.costPercent * M.magicM)
          )
            return;
          M.castSpell(FTHOF);
          logEvent("AutoSpell", "Cast Force the Hand of Fate");
          return;
        case 3:
          var SE = M.spellsById[3];
          if (
            Game.Objects["Idleverse"].amount == 0 ||
            M.magicM < Math.floor(SE.costMin + SE.costPercent * M.magicM)
          )
            return;
          while (
            Game.Objects["Idleverse"].amount >= 400 ||
            Game.cookies < Game.Objects["Idleverse"].price / 2
          ) {
            Game.Objects["Idleverse"].sell(1);
            logEvent(
              "Store",
              "Sold 1 Idleverse for " +
                (Beautify(
                  Game.Objects["Idleverse"].price *
                    Game.Objects["Idleverse"].getSellMultiplier()
                ) +
                  " cookies")
            );
          }
          M.castSpell(SE);
          logEvent("AutoSpell", "Cast Spontaneous Edifice");
          return;
        case 4:
          var hagC = M.spellsById[4];
          if (M.magicM < Math.floor(hagC.costMin + hagC.costPercent * M.magicM))
            return;
          M.castSpell(hagC);
          logEvent("AutoSpell", "Cast Haggler's Charm");
          return;
      }
    }
  }
}

function autoBlacklistOff() {
  switch (FrozenCookies.blacklist) {
    case 1:
      FrozenCookies.blacklist = Game.cookiesEarned >= 1000000 ? 0 : 1;
      break;
    case 2:
      FrozenCookies.blacklist = Game.cookiesEarned >= 1000000000 ? 0 : 2;
      break;
    case 3:
      FrozenCookies.blacklist =
        haveAll("halloween") && haveAll("easter") ? 0 : 3;
      break;
  }
}

function generateProbabilities(upgradeMult, minBase, maxMult) {
  var cumProb = [];
  var remainingProbability = 1;
  var minTime = minBase * upgradeMult;
  var maxTime = maxMult * minTime;
  var spanTime = maxTime - minTime;
  for (var i = 0; i < maxTime; i++) {
    var thisFrame =
      remainingProbability * Math.pow(Math.max(0, (i - minTime) / spanTime), 5);
    remainingProbability -= thisFrame;
    cumProb.push(1 - remainingProbability);
  }
  return cumProb;
}

var cumulativeProbabilityList = {
  golden: [1, 0.95, 0.5, 0.475, 0.25, 0.2375].reduce(function (r, x) {
    r[x] = generateProbabilities(x, 5 * 60 * Game.fps, 3);
    return r;
  }, {}),
  reindeer: [1, 0.5].reduce(function (r, x) {
    r[x] = generateProbabilities(x, 3 * 60 * Game.fps, 2);
    return r;
  }, {}),
};

function getProbabilityList(listType) {
  return cumulativeProbabilityList[listType][getProbabilityModifiers(listType)];
}

function getProbabilityModifiers(listType) {
  var result;
  switch (listType) {
    case "golden":
      result =
        (Game.Has("Lucky day") ? 0.5 : 1) *
        (Game.Has("Serendipity") ? 0.5 : 1) *
        (Game.Has("Golden goose egg") ? 0.95 : 1);
      break;
    case "reindeer":
      result = Game.Has("Reindeer baking grounds") ? 0.5 : 1;
      break;
  }
  return result;
}

function cumulativeProbability(listType, start, stop) {
  return (
    1 -
    (1 - getProbabilityList(listType)[stop]) /
      (1 - getProbabilityList(listType)[start])
  );
}

function probabilitySpan(listType, start, endProbability) {
  var startProbability = getProbabilityList(listType)[start];
  return _.sortedIndex(
    getProbabilityList(listType),
    startProbability + endProbability - startProbability * endProbability
  );
}

function clickBuffBonus() {
  var ret = 1;
  for (var i in Game.buffs) {
    if (
      typeof Game.buffs[i].multClick != "undefined" &&
      Game.buffs[i].name != "Devastation"
    ) {
      ret *= Game.buffs[i].multClick;
    }
  }
  return ret;
}

function cpsBonus() {
  var ret = 1;
  for (var i in Game.buffs) {
    if (typeof Game.buffs[i].multCpS != "undefined") {
      ret *= Game.buffs[i].multCpS;
    }
  }
  return ret;
}

function hasClickBuff() {
  return Game.hasBuff("Cursed finger") || clickBuffBonus() > 1;
}

function baseCps() {
  var buffMod = 1;
  for (var i in Game.buffs) {
    if (typeof Game.buffs[i].multCpS != "undefined")
      buffMod *= Game.buffs[i].multCpS;
  }
  if (buffMod === 0) {
    return FrozenCookies.lastBaseCPS;
  }
  var baseCPS = Game.cookiesPs / buffMod;
  FrozenCookies.lastBaseCPS = baseCPS;
  return baseCPS;
}

function baseClickingCps(clickSpeed) {
  var clickFrenzyMod = clickBuffBonus();
  var frenzyMod = Game.hasBuff("Frenzy") ? Game.buffs["Frenzy"].multCpS : 1;
  var cpc = Game.mouseCps() / (clickFrenzyMod * frenzyMod);
  return clickSpeed * cpc;
}

function effectiveCps(delay, wrathValue, wrinklerCount) {
  wrathValue = wrathValue != null ? wrathValue : Game.elderWrath;
  wrinklerCount = wrinklerCount != null ? wrinklerCount : wrathValue ? 10 : 0;
  var wrinkler = wrinklerMod(wrinklerCount);
  if (delay == null) {
    delay = delayAmount();
  }
  return (
    baseCps() * wrinkler +
    gcPs(cookieValue(delay, wrathValue, wrinklerCount)) +
    baseClickingCps(FrozenCookies.cookieClickSpeed * FrozenCookies.autoClick) +
    reindeerCps(wrathValue)
  );
}

function frenzyProbability(wrathValue) {
  wrathValue = wrathValue != null ? wrathValue : Game.elderWrath;
  return cookieInfo.frenzy.odds[wrathValue];
}

function clotProbability(wrathValue) {
  wrathValue = wrathValue != null ? wrathValue : Game.elderWrath;
  return cookieInfo.clot.odds[wrathValue];
}

function bloodProbability(wrathValue) {
  wrathValue = wrathValue != null ? wrathValue : Game.elderWrath;
  return cookieInfo.blood.odds[wrathValue];
}

function cookieValue(bankAmount, wrathValue, wrinklerCount) {
  var cps = baseCps();
  var clickCps = baseClickingCps(
    FrozenCookies.autoClick * FrozenCookies.cookieClickSpeed
  );
  var frenzyCps = FrozenCookies.autoFrenzy
    ? baseClickingCps(FrozenCookies.autoFrenzy * FrozenCookies.frenzyClickSpeed)
    : clickCps;
  var luckyMod = Game.Has("Get lucky") ? 2 : 1;
  wrathValue = wrathValue != null ? wrathValue : Game.elderWrath;
  wrinklerCount = wrinklerCount != null ? wrinklerCount : wrathValue ? 10 : 0;
  var wrinkler = wrinklerMod(wrinklerCount);

  var value = 0;
  value -=
    cookieInfo.clot.odds[wrathValue] *
    (wrinkler * cps + clickCps) *
    luckyMod *
    66 *
    0.5;
  value +=
    cookieInfo.frenzy.odds[wrathValue] *
    (wrinkler * cps + clickCps) *
    luckyMod *
    77 *
    6;
  value +=
    cookieInfo.blood.odds[wrathValue] *
    (wrinkler * cps + clickCps) *
    luckyMod *
    6 *
    665;
  value +=
    cookieInfo.chain.odds[wrathValue] *
    calculateChainValue(bankAmount, cps, 7 - wrathValue / 3);
  value -=
    cookieInfo.ruin.odds[wrathValue] *
    (Math.min(bankAmount * 0.05, cps * 60 * 10) + 13);
  value -=
    cookieInfo.frenzyRuin.odds[wrathValue] *
    (Math.min(bankAmount * 0.05, cps * 60 * 10 * 7) + 13);
  value -=
    cookieInfo.clotRuin.odds[wrathValue] *
    (Math.min(bankAmount * 0.05, cps * 60 * 10 * 0.5) + 13);
  value +=
    cookieInfo.lucky.odds[wrathValue] *
    (Math.min(bankAmount * 0.15, cps * 60 * 15) + 13);
  value +=
    cookieInfo.frenzyLucky.odds[wrathValue] *
    (Math.min(bankAmount * 0.15, cps * 60 * 15 * 7) + 13);
  value +=
    cookieInfo.clotLucky.odds[wrathValue] *
    (Math.min(bankAmount * 0.15, cps * 60 * 15 * 0.5) + 13);
  value += cookieInfo.click.odds[wrathValue] * frenzyCps * luckyMod * 13 * 777;
  value +=
    cookieInfo.frenzyClick.odds[wrathValue] *
    frenzyCps *
    luckyMod *
    13 *
    777 *
    7;
  value +=
    cookieInfo.clotClick.odds[wrathValue] *
    frenzyCps *
    luckyMod *
    13 *
    777 *
    0.5;
  return value;
}

function reindeerValue(wrathValue) {
  var value = 0;
  if (Game.season == "christmas") {
    var remaining =
      1 -
      (frenzyProbability(wrathValue) +
        clotProbability(wrathValue) +
        bloodProbability(wrathValue));
    var outputMod = Game.Has("Ho ho ho-flavored frosting") ? 2 : 1;

    value +=
      Math.max(25, baseCps() * outputMod * 60 * 7) *
      frenzyProbability(wrathValue);
    value +=
      Math.max(25, baseCps() * outputMod * 60 * 0.5) *
      clotProbability(wrathValue);
    value +=
      Math.max(25, baseCps() * outputMod * 60 * 666) *
      bloodProbability(wrathValue);
    value += Math.max(25, baseCps() * outputMod * 60) * remaining;
  }
  return value;
}

function reindeerCps(wrathValue) {
  var averageTime = probabilitySpan("reindeer", 0, 0.5) / Game.fps;
  return (
    (reindeerValue(wrathValue) / averageTime) * FrozenCookies.simulatedGCPercent
  );
}

function calculateChainValue(bankAmount, cps, digit) {
  const x = Math.min(bankAmount, cps * 60 * 60 * 6 * 4);
  const n = Math.floor(Math.log((9 * x) / (4 * digit)) / Math.LN10);
  return 125 * Math.pow(9, n - 3) * digit;
}

function chocolateValue(bankAmount, earthShatter) {
  var value = 0;
  if (Game.HasUnlocked("Chocolate egg") && !Game.Has("Chocolate egg")) {
    bankAmount =
      bankAmount != null && bankAmount !== 0 ? bankAmount : Game.cookies;
    var sellRatio = 0.25;
    var highestBuilding = 0;
    if (earthShatter == null) {
      if (Game.hasAura("Earth Shatterer")) sellRatio = 0.5;
    } else if (earthShatter) {
      sellRatio = 0.5;
      if (!Game.hasAura("Earth Shatterer")) {
        for (var i in Game.Objects) {
          if (Game.Objects[i].amount > 0) highestBuilding = Game.Objects[i];
        }
      }
    }
    value =
      0.05 *
      (wrinklerValue() +
        bankAmount +
        Game.ObjectsById.reduce(function (s, b) {
          return (
            s +
            cumulativeBuildingCost(
              b.basePrice,
              1,
              (b == highestBuilding ? b.amount : b.amount + 1) - b.free
            ) *
              sellRatio
          );
        }, 0));
  }
  return value;
}

function wrinklerValue() {
  return Game.wrinklers.reduce(function (s, w) {
    return s + popValue(w);
  }, 0);
}

function buildingRemaining(building, amount) {
  var cost = cumulativeBuildingCost(
    building.basePrice,
    building.amount,
    amount
  );
  var availableCookies =
    Game.cookies +
    wrinklerValue() +
    Game.ObjectsById.reduce(function (s, b) {
      return (
        s +
        (b.name == building.name
          ? 0
          : cumulativeBuildingCost(b.basePrice, 1, b.amount + 1) / 2)
      );
    }, 0);
  availableCookies *=
    Game.HasUnlocked("Chocolate egg") && !Game.Has("Chocolate egg") ? 1.05 : 1;
  return Math.max(0, cost - availableCookies);
}

function earnedRemaining(total) {
  return Math.max(
    0,
    total - (Game.cookiesEarned + wrinklerValue() + chocolateValue())
  );
}

function estimatedTimeRemaining(cookies) {
  return timeDisplay(cookies / effectiveCps());
}

function canCastSE() {
  if (M && M.magicM >= 80 && Game.Objects["Idleverse"]?.amount > 0) return 1;
  return 0;
}

function edificeBank() {
  if (!canCastSE()) return 0;
  var cmCost = Game.Objects["Idleverse"].price;
  return Game.hasBuff("everything must go")
    ? (cmCost * (100 / 95)) / 2
    : cmCost / 2;
}

function luckyBank() {
  return baseCps() * 60 * 100;
}

function luckyFrenzyBank() {
  return baseCps() * 60 * 100 * 7;
}

function chainBank() {
  var digit = 7 - Math.floor(Game.elderWrath / 3);
  return (
    4 *
    Math.floor(
      (digit / 9) *
        Math.pow(
          10,
          Math.floor(Math.log((194400 * baseCps()) / digit) / Math.LN10)
        )
    )
  );
}

function harvestBank() {
  if (!FrozenCookies.setHarvestBankPlant) return 0;

  FrozenCookies.harvestMinutes = 0;
  FrozenCookies.harvestMaxPercent = 0;
  FrozenCookies.harvestFrenzy = 1;
  FrozenCookies.harvestBuilding = 1;
  FrozenCookies.harvestPlant = "";

  if (
    FrozenCookies.setHarvestBankType == 1 ||
    FrozenCookies.setHarvestBankType == 3
  ) {
    FrozenCookies.harvestFrenzy = 7;
  }

  if (
    FrozenCookies.setHarvestBankType == 2 ||
    FrozenCookies.setHarvestBankType == 3
  ) {
    var harvestBuildingArray = Game.ObjectsById.map((b) => b.amount);
    harvestBuildingArray.sort((a, b) => b - a);

    for (
      var buildingLoop = 0;
      buildingLoop < FrozenCookies.maxSpecials;
      buildingLoop++
    ) {
      FrozenCookies.harvestBuilding *= harvestBuildingArray[buildingLoop] || 1;
    }
  }

  switch (FrozenCookies.setHarvestBankPlant) {
    case 1:
      FrozenCookies.harvestPlant = "Bakeberry";
      FrozenCookies.harvestMinutes = 30;
      FrozenCookies.harvestMaxPercent = 0.03;
      break;
    case 2:
      FrozenCookies.harvestPlant = "Chocoroot";
      FrozenCookies.harvestMinutes = 3;
      FrozenCookies.harvestMaxPercent = 0.03;
      break;
    case 3:
      FrozenCookies.harvestPlant = "White Chocoroot";
      FrozenCookies.harvestMinutes = 3;
      FrozenCookies.harvestMaxPercent = 0.03;
      break;
    case 4:
      FrozenCookies.harvestPlant = "Queenbeet";
      FrozenCookies.harvestMinutes = 60;
      FrozenCookies.harvestMaxPercent = 0.04;
      break;
    case 5:
      FrozenCookies.harvestPlant = "Duketater";
      FrozenCookies.harvestMinutes = 120;
      FrozenCookies.harvestMaxPercent = 0.08;
      break;
    case 6:
      FrozenCookies.harvestPlant = "Crumbspore";
      FrozenCookies.harvestMinutes = 1;
      FrozenCookies.harvestMaxPercent = 0.01;
      break;
    case 7:
      FrozenCookies.harvestPlant = "Doughshroom";
      FrozenCookies.harvestMinutes = 5;
      FrozenCookies.harvestMaxPercent = 0.03;
      break;
  }

  if (FrozenCookies.maxSpecials == 0) {
    FrozenCookies.maxSpecials = 1;
  }

  return (
    (baseCps() *
      60 *
      FrozenCookies.harvestMinutes *
      FrozenCookies.harvestFrenzy *
      FrozenCookies.harvestBuilding) /
    Math.pow(10, FrozenCookies.maxSpecials) /
    FrozenCookies.harvestMaxPercent
  );
}

function cookieEfficiency(startingPoint, bankAmount) {
  var results = Number.MAX_VALUE;
  var currentValue = cookieValue(startingPoint);
  var bankValue = cookieValue(bankAmount);
  var bankCps = gcPs(bankValue);
  if (bankCps > 0) {
    if (bankAmount <= startingPoint) {
      results = 0;
    } else {
      var cost = Math.max(0, bankAmount - startingPoint);
      var deltaCps = gcPs(bankValue - currentValue);
      results = divCps(cost, deltaCps);
    }
  } else if (bankAmount <= startingPoint) {
    results = 0;
  }
  return results;
}

function bestBank(minEfficiency) {
  var edifice =
    FrozenCookies.autoSpell == 3 || FrozenCookies.holdSEBank
      ? edificeBank()
      : 0;
  var bankLevels = [0, luckyBank(), luckyFrenzyBank(), harvestBank()]
    .sort((a, b) => b - a)
    .map((bank) => ({
      cost: bank,
      efficiency: cookieEfficiency(Game.cookies, bank),
    }))
    .filter((bank) => {
      return (bank.efficiency >= 0 && bank.efficiency <= minEfficiency) ||
        FrozenCookies.setHarvestBankPlant
        ? bank
        : null;
    });

  if (bankLevels[0]?.cost > edifice || FrozenCookies.setHarvestBankPlant) {
    return bankLevels[0] || { cost: 0, efficiency: 0 };
  }
  return {
    cost: edifice,
    efficiency: 1,
  };
}

function gcPs(gcValue) {
  var averageGCTime = probabilitySpan("golden", 0, 0.5) / Game.fps;
  gcValue /= averageGCTime;
  gcValue *= FrozenCookies.simulatedGCPercent;
  return gcValue;
}

function delayAmount() {
  return bestBank(nextChainedPurchase().efficiency).cost;
}

function fcWin(what) {
  if (typeof what === "string") {
    if (Game.Achievements[what] && Game.Achievements[what].won == 0) {
      var achname = Game.Achievements[what].shortName
        ? Game.Achievements[what].shortName
        : Game.Achievements[what].name;
      Game.Achievements[what].won = 1;
      if (!FrozenCookies.disabledPopups) {
        logEvent(
          "Achievement",
          "Achievement unlocked :<br>" +
            Game.Achievements[what].name +
            "<br> ",
          true
        );
      }
      if (FrozenCookies.showAchievements) {
        Game.Notify(
          "Achievement unlocked",
          '<div class="title" style="font-size:18px;margin-top:-2px;">' +
            achname +
            "</div>",
          Game.Achievements[what].icon
        );
        if (App && Game.Achievements[what].vanilla)
          App.gotAchiev(Game.Achievements[what].id);
      }
      if (Game.Achievements[what].pool != "shadow") {
        Game.AchievementsOwned++;
      }
      Game.recalculateGains = 1;
    }
  } else {
    for (var i in what) {
      Game.Win(what[i]);
    }
  }
}

function logEvent(event, text, popup) {
  var time = "[" + timeDisplay((Date.now() - Game.startDate) / 1000) + "]";
  var output = time + " " + event + ": " + text;
  if (FrozenCookies.logging) {
    console.log(output);
  }
  if (popup) {
    Game.Popup(text);
  }
}

function shouldClickGC() {
  for (var i in Game.shimmers) {
    if (Game.shimmers[i].type == "golden") {
      return true;
    }
  }
  return false;
}
