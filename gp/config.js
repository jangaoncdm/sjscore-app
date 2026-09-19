/* Written by the provisioning pipeline, run 3.
   A publish never carries config.js, so nothing here is overwritten.

   SJGP_TENANT does two things: the app draws itself as the Gram
   Panchayat register, and it changes the key the app keeps its store
   under. Both apps sit on one domain and browser storage is per
   domain, not per folder. */
window.SJGP_SERVER = 'https://script.google.com/macros/s/AKfycby4dalVJi1_8uh6wAFDDH3mTyyBrz-fj5qQcs1zdX0GY-fbQD8MOzJUVt848ImHf53x/exec';
window.SJGP_TENANT = 'GP';
