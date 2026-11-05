/* PARKED SHOP CODE (removed from app.js in build 50). Paste back into app.js where plusGate() lives to turn the shop on.
   Needs: billing-config.js + billing.js loaded, and shop-sheets.html pasted into index.html. See README-SHOP.md. */
/* ---------- the upgrade moment ---------- */
/* THE LOCKED TAP (the paid/free rules, 19 Oct: paid features release
   only on an active entitlement; a locked tap SPEAKS and opens
   the plans path — never silent, never a partial unlock).
   plusGate(edge) is the single door every Plus feature's apply
   point passes: entitled (a live subscriptions record or the
   free month — PaceBilling.plusActive) applies silently; not
   entitled speaks through maybePlus and the feature does NOT
   apply. This supersedes the PACE-002 timing of the
   nothing-locked era (first entry clean, speak on a repeat
   visit): that ruling governed a popup over features that
   still worked; with real locks the first locked tap speaks
   too. (Pace has no repeat picker — repeats arrive through
   Talk to it, already an edge, and through import, a completed
   flow with no wanting-moment.) */
var plusShown = {};
function maybePlus(edge) {
  return; /* all features free for now: no upgrade sheet */
  if (DEMO_SESSION) return;
  plusShown[edge] = 1;
  $("plusArt").innerHTML = skipSvg("welcome");
  $("plusSheet").hidden = false;
  renderPlans();
}
function plusGate(edge) {
  if (window.PaceBilling && PaceBilling.plusActive()) return true;
  maybePlus(edge);
  return false;
}
function closePlus() { $("plusSheet").hidden = true; }
$("plusClose").addEventListener("click", closePlus);
$("plusNotNow").addEventListener("click", closePlus);
$("plusPlans").addEventListener("click", function () { closePlus(); renderPlans(); $("plansSheet").hidden = false; });
$("plansOpen").addEventListener("click", function () { renderPlans(); $("plansSheet").hidden = false; });
$("plansClose").addEventListener("click", function () { $("plansSheet").hidden = true; });

/* ---------- plans + buying (the enabling build) ----------
   The buy buttons are Pace's own (the sheet's classes, the
   app's voice) and they live only where a store lives: the
   packaged app, once billing is configured. Everywhere else
   the sheet keeps the honest not-on-sale line. Prices on the
   buttons are the store's own strings for the reader's
   storefront, with the A$ anchors as the fallback. */
function billingOnDevice() {
  try { return !!(window.PaceBilling && PaceBilling.live() && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Purchases); } catch (e) { return false; }
}
function renderPlans() {
  var on = billingOnDevice();
  $("planBuy").hidden = !on;
  $("planTerms").hidden = !on;
  if (on) {
    // The disclosure's prices come from the same source as
    // the buttons' prices, so the two can never drift.
    PaceBilling.storePrices().then(function (sp) {
      var t = $("planTermsText"); if (!t) return;
      t.textContent = tr("Plus, monthly ({m}) and Plus, yearly ({y}) renew automatically at those prices, until you cancel. Cancel anytime in your Apple ID subscriptions. Plus stays open until the end of the paid period. Plus for life ({l}) is one payment. It never renews.", {
        m: sp[PaceBilling.products.monthly] || PaceBilling.productPrice("monthly"),
        y: sp[PaceBilling.products.yearly] || PaceBilling.productPrice("yearly"),
        l: sp[PaceBilling.products.lifetime] || PaceBilling.productPrice("lifetime")
      });
    }).catch(function () {});
  }
  var honest = $("plusHonest");
  if (honest) honest.textContent = on ? tr("Unlock with a paid plan.") : tr("Plus is coming.");
  var st = $("planState"); if (!st) return;
  var holds = $("planHolds");
  if (holds) holds.textContent = on
    ? tr("Plus: more Looks · repeats · tiny steps.")
    : tr("Plus: more Looks · repeats · tiny steps.");
  if (!on) { st.textContent = tr("Not on sale yet."); return; }
  var s = PaceBilling.state();
  if (PaceBilling.plusActive() && s.owned) st.textContent = tr("Plus is yours. Everything is open.");
  else if (PaceBilling.plusActive()) st.textContent = tr("First month free.");
  else st.textContent = tr("Pick a plan to unlock everything.");
  PaceBilling.storePrices().then(function (p) {
    if (!p) return;
    var pm = p[PaceBilling.products.monthly], py = p[PaceBilling.products.yearly], pl = p[PaceBilling.products.lifetime];
    $("buyMonthly").textContent = tr("Plus, monthly") + " — " + (pm || "A$4.99");
    $("buyYearly").textContent = tr("Plus, yearly") + " — " + (py || "A$39.99");
    $("buyLifetime").textContent = tr("Plus for life") + " — " + (pl || "A$99.99");
    // POLAR P2: the copy lines speak the SAME store prices as
    // the buttons (never the A$ anchors beside live store
    // numbers). Only overwrite when the store answered for
    // that product; the static anchors stand otherwise.
    if (pm && py) {
      var pp = $("planPriceLine"); if (pp) pp.textContent = tr("{m} a month, or {y} a year. First month free.", { m: pm, y: py });
      var xp = $("plusPriceLine"); if (xp) xp.textContent = tr("Plus is {m} a month, or {y} a year. Your first month is free.", { m: pm, y: py });
    }
    if (pl) { var lp = $("planLifeLine"); if (lp) lp.textContent = tr("Or Plus for life: {l}, once.", { l: pl }); }
  }).catch(function () {});
}
function buyFlow(productId) {
  PaceBilling.buy(productId).then(function () {
    renderPlans();
    toast(PaceBilling.plusActive() ? tr("Plus is yours. Everything is open.") : tr("That did not go through. Nothing was charged."));
  }).catch(function () { toast(tr("That did not go through. Nothing was charged.")); });
}
$("buyMonthly").addEventListener("click", function () { buyFlow(PaceBilling.products.monthly); });
$("buyYearly").addEventListener("click", function () { buyFlow(PaceBilling.products.yearly); });
$("buyLifetime").addEventListener("click", function () { buyFlow(PaceBilling.products.lifetime); });
$("buyRestore").addEventListener("click", function () {
  PaceBilling.restore().then(function () {
    renderPlans();
    toast(PaceBilling.plusActive() ? tr("Welcome back. Plus is yours again.") : tr("No past purchase found for this account."));
  }).catch(function () { toast(tr("That did not go through. Nothing was charged.")); });
});

