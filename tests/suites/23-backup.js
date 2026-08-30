/* The backup: the register twice over, the server, the app, the Drive
   inventory and the property FINGERPRINTS — never a property value. Run
   twice it changes nothing; run after a failure it finishes the job rather
   than starting again; and when a step fails it says so in the subject line
   of the Collector's mail, because a backup that fails quietly is a belief
   and not a backup. Retention bins, it never deletes, and the 1st of the
   month is kept for good. */
'use strict';
const mock = require('../gasmock.js');

function seed(env){
  env.mkSheet('Users', ['Phone','Name','Role','Mandal','GP','Email','InitPin','Hash','Active'], [
    { Phone: '9000000001', Name: 'Sandeep Kumar Jha', Role: 'COLLECTOR', Email: 'cdm@mock.example', Active: 'TRUE' },
    { Phone: '9000000031', Name: 'P. Sec Konne', Role: 'PS', Mandal: 'Jangaon', GP: 'Konne', Email: 'ps@mock.example', Active: 'TRUE' }
  ]);
  env.props.SALT = 'the-districts-own-salt';
  env.props.WEATHER_KEY = '';
}
/* the backup folder as a plain tree, so a suite can look at it the way a
   person looks at Drive */
function tree(env){
  const walk = f => {
    const o = { files: f.live().map(x => x.getName()).sort(), folders: {} };
    Object.keys(f.folders).filter(k => !f.folders[k].trashed).sort()
      .forEach(k => { o.folders[k] = walk(f.folders[k]); });
    return o;
  };
  const it = env.driveRoot.getFoldersByName('SJ-SCORE Backups');
  return it.hasNext() ? walk(it.next()) : null;
}

