/* Pace — Firebase config seam.
   The values are PUBLIC bundle values by design (they identify the
   project; the Security Rules are the wall, not these strings).
   They are filled in per app project when HQ runs the console
   sitting — until then every field stays null, the app treats
   accounts as not-yet-open, hides the doors, and guest mode is
   completely unaffected. Nothing else in the app reads Firebase
   settings except through window.PACE_FB_CONFIG. */
window.PACE_FB_CONFIG = {
  apiKey: null,
  authDomain: null,
  projectId: null,
  appId: null,
  googleClientId: null,
  appleEnabled: false,
};
