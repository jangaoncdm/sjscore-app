/* FEATURE MODULES — a feature is a file, and the main code calls it.

   Every feature so far has been cut into Code.gs. That file is six thousand
   lines and it serves two registers that issue show-cause notices under the
   Conduct Rules; each new incision is a chance to break something that had
   nothing to do with the feature being added, and the thing it breaks is
   somebody's attendance record.

   So the next series of features arrives as modules. What this suite holds is
   not that modules work — that is the easy half — but that a module CANNOT
   DO HARM:

     · it is dispatched after auth_, so it never sees an unauthenticated call;
     · it may not claim a kind or an op the core already answers, and the core
       dispatch it is checked against is read off doPost and doGet themselves
       rather than from a list somebody typed;
     · two modules may not claim the same kind;
     · a module that throws while loading, or while answering, is recorded and
       skipped — the register answers everything else exactly as before;
     · a module may be confined to one register;
     · and it can be switched off by a script property, without a deploy,
       which is the rollback when something misbehaves at four in the
       afternoon and the district cannot wait for a pipeline.

   The last one is the point of the whole design: nothing here is worth having
   unless a bad feature can be taken out of the road in one minute.
*/
'use strict';
const mock = require('../gasmock.js');

module.exports = {
  name: 'feature modules (a feature is a file, and it cannot break the register)',
  run(t){

    const seed = env => {
      env.seedUsers();
      env.mkSheet('Audit', ['At','Action','Subject','Detail','By'], []);
    };
    const tok = (env, p) => env.ctx.issueToken_(env.ctx.findByPhone_(p));

    /* a module is declared exactly as a real one would be: a global function
       named for it, and its name in the register's list */
    const install = (env, name, body) => {
      env.eval('function feature_' + name + '(){ return (' + body + '); }');
      env.eval('FEATURE_MODULES.push(' + JSON.stringify(name) + ');');
    };

    /* THE MECHANISM, NOT THE SHIPPING LIST. These sections are about what a
       module can and cannot do, so they start from an empty register and put
       their own modules on it. Section 9 keeps the real list, because that is
       where what the district actually carries is checked. */
    const clean = env => { env.eval('FEATURE_MODULES.length = 0;'); return env; };

    /* ---- 1. NOTHING IS LOADED UNTIL SOMETHING IS ADDED ---- */
    {
      const e = clean(mock.load({ now:'2026-10-02T09:00:00+05:30' })); seed(e);
      const r = e.ctx.featureReport_();
      t.eq(r.live.length, 0, 'the register carries no modules to begin with');
      t.eq(r.skipped.length, 0, 'and has refused none');
      t.eq(e.get('diag', {}).features.live.length, 0, 'diag says so');
    }

    /* ---- 2. A MODULE ANSWERS, AND ONLY AFTER THE TOKEN IS CHECKED ---- */
    {
      const e = clean(mock.load({ now:'2026-10-02T09:00:00+05:30' })); seed(e);
      install(e, 'demo', `{
        title:'A demonstration',
        post:{ demoSave: function(b, u){ return json_({ ok:true, who:u.phone, got:b.value }); } },
        get:{  demo:     function(p, u){ return json_({ ok:true, who:u.phone, asked:p.q || '' }); } }
      }`);
      const cdm = tok(e, '9000000001');

      const w = e.post({ kind:'demoSave', token:cdm, value:'x' });
      t.eq(w.ok, true, 'the module answers a POST the core does not');
      t.eq(w.got, 'x', 'carrying what was sent');
      t.eq(w.who, '9000000001', 'AND THE AUTHENTICATED OFFICER — it never sees an anonymous call');

      const g = e.get('demo', { token:cdm, q:'hello' });
      t.eq(g.ok, true, 'and a GET');
      t.eq(g.asked, 'hello', 'with its parameters');

      /* THE GUARD THAT MATTERS: no token, no module */
      t.eq(e.post({ kind:'demoSave', token:'', value:'x' }).ok, false,
        'a caller with no token is refused before any module is reached');
      t.eq(e.get('demo', { token:'' }).ok, false, 'on the way out as well');

      t.eq(e.ctx.featureReport_().live[0].name, 'demo', 'diag names it');
      t.eq(e.ctx.featureReport_().live[0].post[0], 'demoSave', 'and what it answers');
    }

    /* ---- 3. IT MAY NOT TAKE OVER WHAT THE CORE ALREADY ANSWERS ----
       This is the guarantee the whole arrangement rests on. A feature that
       could claim 'attendance' or 'leave' could change what the register does
       with an officer's record while appearing to add something new. */
    {
      const e = clean(mock.load({ now:'2026-10-02T09:00:00+05:30' })); seed(e);
      install(e, 'greedy', `{
        post:{ attendance: function(b, u){ return json_({ ok:true, hijacked:true }); },
               login:      function(b, u){ return json_({ ok:true, hijacked:true }); } },
        get:{  roll:       function(p, u){ return json_({ ok:true, hijacked:true }); } }
      }`);
      const rep = e.ctx.featureReport_();
      t.eq(rep.live.length, 0, 'it is not loaded at all');
      t.eq(rep.skipped.length, 1, 'it is refused');
      t.contains(rep.skipped[0].why, 'already answers', 'and the refusal says why');

      /* and the core still behaves exactly as it did */
      const cdm = tok(e, '9000000001');
      const att = e.get('attendance', { token:cdm });
      t.eq(att.ok, true, 'the core still answers attendance');
      t.ok(!att.hijacked, 'and the module did not touch it');
      const lg = e.post({ kind:'login', u:'9000000001', p:'nope' });
      t.ok(!lg.hijacked, 'nor login');
    }

    /* ---- 3b. AND THE CORE IT IS CHECKED AGAINST IS READ OFF THE CODE ---- */
    {
      const e = clean(mock.load({ now:'2026-10-02T09:00:00+05:30' }));
      const kinds = e.ctx.coreKinds_(), ops = e.ctx.coreOps_();
      ['login','attendance','inspection','leave','gpdp','advPublish','userCreate','holidaysLoad']
        .forEach(k => t.eq(!!kinds[k], true, 'the core dispatch is seen to answer ' + k));
      ['roll','schedule','advisory','gpdp','diag'].forEach(o =>
        t.eq(!!ops[o], true, 'and op ' + o));
      t.ok(Object.keys(kinds).length > 20, 'read from doPost itself, not from a list — ' +
        Object.keys(kinds).length + ' kinds');
    }

    /* ---- 4. TWO MODULES MAY NOT CLAIM THE SAME THING ---- */
    {
      const e = clean(mock.load({ now:'2026-10-02T09:00:00+05:30' })); seed(e);
      install(e, 'first',  `{ post:{ shared: function(b,u){ return json_({ ok:true, from:'first' }); } } }`);
      install(e, 'second', `{ post:{ shared: function(b,u){ return json_({ ok:true, from:'second' }); } } }`);
      const rep = e.ctx.featureReport_();
      t.eq(rep.live.length, 1, 'only the first is loaded');
      t.eq(rep.live[0].name, 'first', 'the one that claimed it first');
      t.contains(rep.skipped[0].why, 'already answers kind', 'and the second is refused, by name');
      t.eq(e.post({ kind:'shared', token:tok(e, '9000000001') }).from, 'first',
        'so there is never a question of which one answered');
    }

    /* ---- 5. A MODULE THAT THROWS DOES NOT TAKE THE REGISTER DOWN ----
       Not while loading, and not while answering. */
    {
      const e = clean(mock.load({ now:'2026-10-02T09:00:00+05:30' })); seed(e);
      install(e, 'broken', `(function(){ throw new Error('bad module'); })()`);
      install(e, 'alsoBroken', `{ post:{ boom: function(b,u){ throw new Error('bang'); } } }`);
      install(e, 'fine', `{ post:{ fine: function(b,u){ return json_({ ok:true, fine:true }); } } }`);
      const cdm = tok(e, '9000000001');

      const rep = e.ctx.featureReport_();
      t.ok(rep.skipped.some(x => x.name === 'broken'), 'a module that throws while loading is skipped');
      t.contains(rep.skipped.find(x => x.name === 'broken').why, 'threw', 'and the reason is kept');
      t.ok(rep.live.some(x => x.name === 'fine'), 'while the others load');

      /* THE REGISTER IS UNDISTURBED */
      t.eq(e.get('attendance', { token:cdm }).ok, true, 'the core still answers');
      t.eq(e.post({ kind:'fine', token:cdm }).fine, true, 'and so does the module that works');

      /* one that throws while ANSWERING tells the caller and nothing else */
      const boom = e.post({ kind:'boom', token:cdm });
      t.eq(boom.ok, false, 'a module that throws mid-answer refuses plainly');
      t.eq(boom.feature, 'alsoBroken', 'naming itself, so the fault is placed at once');
      t.eq(e.get('attendance', { token:cdm }).ok, true, 'and the register is still answering after it');
      const aud = JSON.stringify(e.sheets['Audit'].rows);
      t.contains(aud, 'FEATURE FAILED', 'the failure is on the Audit tab');
    }

    /* ---- 6. A MODULE CAN BE CONFINED TO ONE REGISTER ---- */
    {
      const e = clean(mock.load({ now:'2026-10-02T09:00:00+05:30' })); seed(e);
      install(e, 'sanitationOnly', `{ tenants:['SJGP'], post:{ onlyHere: function(b,u){ return json_({ ok:true }); } } }`);
      t.eq(e.ctx.featureReport_().live.length, 1, 'it loads on the register it names');

      const g = clean(mock.load({ now:'2026-10-02T09:00:00+05:30' }));
      g.props.TENANT = 'GP';
      g.seedUsers();
      install(g, 'sanitationOnly', `{ tenants:['SJGP'], post:{ onlyHere: function(b,u){ return json_({ ok:true }); } } }`);
      const rep = g.ctx.featureReport_();
      t.eq(rep.live.length, 0, 'and not on the other');
      t.contains(rep.skipped[0].why, 'not for this register', 'which it says');
    }

    /* ---- 7. AND IT CAN BE SWITCHED OFF WITHOUT A DEPLOY ----
       The rollback. A feature misbehaving at four in the afternoon comes out
       of the road by a script property, not by a pipeline run. */
    {
      const e = clean(mock.load({ now:'2026-10-02T09:00:00+05:30' })); seed(e);
      install(e, 'suspect', `{ post:{ suspect: function(b,u){ return json_({ ok:true, ran:true }); } } }`);
      const cdm = tok(e, '9000000001');
      t.eq(e.post({ kind:'suspect', token:cdm }).ran, true, 'it answers while it is on');

      e.props.FEATURE_OFF = 'suspect';
      t.eq(e.ctx.featureReport_().live.length, 0, 'and is gone the moment the property is set');
      t.contains(e.ctx.featureReport_().skipped[0].why, 'switched off', 'saying so');
      t.eq(e.post({ kind:'suspect', token:cdm }).ok, false, 'the endpoint is simply not there any more');
      t.eq(e.get('attendance', { token:cdm }).ok, true, 'and nothing else is affected');

      /* and back again, without a deploy either way */
      e.props.FEATURE_OFF = '';
      t.eq(e.post({ kind:'suspect', token:cdm }).ran, true, 'clearing it brings the feature back');
    }

    /* ---- 9. THE FIRST REAL MODULE: the pre-flight ----
       Built as a module deliberately — it is the feature that says whether the
       others may be built, and it proves the arrangement on something the
       district actually uses rather than on a toy. */
    {
      const e = mock.load({ now:'2026-10-02T09:00:00+05:30' }); seed(e);   /* the REAL list */
      const cdm = tok(e, '9000000001'), ps = tok(e, '9000000014');

      t.eq(e.get('health', { token:ps }).ok, false, 'the health of the register is the Collector’s to read');
      t.eq(e.get('health', { token:'' }).ok, false, 'and not an anonymous caller’s');

      const h = e.get('health', { token:cdm });
      t.eq(h.ok, true, 'the Collector reads it');
      t.eq(h.allWell, false, 'and on a register with nothing installed it does NOT say all is well');
      t.ok(h.concerns.indexOf('triggers') >= 0, 'the daily jobs are named as a concern');
      t.ok(h.concerns.indexOf('backup') >= 0, 'and so is the backup — a folder that was never made');
      t.contains(JSON.stringify(h.triggers.missing), 'dailyCollectorReport', 'by job name');
      t.eq(h.mail.remaining, 100, 'the mail allowance is read, not guessed');
      t.contains(h.mail.looksLike, 'consumer', 'and the figure says which kind of account it is');
      t.eq(h.roll.ok, true, 'the roll is counted');
      t.eq(h.calendar.declared, true, 'the year is declared');
      t.eq(h.calendar.nextYearDeclared, false, 'and it says plainly that the next one is not');

      /* EVERY STEP IS CAUGHT ON ITS OWN. A register whose Drive is slow must
         still be able to tell the Collector about its triggers. */
      const broken = mock.load({ now:'2026-10-02T09:00:00+05:30' }); seed(broken);
      broken.ctx.DriveApp.getFoldersByName = function(){ throw new Error('Drive is having a day'); };
      const hb = broken.get('health', { token: tok(broken, '9000000001') });
      t.eq(hb.ok, true, 'Drive failing does not fail the whole pre-flight');
      t.contains(JSON.stringify(hb.backup), 'having a day', 'that one step carries its own error');
      t.ok(!!hb.triggers.installed, 'and every other step still answered');

      /* THE ONE ACTION, and it is idempotent (rule 8) */
      t.eq(e.post({ kind:'installJobs', token:ps }).ok, false, 'a Secretary cannot install the daily jobs');
      const i1 = e.post({ kind:'installJobs', token:cdm });
      t.eq(i1.ok, true, 'the Collector can');
      t.ok(i1.installed.indexOf('dailyCollectorReport') >= 0, 'and the evening report is among them');
      t.eq(e.get('health', { token:cdm }).triggers.ok, true, 'after which the pre-flight is content with them');
      const n1 = e.installed.length;
      e.post({ kind:'installJobs', token:cdm });
      t.eq(e.installed.length, n1, 'a second press installs nothing twice');
      t.contains(JSON.stringify(e.sheets['Audit'].rows), 'DAILY JOBS INSTALLED', 'and it is on the Audit tab');
    }

    /* ---- 8. AN UNKNOWN KIND IS STILL AN UNKNOWN KIND ----
       The hook must not swallow requests nobody answers, or a typo in the
       console would look like a silent success. */
    {
      const e = clean(mock.load({ now:'2026-10-02T09:00:00+05:30' })); seed(e);
      install(e, 'demo', `{ post:{ demoSave: function(b,u){ return json_({ ok:true }); } } }`);
      const cdm = tok(e, '9000000001');
      const r = e.post({ kind:'nothingAnswersThis', token:cdm });
      t.eq(r.ok, false, 'a kind nobody answers is still refused');
      t.ok(/unknown|evaluation/i.test(String(r.error)), 'by the core, as before — "' + r.error + '"');
    }
  }
};
