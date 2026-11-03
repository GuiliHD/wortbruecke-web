/* Wortbrücke – kleine Helfer für die Webseite. Kein Tracking, keine Netzwerkanfragen, keine Speicherung.
   1) Ersatzbild, falls ein Screenshot fehlt
   2) App-Store-Knopf zeigt „Bald im App Store“, solange der Platzhalter [APPSTORE_URL] drinsteht
   3) Mini-Rätsel „Probier es aus“ */
(function () {
  'use strict';

  /* ---------- 1) Screenshot-Ersatz ---------- */
  document.querySelectorAll('[data-bild] img').forEach(function (img) {
    var fig = img.closest('[data-bild]');
    var fehlt = function () { fig.classList.add('fehlt'); };
    if (img.complete && img.naturalWidth === 0) fehlt();
    else img.addEventListener('error', fehlt);
  });

  /* ---------- 2) App-Store-Platzhalter ---------- */
  document.querySelectorAll('[data-appstore]').forEach(function (a) {
    var href = a.getAttribute('href') || '';
    if (href.indexOf('[') === -1 && href !== '' && href !== '#') return; // echte Adresse eingetragen
    a.classList.add('bald');
    a.setAttribute('aria-disabled', 'true');
    a.removeAttribute('href');
    var klein = a.querySelector('[data-appstore-klein]');
    if (klein) klein.textContent = 'Bald im';
  });

  /* ---------- 3) Mini-Rätsel ---------- */
  var form = document.getElementById('kette');
  if (!form) return;
  var meldung = document.getElementById('probe-meldung');
  var tippKnopf = document.getElementById('probe-tipp');
  var reihen = Array.prototype.slice.call(form.querySelectorAll('.reihe.offen'));
  var tippsUebrig = 3;
  var fehler = 0;

  function felder(reihe) { return Array.prototype.slice.call(reihe.querySelectorAll('input.k')); }
  function alleFelder() { return reihen.reduce(function (a, r) { return a.concat(r.classList.contains('geloest') ? [] : felder(r)); }, []); }
  function normal(s) { return (s || '').toLocaleUpperCase('de-DE').replace(/[^A-ZÄÖÜẞß]/g, '').replace(/ẞ/g, 'ß'); }
  function wortVon(reihe) {
    return reihe.querySelector('.gegeben').textContent + felder(reihe).map(function (i) { return i.value; }).join('');
  }
  function sag(text, art) {
    meldung.textContent = text;
    meldung.className = 'meldung' + (art ? ' ' + art : '');
  }
  function tippText() {
    tippKnopf.lastChild.textContent = tippsUebrig > 0 ? ' Tipp (' + tippsUebrig + ')' : ' Keine Tipps';
    tippKnopf.disabled = tippsUebrig === 0 || alleFelder().length === 0;
  }

  reihen.forEach(function (reihe) {
    felder(reihe).forEach(function (input, idx, liste) {
      input.addEventListener('input', function () {
        var v = normal(input.value);
        input.value = v.slice(-1);
        input.classList.toggle('voll', input.value !== '');
        if (input.value && idx < liste.length - 1) liste[idx + 1].focus();
        else if (input.value) {
          var alle = alleFelder(); var pos = alle.indexOf(input);
          if (pos > -1 && pos < alle.length - 1) alle[pos + 1].focus();
        }
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !input.value && idx > 0) {
          var vor = liste[idx - 1];
          if (!vor.readOnly) { vor.value = ''; vor.classList.remove('voll'); }
          vor.focus(); e.preventDefault();
        } else if (e.key === 'ArrowLeft' && idx > 0) { liste[idx - 1].focus(); e.preventDefault(); }
        else if (e.key === 'ArrowRight' && idx < liste.length - 1) { liste[idx + 1].focus(); e.preventDefault(); }
      });
      input.addEventListener('focus', function () { input.select(); });
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var offen = reihen.filter(function (r) { return !r.classList.contains('geloest'); });
    if (!offen.length) return;
    var neuGeloest = 0, unvollstaendig = false, falsch = [];
    offen.forEach(function (r) {
      var w = normal(wortVon(r));
      var ok = [r.dataset.loesung].concat(r.dataset.auch ? [r.dataset.auch] : []);
      if (w.length < r.dataset.loesung.length) { unvollstaendig = true; return; }
      if (ok.indexOf(w) > -1) {
        r.classList.add('geloest');
        felder(r).forEach(function (i) { i.readOnly = true; i.tabIndex = -1; });
        neuGeloest++;
      } else falsch.push(r);
    });
    markiereVerbindungen();
    falsch.forEach(function (r) {
      r.classList.remove('wackeln'); void r.offsetWidth; r.classList.add('wackeln');
    });
    if (falsch.length) fehler++;
    var rest = reihen.filter(function (r) { return !r.classList.contains('geloest'); });
    if (!rest.length) {
      sag('Brücke gebaut! Haustür, Türschloss, Schlossgarten' + (fehler ? '' : ' – ganz ohne Fehler') + '.', 'gut');
    } else if (falsch.length) {
      sag('Das passt noch nicht. Denk an beide Nachbarn – oben und unten.', 'schlecht');
      felder(falsch[0]).filter(function (i) { return !i.readOnly; })[0].focus();
    } else if (neuGeloest) {
      sag('Richtig! Weiter mit der nächsten Lücke.', 'gut');
      var naechstes = alleFelder().filter(function (i) { return !i.value; })[0];
      if (naechstes) naechstes.focus();
    } else if (unvollstaendig) {
      sag('Füll erst alle Kästchen einer Lücke aus.', '');
    }
    tippText();
  });

  tippKnopf.addEventListener('click', function () {
    if (tippsUebrig === 0) return;
    var r = reihen.filter(function (x) { return !x.classList.contains('geloest'); })[0];
    if (!r) return;
    var loesung = r.dataset.loesung.slice(1).split('');
    var f = felder(r);
    for (var i = 0; i < f.length; i++) {
      if (f[i].readOnly) continue;
      if (f[i].value !== loesung[i]) {
        f[i].value = loesung[i]; f[i].readOnly = true; f[i].classList.add('tipp', 'voll');
        tippsUebrig--;
        sag('Ein Buchstabe ist aufgedeckt.', '');
        var weiter = f.filter(function (x) { return !x.readOnly; })[0];
        if (weiter) weiter.focus();
        break;
      }
    }
    tippText();
  });

  function markiereVerbindungen() {
    var g = reihen.map(function (r) { return r.classList.contains('geloest'); });
    var texte = [
      g[0] ? 'Haus·tür' : 'Haus·…',
      g[0] && g[1] ? 'Tür·schloss' : (g[0] ? 'Tür·…' : (g[1] ? '…·schloss' : '…·…')),
      g[1] ? 'Schloss·garten' : '…·garten'
    ];
    var fertig = [g[0], g[0] && g[1], g[1]];
    form.querySelectorAll('.verbindung').forEach(function (v, i) {
      v.querySelector('span').textContent = texte[i];
      v.classList.toggle('fertig', !!fertig[i]);
    });
  }

  form.classList.add('aktiv');
  tippText();
})();
