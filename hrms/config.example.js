/* The District HRMS app's one piece of local configuration.
 *
 * COPY THIS TO hrms/config.js AND PUT THE /exec ADDRESS IN IT. config.js is
 * never published over by the deploy Action — the same rule the other two
 * registers have — so the address survives every deploy.
 *
 * There is no SJGP_TENANT here: this app serves one register and one only.
 * What register the SERVER is remains a Script Property over there, and the
 * app has no say in it. */
window.SJGP_SERVER = 'https://script.google.com/macros/s/PUT-THE-HRMS-EXEC-ID-HERE/exec';