module.exports = {
  name: 'the backup (dailyBackup, retention, the fingerprints)',
  run(t){
    /* ---------------- a whole system, backed up ---------------- */
    const env = mock.load({ now: '2026-08-29T01:05:00+05:30' });
    seed(env);
    env.fetchReply = 'the published bytes';
    const sum = env.ctx.dailyBackup();

    t.eq(sum.failed.length, 0, 'nothing failed on a clean run');
    t.eq(sum.taken, '2026-08-29', 'the backup is stamped with the district’s day');

    const b = tree(env);
    t.ok(!!b, 'the backup folder is made on first use, like every other Drive area');
    t.ok(!!b.folders['register'] && !!b.folders['code'] && !!b.folders['app'] && !!b.folders['manifest'],
      'four areas: the record, the server, the app, and what proves the rest');

    const reg = b.folders['register'].folders['2026-08'].files;
    t.ok(reg.indexOf('SJGP-register-2026-08-29') >= 0, 'the register is copied as a Sheet — the copy that restores in one click');
    t.ok(reg.indexOf('SJGP-register-2026-08-29.xlsx') >= 0, 'and as a workbook — the copy that opens on a machine that never heard of Google');
    t.eq(b.folders['code'].folders['2026-08-29'].files.length, 3, 'Code.gs, Admin.gs and the manifest of the server');
    t.eq(b.folders['app'].folders['2026-08-29'].files.length, 7, 'every published file of the app and the console');
    t.ok(b.files.indexOf('MANIFEST-2026-08-29.json') >= 0, 'and a manifest saying what the day’s backup actually got');

    /* ---------------- the salt is never in the backup ---------------- */
    const mf = env.driveRoot.getFoldersByName('SJ-SCORE Backups').next()
                 .getFoldersByName('manifest').next();
    const propFile = mf.getFilesByName('properties-2026-08-29.json').next();
    const props = JSON.parse(propFile.getBlob().getDataAsString());
    t.ok(!!props.properties.SALT, 'the salt is named, so a restorer knows it has to exist');
    t.ok(JSON.stringify(props).indexOf('the-districts-own-salt') < 0,
      'but its VALUE is nowhere in the backup — a backup holding the secret is a second place to lose it from');
    t.eq(props.properties.SALT.fingerprint.length, 12, 'only a fingerprint, twelve hex of the SHA-256');
    t.eq(props.properties.SALT.fingerprint, env.ctx.fingerprint_('the-districts-own-salt'),
      'and it is the fingerprint of the real salt, so one typed back in by hand can be proved right before 280 officers are locked out');

    /* ---------------- the Collector is told, every morning ---------------- */
    const mail = env.outbox.find(m => m.to === 'cdm@mock.example' && /backup/i.test(m.subject));
    t.ok(!!mail, 'the mail goes to the Collector’s own address off the roll');
    t.contains(mail.subject, 'backup taken', 'a clean night says so plainly');
    t.contains(mail.subject, '29.08.2026', 'dated the district’s way');
    t.ok(!/FAILED|INCOMPLETE/.test(mail.subject), 'and carries no alarm when there is nothing to be alarmed about');

    /* ---------------- run it again: nothing doubles (rule 8) ---------------- */
    const filesBefore = JSON.stringify(tree(env));
    const sum2 = env.ctx.dailyBackup();
    t.eq(JSON.stringify(tree(env)), filesBefore, 'a second run the same day writes not one further file');
    t.eq(sum2.failed.length, 0, 'and fails nothing by finding its own work already done');
    t.ok(sum2.ok.some(s => /already taken today/.test(s.note)), 'it says so, rather than pretending it did the work twice');

    /* ---------------- a failure is loud, and costs only itself ------------- */
    const envF = mock.load({ now: '2026-08-29T01:05:00+05:30' });
    seed(envF);
    envF.fetchReply = 'the published bytes';
    /* the published site is down; the repository and the workbook export are not */
    envF.fetchCodeFor = url => (String(url).indexOf('github.io') >= 0 ? 503 : null);
    const sumF = envF.ctx.dailyBackup();
    t.eq(sumF.failed.length, 1, 'one step down is one step down');
    t.contains(sumF.failed[0].what, 'app', 'and it is named');
    const bF = tree(envF);
    t.ok(bF.folders['register'].folders['2026-08'].files.length >= 1,
      'the register was still taken — a broken step never costs the others');
    t.ok(!!bF.folders['code'].folders['2026-08-29'], 'and so was the server code');
    const mailF = envF.outbox.find(m => /INCOMPLETE/.test(m.subject));
    t.ok(!!mailF, 'the subject line carries the failure, where it cannot be missed');
    t.contains(mailF.htmlBody, 'needs attention', 'and the mail says what did not happen');

    /* the next morning finishes what the failed run left, rather than starting
       over — the site is back up and only the missing part is fetched */
    envF.fetchCodeFor = null;
    const sumR = envF.ctx.dailyBackup();
    t.eq(sumR.failed.length, 0, 'the re-run completes the backup');
    t.eq(tree(envF).folders['app'].folders['2026-08-29'].files.length, 7, 'the app files it could not take before are taken now');
    t.ok(sumR.ok.some(s => /already taken today/.test(s.note)), 'and what was already good is left alone');

    /* ---------------- retention: binned, never destroyed ---------------- */
    const envP = mock.load({ now: '2026-10-01T01:05:00+05:30' });
    seed(envP);
    envP.fetchReply = 'x';
    const rootP = envP.ctx.backupRoot_();
    const regP = envP.ctx.getFolder_(envP.ctx.getFolder_(rootP, 'register'), '2026-08');
    ['SJGP-register-2026-08-01', 'SJGP-register-2026-08-29', 'SJGP-register-2026-09-25', 'notes-for-the-office']
      .forEach(n => regP.createFile({ data: 'x', type: 'text/plain', name: n }));
    const codeP = envP.ctx.getFolder_(rootP, 'code');
    codeP.createFolder('2026-08-20').createFile({ data: 'x', type: 'text/plain', name: 'Code.gs' });

    const verdict = envP.ctx.pruneBackups_(rootP, '2026-10-01');
    const left = regP.live().map(f => f.getName()).sort();
    t.ok(left.indexOf('SJGP-register-2026-08-01') >= 0, 'the 1st of the month is kept for good — a year of monthlies is what a district actually goes back to');
    t.ok(left.indexOf('SJGP-register-2026-09-25') >= 0, 'anything inside the keep window stands');
    t.ok(left.indexOf('SJGP-register-2026-08-29') < 0, 'a daily past the window goes');
    t.ok(left.indexOf('notes-for-the-office') >= 0, 'a file with no date in its name is not this job’s and is never touched');
    t.ok(regP.files.find(f => f.getName() === 'SJGP-register-2026-08-29').isTrashed(),
      'and what went, went to the BIN — nothing is destroyed (rule 7), it is recoverable for another thirty days');
    t.ok(!codeP.getFoldersByName('2026-08-20').hasNext(), 'a whole dated folder past the window goes the same way');
    t.contains(verdict, 'recoverable', 'and the job says so in its own words');

    /* ---------------- is the backup real? (Admin.gs, read only) ----------- */
    const envA = mock.load({ now: '2026-08-29T09:00:00+05:30', admin: true });
    seed(envA);
    envA.mkSheet('Holidays', ['Date','Occasion'], []);
    envA.ctx.showBackups();
    const said0 = envA.logs.join('\n');
    t.contains(said0, 'NOTHING HAS EVER BEEN BACKED UP',
      'before anything is taken it says so in as many words — a district must never read silence as safety');
    t.contains(said0, 'backupNow()', 'and names the one thing to press');

    envA.logs.length = 0;
    envA.fetchReply = 'x';
    envA.ctx.dailyBackup();                      /* the 29th, taken */
    envA.setNow('2026-09-01T09:00:00+05:30');    /* two working days later, nothing since */
    envA.ctx.showBackups();
    const said = envA.logs.join('\n');
    t.contains(said, '01.09.2026  NOTHING', 'a day with no backup is named as missing');
    t.contains(said, '29.08.2026  complete', 'and the day that was taken is named as complete');
    t.contains(said, 'are missing or partial', 'the gaps are counted, because a job failing quietly looks exactly like one that works');
    t.contains(said, 'TO RESTORE', 'and it says how to put the register back');
    t.contains(said, 'salt', 'including the one thing the backup deliberately does not hold');
    t.eq(JSON.stringify(tree(envA)).indexOf('2026-09-01') >= 0, false,
      'reading the backups writes nothing — no folder is made for the day it was read');

    /* ---------------- the trigger ---------------- */
    const envT = mock.load({ now: '2026-08-29T01:05:00+05:30' });
    seed(envT);
    envT.ctx.installBackupTrigger();
    t.eq(envT.triggers.filter(x => x === 'dailyBackup').length, 1, 'one daily trigger');
    envT.ctx.installBackupTrigger();
    t.eq(envT.installed.filter(x => x === 'dailyBackup').length, 1,
      'installing it twice leaves ONE trigger, not two — a nervous second press must not double the job');
  }
};
