# Pace shop (parked)

Build 50 ships with NO prices and NO buy buttons. Every feature is free.
The whole shop is kept here so it can come back in minutes.

Files
- billing.js, billing-config.js: RevenueCat layer (public iOS key, products pace_plus_monthly / yearly / pace_lifetime, entitlement "plus").
- shop-sheets.html: the Plus sheet and the Plans sheet (prices, Buy buttons, Restore, terms text).
- shop-app-code.js: plusGate / maybePlus / renderPlans / buyFlow wiring that lived in app.js.

Turn it back on
1. Copy billing.js and billing-config.js next to index.html. Add them to FILES in service-worker.js and store/scripts/sync-www.mjs, and add two <script> tags before app.js in index.html.
2. Paste shop-sheets.html into index.html before the guideSheet block. Add the Plans button (id plansOpen) back to Settings.
3. In app.js replace the "shop is parked" stub (maybePlus / plusGate) with shop-app-code.js.
4. Decide which features are Plus (call plusGate("name") at their apply point).
5. Apple: in-app purchases need App Store Connect products, a paid-apps agreement, Restore Purchases, a Terms of Use (EULA) link and a Privacy Policy link next to the price.
