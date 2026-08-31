// @name         Cookie Clicker Predict Spell
// @version      0.2
// @author       Random Reddit Guy (SamNosliw, 3pLm1zf1rMD_Xkeo6XHl)
// @match        http://orteil.dashnet.org/cookieclicker/

(function () {
  if (Game.ObjectsById[7] && Game.ObjectsById[7].minigameLoaded) {
    const lookup = setInterval(() => {
      if (typeof Game.ready !== "undefined" && Game.ready) {
        const CastSpell = document.getElementById("grimoireSpell1");
        if (CastSpell) {
          CastSpell.onmouseover = function () {
            Game.tooltip.dynamic = 1;
            Game.tooltip.draw(
              this,
              Game.ObjectsById[7].minigame.spellTooltip(1)() +
                '<div class="line"></div><div class="description">' +
                "<b>First Spell:</b> " +
                nextSpell(0) +
                "<br />" +
                "<b>Second Spell:</b> " +
                nextSpell(1) +
                "<br />" +
                "<b>Third Spell:</b> " +
                nextSpell(2) +
                "<br />" +
                "<b>Fourth Spell:</b> " +
                nextSpell(3) +
                "</div>",
              "this"
            );
            Game.tooltip.wobble();
          };
        }
        clearInterval(lookup);
      }
    }, 1000);
  }
})();

function nextSpell(i) {
  const season = Game.season;
  const M = Game.ObjectsById[7].minigame;
  const spell = M.spellsById[1];
  let failChance = M.getFailChance(spell);

  Math.seedrandom(Game.seed + "/" + (M.spellsCastTotal + i));
  let choices = [];
  if (!spell.fail || Math.random() < 1 - failChance) {
    Math.random();
    Math.random();
    if (season === "valentines" || season === "easter") {
      Math.random();
    }
    choices.push(
      '<b style="color:#FFDE5F">Frenzy',
      '<b style="color:#FFDE5F">Lucky'
    );
    if (!Game.hasBuff("Dragonflight"))
      choices.push('<b style="color:#FFD700">Click Frenzy');
    if (Math.random() < 0.1)
      choices.push(
        '<b style="color:#FFDE5F">Cookie Chain',
        '<b style="color:#FFDE5F">Cookie Storm',
        "Blab"
      );
    if (Game.BuildingsOwned >= 10 && Math.random() < 0.25)
      choices.push('<b style="color:#DAA520">Building Special');
    if (Math.random() < 0.15) choices = ["Cookie Storm (Drop)"];
    if (Math.random() < 0.0001)
      choices.push('<b style="color:#5FFFFC">Sugar Lump');
  } else {
    Math.random();
    Math.random();
    if (season === "valentines" || season === "easter") {
      Math.random();
    }
    choices.push(
      '<b style="color:#FF3605">Clot',
      '<b style="color:#FF3605">Ruin Cookies'
    );
    if (Math.random() < 0.1)
      choices.push(
        '<b style="color:#DAA520">Cursed Finger',
        '<b style="color:#DAA520">Elder Frenzy'
      );
    if (Math.random() < 0.003)
      choices.push('<b style="color:#5FFFFC">Sugar Lump');
    if (Math.random() < 0.1) choices = ["Blab"];
  }
  const ret = choose(choices);
  Math.seedrandom();
  return "<small>" + ret + "</b></small>";
}