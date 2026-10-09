/* The District HRMS app's one piece of local configuration.
 *
 * Written on 09.10.2026, after the address below was asked what register it is
 * and answered "tenant":"HRMS" — which is the only thing that proves it. All
 * three projects run identical files, so ok:true alone would say exactly the
 * same from a project whose tenant had never been set, and an app pointed at
 * that would file the district's leave into the sanitation register.
 *
 * A publish never carries config.js, so nothing here is overwritten.
 *
 * There is no SJGP_TENANT here: this app serves one register and one only.
 * What register the SERVER is remains its own business, and the app has no say
 * in it. */
window.SJGP_SERVER = 'https://script.google.com/macros/s/AKfycbyVrJLa2ZqBSnZ4Dlu3x_B0ZDnoHKVae2DvTuMa6wOMArZE0tp3yYD7iy-vIlZ34es6/exec';
