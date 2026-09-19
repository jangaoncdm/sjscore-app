/* Written by the provisioning pipeline, run 4.
   A publish never carries config.js, so nothing here is overwritten.

   SJGP_TENANT does two things: the app draws itself as the Gram
   Panchayat register, and it changes the key the app keeps its store
   under. Both apps sit on one domain and browser storage is per
   domain, not per folder. */
window.SJGP_SERVER = 'https://script.google.com/macros/s/AKfycbzMqTsMCysxG2OUCPnwg0kFCyZX5KAey06KarQS4rQ4L0ewTvFlyp0zMctn6PDfCDep/exec';
window.SJGP_TENANT = 'GP';
