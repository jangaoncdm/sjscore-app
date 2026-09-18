/* ============================================================
   THE GRAM PANCHAYAT REGISTER · district configuration
   ------------------------------------------------------------
   COPY THIS FILE TO  gp/config.js  IN THE REPOSITORY, ONCE.
   A publish never carries config.js, so nothing here is ever
   overwritten and the address never has to be pasted back.

   NOTHING APPEARS AT /gp/ UNTIL THIS FILE EXISTS. The Action
   checks for it and stands down with a note rather than
   publishing an app that answers to no server.
   ============================================================ */

/* the GP project's own /exec — NOT the sanitation register's */
window.SJGP_SERVER = 'https://script.google.com/macros/s/PASTE-THE-GP-EXEC-ID-HERE/exec';

/* WHICH REGISTER THIS IS. It does two things that matter: the app draws
   itself as the Gram Panchayat register rather than the sanitation one, and
   it changes the key the app keeps its store under.

   Both apps sit on ONE DOMAIN and browser storage is per domain, not per
   folder — so without this line the GP app would open on top of an officer's
   sanitation session, write its own over it, and the two would sign each
   other out on the same handset all day. */
window.SJGP_TENANT = 'GP';
