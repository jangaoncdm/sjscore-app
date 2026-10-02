/* ============================================================================
 * FEATURE · HEALTH — is this register fit to be changed?
 * ----------------------------------------------------------------------------
 * The pre-flight check, asked of the register itself before a new series of
 * features goes near it. It answers the questions that have each cost a day:
 *
 *   · are the daily jobs actually installed? The evening report and the
 *     09:00 schedule reminder run from triggers, and a trigger that was never
 *     installed looks exactly like a trigger that is working: nothing arrives,
 *     and nothing says why;
 *   · is the nightly backup running? A backup that fails quietly is a belief,
 *     not a backup. This names the days that are MISSING by walking the
 *     calendar rather than the folder, because a folder that has been failing
 *     for three weeks looks exactly like one that is working;
 *   · how much mail is left today? 414 officers share one allowance, and on a
 *     consumer account it is a hundred. "Send to all" reaches a hundred of
 *     them and fails silently for the rest;
 *   · and what the register holds: the roll, the calendar, the feature
 *     modules it is carrying.
 *
 * IT IS THE FIRST FEATURE BUILT AS A MODULE, deliberately: it is the one that
 * says whether the rest may be built. Nothing of it is in Code.gs.
 *
 * EVERY STEP IS CAUGHT ON ITS OWN, exactly as each backup step is. A register
 * whose Drive is slow must still be able to tell you about its triggers.
 * READ-ONLY, except for one action the Collector may take: installing the
 * daily jobs, which is a Code.gs function and not an Admin.gs one.
 * ========================================================================== */
function feature_health(){
  return {
    title: 'Pre-flight — triggers, backup, mail allowance and what is loaded',

    get: {
      health: function(p, u){
        if(u.role !== 'COLLECTOR')
          return json_({ ok:false, error:'The register’s health is the Collector’s to read.' });
        const out = { ok:true, at:new Date().toISOString(), today:today_(),
                      tenant:tenant_().key, tenantName:tenant_().name };

        /* ---- the daily jobs ---- */
        out.triggers = (function(){
          try{
            const want = { dailyCollectorReport:'the evening report, ~19:00',
                           villageFilingReminders:'the filing chase, ~10:00',
                           scheduleReminders:'the schedule reminder, ~09:00',
                           dailyBackup:'the nightly backup, ~01:00',
                           featureDaily:'the feature modules’ daily round, ~07:00',
                           autoCloseDay:'', issueAbsenceNotices:'', settleAbsenceDebits:'' };
            const have = {};
            ScriptApp.getProjectTriggers().forEach(function(t){
              have[t.getHandlerFunction()] = true;
            });
            const missing = Object.keys(want).filter(function(k){ return want[k] && !have[k]; });
            return { installed:Object.keys(have).sort(), missing:missing,
                     ok: missing.length === 0 };
          }catch(err){ return { error:String(err) }; }
        })();

        /* ---- the mail allowance, shared by both registers ---- */
        out.mail = (function(){
          try{
            const left = MailApp.getRemainingDailyQuota();
            return { remaining:left,
                     /* a consumer account is 100 a day, Workspace 1,500. The
                        figure itself tells which, without guessing. */
                     looksLike: left > 200 ? 'a Workspace allowance' : 'a consumer allowance',
                     ok: left > 0 };
          }catch(err){ return { error:String(err) }; }
        })();

        /* ---- the nightly backup, by the calendar and not by the folder ---- */
        out.backup = (function(){
          try{
            const it = DriveApp.getFoldersByName(BACKUP_FOLDER);
            if(!it.hasNext()) return { ok:false, why:'no ' + BACKUP_FOLDER + ' folder yet' };
            const folder = it.next();
            const days = {};
            let newest = '', n = 0;
            const files = folder.getFiles();
            while(files.hasNext()){
              const f = files.next(), nm = f.getName();
              const m = nm.match(/(\d{4}-\d{2}-\d{2})/);
              if(!m) continue;
              n++; days[m[1]] = true;
              if(m[1] > newest) newest = m[1];
            }
            /* walk the last fourteen days and name the ones with nothing */
            const missing = [];
            for(let i = 1; i <= 14; i++){
              const d = new Date(today_() + 'T00:00:00');
              d.setDate(d.getDate() - i);
              const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
                          '-' + String(d.getDate()).padStart(2, '0');
              if(!days[key]) missing.push(key);
            }
            return { files:n, newest:newest, missingLast14:missing,
                     ok: missing.length === 0 && !!newest };
          }catch(err){ return { error:String(err) }; }
        })();

        /* ---- what the register holds ---- */
        out.roll = (function(){
          try{
            const t = uidx_(), v = t.sh.getDataRange().getValues();
            let active = 0, noPin = 0;
            const seen = {};
            for(let i = 1; i < v.length; i++){
              const ph = phone10_(v[i][t.ix.phone]); if(!ph) continue;
              const a = t.ix.active < 0 ? true : !(v[i][t.ix.active] === false ||
                        String(v[i][t.ix.active]).toUpperCase() === 'FALSE');
              if(!a || seen[ph]) continue;
              seen[ph] = true; active++;
              if(!v[i][t.ix.hash]) noPin++;
            }
            return { active:active, withoutPin:noPin, ok: active > 0 };
          }catch(err){ return { error:String(err) }; }
        })();

        out.calendar = (function(){
          try{
            const y = today_().slice(0, 4);
            const set = holidaySet_();
            const n = Object.keys(set).filter(function(k){ return k.slice(0, 4) === y; }).length;
            return { year:Number(y), days:n, declared: !!orderYear_(y),
                     nextYearDeclared: !!orderYear_(String(Number(y) + 1)),
                     ok: n > 0 };
          }catch(err){ return { error:String(err) }; }
        })();

        out.features = (function(){ try{ return featureReport_(); }catch(err){ return { error:String(err) }; } })();

        /* one word for the whole thing, so a console can show a light */
        const parts = ['triggers','mail','backup','roll','calendar'];
        out.allWell = parts.every(function(k){ return out[k] && out[k].ok === true; });
        out.concerns = parts.filter(function(k){ return !(out[k] && out[k].ok === true); });
        return json_(out);
      }
    },

    post: {
      /* THE ONE ACTION, and it is a Code.gs job and not an Admin.gs one, so
         no rule is bent by offering it on a screen the Collector is already
         looking at. It is idempotent: installReportTriggers deletes its own
         triggers before creating them, so a nervous second press changes
         nothing (rule 8). */
      installJobs: function(b, u){
        if(u.role !== 'COLLECTOR')
          return json_({ ok:false, error:'The district’s daily jobs are installed by the Collector alone.' });
        try{
          installReportTriggers();
          /* AND THE BACKUP, which installReportTriggers does not do. They were
             two separate editor jobs and nothing ever said so; a district that
             pressed the one button it was given had reports and no backup, and
             a backup that was never installed looks exactly like one that is
             working. Both are idempotent, so this stays idempotent. */
          installBackupTrigger();
          /* and the one trigger every feature's daily work runs on, so a new
             feature never needs the editor opened again */
          installFeatureTrigger();
          const have = [];
          ScriptApp.getProjectTriggers().forEach(function(t){ have.push(t.getHandlerFunction()); });
          admAudit_('DAILY JOBS INSTALLED', tenant_().key,
            have.sort().join(', ') + ' — by ' + u.name + ' (' + u.phone + ')');
          return json_({ ok:true, installed:have.sort() });
        }catch(err){
          return json_({ ok:false, error:'They could not be installed: ' + err });
        }
      }
    }
  };
}
