/* Written by the provisioning pipeline, run 6.
   A publish never carries config.js, so nothing here is overwritten.

   SJGP_TENANT does two things: the app draws itself as the Gram
   Panchayat register, and it changes the key the app keeps its store
   under. Both apps sit on one domain and browser storage is per
   domain, not per folder. */
window.SJGP_SERVER = 'https://script.google.com/macros/s/AKfycbxM98E242Mel_LuTaL0ZfD3VNRPQqat2HZujGS6ghVPeJhdUlLVpwSd9pToqVn6sNlp/exec';
window.SJGP_TENANT = 'GP';
