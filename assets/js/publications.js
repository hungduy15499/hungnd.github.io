/*
 * Renders publications from a BibTeX file (bib/papers.bib) as plain-text,
 * IEEE-like citations.
 *
 *   @article        -> "Journal Articles"           [J1], [J2], ... (newest = highest number)
 *   @inproceedings  -> "Conference Proceedings"     [C1], [C2], ...
 *   @unpublished    -> "In Preparation/Submitted/Under Review" (bullets)
 *
 * Optional BibTeX fields:
 *   abbr  = {IoTJ}                    -> appended to venue: "IEEE ... Journal (IoTJ)"
 *   note  = {Submitted to IEEE IoTJ}  -> shown in italics at the end
 *   doi / url                         -> title becomes a link
 *   arxiv = {2501.01234}              -> [arXiv] link
 *   pdf / code                        -> [PDF] / [Code] links
 *   address, month                    -> used for conference papers
 *
 * Corresponding authors (list `corresponding` in _config.yml) get a superscript *.
 */
(function (root) {
  'use strict';

  var MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  var MONTH_LABEL = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];

  var GROUPS = [
    { key: 'submitted', title: 'In Preparation/Submitted/Under Review', types: ['unpublished', 'misc'], prefix: null },
    { key: 'journal', title: 'Journal Articles', types: ['article'], prefix: 'J' },
    { key: 'conference', title: 'Conference Proceedings', types: ['inproceedings', 'conference'], prefix: 'C' }
  ];

  // ---------- BibTeX parsing ----------
  function parseBib(text) {
    var entries = [];
    var i = 0, n = text.length, order = 0;
    while (i < n) {
      var at = text.indexOf('@', i);
      if (at < 0) break;
      var brace = text.indexOf('{', at);
      if (brace < 0) break;
      var type = text.slice(at + 1, brace).trim().toLowerCase();
      // find matching closing brace
      var depth = 0, j = brace;
      for (; j < n; j++) {
        if (text[j] === '{') depth++;
        else if (text[j] === '}') { depth--; if (depth === 0) break; }
      }
      var body = text.slice(brace + 1, j);
      i = j + 1;
      if (!/^[a-z]+$/.test(type) || type === 'comment' || type === 'string' || type === 'preamble') continue;
      var comma = body.indexOf(',');
      var entry = { type: type, key: body.slice(0, comma).trim(), fields: {}, order: order++ };
      parseFields(body.slice(comma + 1), entry.fields);
      entries.push(entry);
    }
    return entries;
  }

  function parseFields(s, out) {
    var i = 0, n = s.length;
    while (i < n) {
      var eq = s.indexOf('=', i);
      if (eq < 0) break;
      var name = s.slice(i, eq).replace(/[\s,]/g, '').toLowerCase();
      var k = eq + 1;
      while (k < n && /\s/.test(s[k])) k++;
      var value = '';
      if (s[k] === '{') {
        var depth = 0, start = k;
        for (; k < n; k++) {
          if (s[k] === '{') depth++;
          else if (s[k] === '}') { depth--; if (depth === 0) break; }
        }
        value = s.slice(start + 1, k);
        k++;
      } else if (s[k] === '"') {
        var start2 = ++k;
        while (k < n && s[k] !== '"') k++;
        value = s.slice(start2, k);
        k++;
      } else {
        var start3 = k;
        while (k < n && s[k] !== ',') k++;
        value = s.slice(start3, k).trim();
      }
      if (name) out[name] = cleanLatex(value);
      var next = s.indexOf(',', k);
      i = next < 0 ? n : next + 1;
    }
  }

  function cleanLatex(v) {
    var acc = { '"': '̈', "'": '́', '`': '̀', '^': '̂', '~': '̃', 'c': '̧', 'v': '̌', '=': '̄' };
    v = v.replace(/\\([`'"^~=]|[cv](?=[\s{]))\s*\{?\s*([A-Za-z])\}?/g, function (m, a, ch) {
      return (ch + acc[a]).normalize('NFC');
    });
    v = v.replace(/\\&/g, '&').replace(/\\%/g, '%').replace(/\\_/g, '_')
         .replace(/---/g, '—').replace(/--/g, '–')
         .replace(/``/g, '“').replace(/''/g, '”')
         .replace(/\\textendash/g, '–').replace(/\\textemdash/g, '—')
         .replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
    return v;
  }

  // ---------- Names ----------
  function parseName(raw) {
    raw = raw.trim();
    var last, first;
    if (raw.indexOf(',') >= 0) {
      var p = raw.split(',');
      last = p[0].trim(); first = p.slice(1).join(' ').trim();
    } else {
      var w = raw.split(/\s+/);
      last = w.pop(); first = w.join(' ');
    }
    return { first: first, last: last };
  }

  function initials(first) {
    return first.split(/[\s]+/).filter(Boolean).map(function (part) {
      return part.split('-').map(function (h) { return h.charAt(0).toUpperCase() + '.'; }).join('-');
    }).join(' ');
  }

  // Same person? last name equal, and first name starts with the same first word.
  function sameName(a, b) {
    if (!a || !b || !a.last || !b.last) return false;
    var fa = (a.first.split(/\s+/)[0] || '').toLowerCase();
    var fb = (b.first.split(/\s+/)[0] || '').toLowerCase();
    return a.last.toLowerCase() === b.last.toLowerCase() &&
      (fa.indexOf(fb) === 0 || fb.indexOf(fa) === 0);
  }

  function isCorresponding(nm, list) {
    for (var i = 0; i < (list || []).length; i++) if (sameName(nm, list[i])) return true;
    return false;
  }

  function isMe(name, me) {
    if (!me || !me.last) return false;
    return name.last.toLowerCase() === me.last.toLowerCase() &&
      name.first.toLowerCase().indexOf(me.first.split(/\s+/)[0].toLowerCase()) === 0;
  }

  function formatAuthors(str, me, corr) {
    if (!str) return '';
    var names = str.split(/\s+and\s+/i).map(parseName);
    var parts = names.map(function (nm) {
      var star = isCorresponding(nm, corr) ? '<span class="pub-corr" title="Corresponding author">*</span>' : '';
      if (isMe(nm, me)) return '<strong class="pub-me">' + esc(me.display || (nm.first + ' ' + nm.last)) + '</strong>' + star;
      if (nm.last.toLowerCase() === 'others') return 'et al.';
      return esc((initials(nm.first) + ' ' + nm.last).trim()) + star;
    });
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return parts[0] + ' and ' + parts[1];
    return parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1];
  }

  // ---------- Formatting ----------
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function monthIndex(m) {
    if (!m) return -1;
    var x = String(m).toLowerCase().slice(0, 3);
    var k = MONTHS.indexOf(x);
    if (k >= 0) return k;
    var num = parseInt(m, 10);
    return isNaN(num) ? -1 : num - 1;
  }

  function link(href, text) {
    return '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + text + '</a>';
  }

  function formatEntry(e, me, corr) {
    var f = e.fields;
    var out = [];
    var href = f.doi ? 'https://doi.org/' + f.doi : (f.url || '');
    var title = esc(f.title || 'Untitled');
    var titleHtml = href ? link(href, title) : title;
    out.push(formatAuthors(f.author, me, corr) + ', “' + titleHtml + ',”');

    var venue = f.journal || f.booktitle || '';
    if (venue) {
      var v = esc(venue) + (f.abbr ? ' (' + esc(f.abbr) + ')' : '');
      out.push((e.type === 'unpublished' || e.type === 'misc' ? '' : 'in ') + '<em>' + v + '</em>,');
    }

    var tail = [];
    if (f.address && (e.type === 'inproceedings' || e.type === 'conference')) tail.push(esc(f.address));
    if (f.volume) tail.push('vol. ' + esc(f.volume));
    if (f.number) tail.push('no. ' + esc(f.number));
    if (f.pages && e.type === 'article') tail.push('pp. ' + esc(f.pages.replace(/-+/g, '–')));
    var mi = monthIndex(f.month);
    var date = (mi >= 0 ? MONTH_LABEL[mi] + ' ' : '') + (f.year || '');
    if (date.trim() && e.type !== 'unpublished') tail.push(esc(date.trim()));
    var text = out.join(' ');
    if (tail.length) text += ' ' + tail.join(', ');
    text = text.replace(/,$/, '');
    if (f.note) text += (tail.length || venue ? ', ' : ' ') + '<em class="pub-note">' + esc(f.note) + '</em>';
    text += '.';

    var extra = [];
    if (f.arxiv) extra.push(link('https://arxiv.org/abs/' + f.arxiv, 'arXiv'));
    if (f.pdf) extra.push(link(f.pdf, 'PDF'));
    if (f.code) extra.push(link(f.code, 'Code'));
    if (extra.length) text += ' <span class="pub-links">' + extra.map(function (x) { return '[' + x + ']'; }).join(' ') + '</span>';
    return text;
  }

  function sortKey(e) {
    var y = parseInt(e.fields.year, 10) || 0;
    var m = monthIndex(e.fields.month);
    return [y, m, -e.order];
  }

  function newestFirst(a, b) {
    var ka = sortKey(a), kb = sortKey(b);
    for (var i = 0; i < 3; i++) if (ka[i] !== kb[i]) return kb[i] - ka[i];
    return 0;
  }

  // Returns HTML. opts: { me: {first,last,display}, max: N (recent mode) }
  function render(bibText, opts) {
    opts = opts || {};
    var entries = parseBib(bibText);
    var labelled = [];
    var html = '';

    GROUPS.forEach(function (g) {
      var items = entries.filter(function (e) { return g.types.indexOf(e.type) >= 0; }).sort(newestFirst);
      items.forEach(function (e, idx) {
        e.label = g.prefix ? '[' + g.prefix + (items.length - idx) + ']' : null;
        e.group = g.key;
      });
      if (!opts.max && items.length) {
        html += '<section class="pub-group pub-' + g.key + '"><h2>' + g.title + '</h2>' +
          '<ul class="' + (g.prefix ? 'pub-list numbered' : 'pub-list bulleted') + '">' +
          items.map(function (e) {
            return '<li>' + (e.label ? '<span class="pub-label">' + e.label + '</span> ' : '') + formatEntry(e, opts.me, opts.corresponding) + '</li>';
          }).join('') + '</ul></section>';
      }
      if (g.prefix) labelled = labelled.concat(items);
    });

    if (opts.max) {
      var recent = labelled.sort(newestFirst).slice(0, opts.max);
      html = '<ul class="pub-list numbered">' + recent.map(function (e) {
        return '<li><span class="pub-label">' + e.label + '</span> ' + formatEntry(e, opts.me, opts.corresponding) + '</li>';
      }).join('') + '</ul>';
    }
    return html;
  }

  root.PubRender = { parseBib: parseBib, render: render };

  // ---------- Browser bootstrap ----------
  if (typeof document !== 'undefined') {
    var start = function () {
      var nodes = document.querySelectorAll('[data-bib]');
      Array.prototype.forEach.call(nodes, function (el) {
        fetch(el.getAttribute('data-bib'), { cache: 'no-cache' })
          .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
          .then(function (txt) {
            el.innerHTML = render(txt, {
              me: { first: el.dataset.meFirst || '', last: el.dataset.meLast || '', display: el.dataset.meDisplay || '' },
              max: el.dataset.max ? parseInt(el.dataset.max, 10) : 0,
              corresponding: (el.dataset.corresponding || '').split(';').filter(function (x) { return x.trim(); }).map(parseName)
            });
          })
          .catch(function (err) {
            el.innerHTML = '<p class="text-text-muted">Could not load publications (' + esc(err.message) + ').</p>';
          });
      });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }
})(typeof window !== 'undefined' ? window : globalThis);
