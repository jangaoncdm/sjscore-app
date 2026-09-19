/* Written by the provisioning pipeline, run 5.
   A publish never carries config.js, so nothing here is overwritten.

   SJGP_TENANT does two things: the app draws itself as the Gram
   Panchayat register, and it changes the key the app keeps its store
   under. Both apps sit on one domain and browser storage is per
   domain, not per folder. */
window.SJGP_SERVER = 'https://script.google.com/macros/s/AKfycbxkWbQXg97t37SjtH32th2fNRt-k1SH06e-Dd68jEt2DQ6Es7wBW6xWozOqx6VL4Q8y/exec';
window.SJGP_TENANT = 'GP';
