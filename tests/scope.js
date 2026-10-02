/* WHAT ONE .gs FILE MAY RELY ON FROM ANOTHER, AND WHEN.

   An Apps Script project is all of its files in ONE global scope, and they are
   parsed one after another. So:

     · a top-level `function` or `var` is hoisted and is visible to every file
       at any time, including while another file is still being parsed;
     · a top-level `const`, `let` or `class` is visible to every file too —
       they share the global lexical scope — but ONLY ONCE ITS OWN FILE HAS
       BEEN PARSED. Until then the binding is in its temporal dead zone and
       reading it is a ReferenceError.

   Every reference inside a function body is therefore safe, because no
   function here runs until doGet or doPost is called and parsing is long
   finished. That is why Admin.gs has read `H_HEAD`, `L_HEAD` and `U_HEAD`
   across the file boundary for weeks without a complaint.

   WHAT IS NOT SAFE is a reference in code that RUNS AS THE FILE IS PARSED —
   a top-level initialiser. `var FEATURE_MODULES = ['health','out']` is fine
   because the values are literals; `var X = A_HEAD.concat(…)` at the top level
   of a module is a coin toss settled by the order the project lists its files,
   and the order is not something this repository controls.

   THIS CHECK HAS ITSELF BEEN WRONG, which is worth writing down. Its first
   cut asserted that a top-level `const` was private to its file, and it
   reported fifty-three faults — forty of them in Admin.gs, in jobs the
   district has run. The premise was mine and it was false; the mock was not
   lying. A checker that is believed and wrong costs more than no checker, so
   this one now asserts only the narrow thing that is true, and says plainly
   what it does not check.

   It is static — read off the text, not off a run — so it needs no vm, no
   tenant and no fixture. tests/run.js calls it beside the parse gate.

   Usage: node tests/scope.js        (exits 1 if anything is out of scope)
*/
'use strict';
const fs = require('fs');
const path = require('path');
const BACKEND = path.join(__dirname, '..', 'backend');

const NL = String.fromCharCode(10);
const BS = String.fromCharCode(92);

/* COMMENTS AND STRING LITERALS ARE NOT CODE: `A_HEAD` named in a comment, or
   quoted inside a message, is not a reference to anything. They are blanked
   rather than removed, and newlines are kept, so every offset and every line
   number still points where it came from.

   SCANNED LEFT TO RIGHT, one character at a time, rather than with a handful
   of regexes. The regex version mis-paired a `/*` inside a string literal and
   blanked four hundred lines of Code.gs, so the declarations in them read as
   absent. A checker that is quietly blind over part of the file is worse than
   no checker, because it is believed. */
function strip(src){
  const out = [];
  let mode = 'code', quote = '';
  const blank = c => out.push(c === NL ? NL : ' ');
  for(let i = 0; i < src.length; i++){
    const c = src[i], d = src[i + 1];
    if(mode === 'code'){
      if(c === '/' && d === '*'){ mode = 'block'; out.push(' ', ' '); i++; continue; }
      if(c === '/' && d === '/'){ mode = 'line';  out.push(' ', ' '); i++; continue; }
      if(c === "'" || c === '"' || c === '`'){ mode = 'str'; quote = c; out.push(' '); continue; }
      out.push(c); continue;
    }
    if(mode === 'block'){
      if(c === '*' && d === '/'){ mode = 'code'; out.push(' ', ' '); i++; continue; }
      blank(c); continue;
    }
    if(mode === 'line'){
      if(c === NL){ mode = 'code'; out.push(NL); continue; }
      out.push(' '); continue;
    }
    /* inside a string: a backslash escapes whatever follows, and an
       unterminated quote ends at the newline rather than eating the rest of
       the file — which is how the regex version went blind */
    if(c === BS){ out.push(' ', ' '); i++; continue; }
    if(c === quote){ mode = 'code'; out.push(' '); continue; }
    if(c === NL && quote !== '`'){ mode = 'code'; out.push(NL); continue; }
    blank(c);
  }
  return out.join('');
}

/* what a file declares at the TOP LEVEL — column 0, which is how this
   codebase writes every one of them */
function declared(src){
  const lex = [], glob = [];
  src.split(/\r?\n/).forEach(l => {
    let m;
    if((m = /^(?:const|let|class)\s+([A-Za-z0-9_$]+)/.exec(l))) lex.push(m[1]);
    if((m = /^(?:function\s*\*?|var)\s+([A-Za-z0-9_$]+)/.exec(l))) glob.push(m[1]);
  });
  return { lex: lex, glob: glob };
}

/* WHICH OFFSETS RUN AS THE FILE IS PARSED: everything at brace depth nought.
   A function body is at depth one or more and does not run until the register
   is answering a request, by which time every file has been parsed. */
function topLevelMask(src){
  const mask = new Uint8Array(src.length);
  let depth = 0;
  for(let i = 0; i < src.length; i++){
    const c = src[i];
    if(c === '}' || c === ')' || c === ']') depth--;
    mask[i] = depth <= 0 ? 1 : 0;
    if(c === '{' || c === '(' || c === '[') depth++;
  }
  return mask;
}

/* every name a file binds anywhere — it is then its own, not somebody else's */
function bound(src){
  const out = new Set();
  let m;
  const re = /\b(?:const|let|var|function|class)\s+([A-Za-z0-9_$]+)/g;
  while((m = re.exec(src))) out.add(m[1]);
  const pr = /(?:function\s*[A-Za-z0-9_$]*\s*\(([^)]*)\)|catch\s*\(([^)]*)\)|\(([^)]*)\)\s*=>)/g;
  while((m = pr.exec(src)))
    String(m[1] || m[2] || m[3] || '').split(',').forEach(p => {
      const n = p.trim().replace(/[=:].*$/, '').trim();
      if(/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n)) out.add(n);
    });
  const sp = /([A-Za-z_$][A-Za-z0-9_$]*)\s*=>/g;
  while((m = sp.exec(src))) out.add(m[1]);
  return out;
}

function audit(){
  const files = fs.readdirSync(BACKEND).filter(f => /\.gs$/.test(f)).sort();
  const src = {}, dec = {}, mask = {};
  files.forEach(f => {
    src[f] = strip(fs.readFileSync(path.join(BACKEND, f), 'utf8'));
    dec[f] = declared(src[f]);
    mask[f] = topLevelMask(src[f]);
  });

  const faults = [];
  files.forEach(f => {
    const mine = bound(src[f]);
    files.forEach(other => {
      if(other === f) return;
      dec[other].lex.forEach(name => {
        if(mine.has(name)) return;                     /* its own, not theirs */
        const re = new RegExp('(^|[^.\\w$])(' + name.replace(/\$/g, '\\$') + ')(?![\\w$])', 'g');
        let m;
        while((m = re.exec(src[f]))){
          const atName = m.index + m[1].length;
          if(!mask[f][atName]) continue;               /* inside a function: safe */
          const line = src[f].slice(0, atName).split(NL).length;
          faults.push({ file: f, line: line, name: name, from: other,
                        text: src[f].split(/\r?\n/)[line - 1].trim().slice(0, 78) });
        }
      });
    });
  });
  return { files: files, faults: faults };
}

module.exports = { audit: audit, strip: strip };

if(require.main === module){
  const r = audit();
  if(!r.faults.length){
    console.log('  ✓  file scope: ' + r.files.length + ' backend file(s), no top-level code ' +
                'relies on another file having been parsed');
    process.exit(0);
  }
  console.log(NL + '  ✗  READ AS THE FILE IS PARSED, FROM A FILE THAT MAY NOT BE PARSED YET —' + NL +
                   '     a ReferenceError settled by the order the project lists its files:' + NL);
  r.faults.forEach(x => console.log('     ' + x.file + ':' + x.line + '  ' + x.name +
    '  is a top-level const/let in ' + x.from + NL + '        ' + x.text));
  console.log(NL + '     Move the reference inside a function, or declare the name as a `var`' + NL +
                   '     or a `function` where it is written, which hoists.' + NL);
  process.exit(1);
}
