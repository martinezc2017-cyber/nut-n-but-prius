/* The owner's bookings page: counters, month calendar, the ones to confirm, each booking with its buttons, add by hand,
   and "Add to my phone calendar" (.ics) so his phone reminds him. Data: /api/shop/* (needs the password cookie). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const ST = { new: 'To confirm', confirmed: 'Confirmed', done: 'Done', 'no-show': 'No-show', canceled: 'Canceled' };
  const VIA = { text: 'Booked by text: look in your messages for a text with this number. If none came, they didn’t hit send.', email: 'Sent by email from the website.', manual: 'Added by you.' };
  const SLOT_TIME = { morning: '10:00', afternoon: '14:00', 'any time': '12:00' };
  let data = null, month = null, selected = null, current = null;

  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const fromIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const time12 = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return ((h + 11) % 12 + 1) + ':' + pad(m) + (h < 12 ? ' AM' : ' PM'); };
  const longDay = s => fromIso(s).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const digits = s => String(s || '').replace(/\D/g, '');
  const telOf = p => { const d = digits(p); return d.length === 10 ? '+1' + d : d.length > 10 ? '+' + d : ''; };

  async function api(path, opts = {}) {
    const r = await fetch(path, { ...opts, headers: { 'content-type': 'application/json' }, credentials: 'same-origin' });
    if (r.status === 401) { location.href = '/shop/'; throw new Error('login'); }
    return r.json();
  }
  async function load() {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const from = new Date(first); from.setDate(1 - first.getDay());          // the calendar shows whole weeks
    const to = new Date(from); to.setDate(from.getDate() + 41);
    data = await api(`/api/shop/data?from=${iso(from)}&to=${iso(to)}`);
    if (!selected) selected = data.today;
    render();
  }

  function card(b) {
    const when = b.exact_time ? time12(b.exact_time) : (b.slot || '—');
    const sub = b.day_iso && b.day_iso !== selected ? fromIso(b.day_iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '#' + b.ref.slice(-4);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'card st-' + b.status;
    el.innerHTML = `<span class="when">${esc(when)}<small>${esc(sub)}</small></span>
      <span class="who"><b>${esc(b.name || 'No name')}</b><span>${esc(b.service)}${b.car ? ' · ' + esc(b.car) : ''}</span></span>
      <span class="chip">${ST[b.status] || b.status}</span>`;
    el.addEventListener('click', () => openDetail(b));
    return el;
  }
  function fill(box, list, empty) {
    box.innerHTML = '';
    if (!list.length) { box.innerHTML = `<p class="empty">${empty}</p>`; return; }
    list.forEach(b => box.appendChild(card(b)));
  }

  function render() {
    const s = data.stats || {}, g = (k, p) => (s[k] && s[k][p]) || 0;
    const coming = data.coming || 0;
    const booked7 = g('booking_text', 'week') + g('booking_email', 'week');
    $('#counts').innerHTML = [
      [data.pending.length, 'To confirm', 'text or call them', data.pending.length > 0],
      [coming, 'Coming up', 'next 7 days'],
      [g('visit', 'today'), 'Visits today', g('visit', 'week') + ' in 7 days'],
      [booked7, 'Booked online', (g('call', 'week') + g('text', 'week')) + ' calls & texts · 7 days'],
    ].map(([n, l, sub, hot]) => `<div class="count${hot ? ' hot' : ''}"><b>${n}</b><span>${l}</span><small>${sub}</small></div>`).join('');

    $('#pendingBlock').hidden = !data.pending.length;
    $('#pendingN').textContent = data.pending.length;
    fill($('#pendingList'), data.pending, '');

    // month grid
    $('#monthName').textContent = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
    const cal = $('#cal');
    cal.innerHTML = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => `<span class="dow">${d}</span>`).join('');
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first); start.setDate(1 - first.getDay());
    const byDay = {};
    data.bookings.forEach(b => { (byDay[b.day_iso] = byDay[b.day_iso] || []).push(b); });
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const k = iso(d), list = byDay[k] || [];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'day' + (d.getMonth() !== month.getMonth() ? ' other' : '') + (k === data.today ? ' today' : '') + (k === selected ? ' sel' : '') + (d.getDay() === 0 ? ' sun' : '');
      btn.setAttribute('aria-label', longDay(k) + (list.length ? ', ' + list.length + ' booking' + (list.length > 1 ? 's' : '') : ''));
      btn.innerHTML = `${d.getDate()}<span class="dots">${list.slice(0, 6).map(b => `<i class="st-${b.status}"></i>`).join('')}</span>`;
      btn.addEventListener('click', () => { selected = k; render(); $('#dayName').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      cal.appendChild(btn);
    }
    $('#dayName').textContent = (selected === data.today ? 'TODAY · ' : '') + longDay(selected).toUpperCase();
    fill($('#dayList'), byDay[selected] || [], 'No bookings this day.');
    $('#noDateBlock').hidden = !data.noDate.length;
    fill($('#noDateList'), data.noDate, '');
  }

  // ---------- one booking ----------
  const detail = $('#detail');
  function openDetail(b) {
    current = { ...b };
    $('#dRef').textContent = 'BOOKING #' + b.ref;
    $('#dTitle').textContent = b.name || 'No name';
    $('#dVia').textContent = VIA[b.via] || '';
    const rows = [['Service', b.service], ['Car', b.car], ['Asked for', [b.day, b.slot].filter(Boolean).join(', ')], ['Where', b.location], ['Notes', b.notes]];
    $('#dInfo').innerHTML = rows.filter(r => r[1]).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v).replace(/\n/g, '<br>')}</dd>`).join('');
    const tel = telOf(b.phone);
    $('#dContact').innerHTML = tel ? `<a class="btn fire" href="sms:${tel}">Text ${esc(b.phone)}</a><a class="btn blue" href="tel:${tel}">Call</a>` : '';
    $('#dDay').value = b.day_iso || '';
    $('#dTime').value = b.exact_time || '';
    $('#dPhone').value = b.phone || '';
    $('#dNote').value = b.owner_note || '';
    markStatus(b.status);
    $('#dMsg').hidden = true;
    detail.showModal();
  }
  function markStatus(st) {
    current.status = st;
    detail.querySelectorAll('[data-st]').forEach(x => x.classList.toggle('on', x.dataset.st === st));
  }
  $('#dStatus').addEventListener('click', e => { const x = e.target.closest('[data-st]'); if (x) markStatus(x.dataset.st); });
  $('#dSave').addEventListener('click', async () => {
    const body = { status: current.status, day_iso: $('#dDay').value, exact_time: $('#dTime').value, owner_note: $('#dNote').value, phone: $('#dPhone').value.trim() };
    const r = await api('/api/shop/booking/' + current.ref, { method: 'PATCH', body: JSON.stringify(body) }).catch(() => ({ ok: false }));
    const m = $('#dMsg');
    m.hidden = false; m.className = 'msg' + (r.ok ? '' : ' bad');
    m.textContent = r.ok ? 'Saved.' : 'Could not save. Check your signal and try again.';
    if (r.ok) { if (body.day_iso) { selected = body.day_iso; const d = fromIso(body.day_iso); month = new Date(d.getFullYear(), d.getMonth(), 1); } setTimeout(() => detail.close(), 500); load(); }
  });
  // .ics: the phone's own calendar app adds it, with a reminder an hour before
  $('#dIcs').addEventListener('click', () => {
    const day = $('#dDay').value || current.day_iso;
    if (!day) { const m = $('#dMsg'); m.hidden = false; m.className = 'msg bad'; m.textContent = 'Pick a day first.'; return; }
    const t = ($('#dTime').value || current.exact_time || SLOT_TIME[current.slot] || '10:00').split(':').map(Number);
    const s = fromIso(day); s.setHours(t[0], t[1]);
    const e = new Date(s.getTime() + 60 * 6e4);
    const f = d => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
    const txt = v => String(v || '').replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
    const desc = [`Booking #${current.ref}`, current.service, current.car, current.phone ? 'Phone ' + current.phone : '', current.notes, $('#dNote').value].filter(Boolean).join('\n');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nut N But Prius//Bookings//EN', 'BEGIN:VEVENT',
      'UID:' + current.ref + '@nutnbutprius.com', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
      'DTSTART:' + f(s), 'DTEND:' + f(e), 'SUMMARY:' + txt((current.name || 'Booking') + ' · ' + current.service),
      'DESCRIPTION:' + txt(desc), 'LOCATION:Nut N But Prius\\, 35th Ave & Bell Rd\\, Glendale AZ',
      'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:' + txt(current.name + ' · ' + current.service), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'booking-' + current.ref + '.ics';
    document.body.appendChild(a); a.click(); a.remove();
  });

  // ---------- add by hand ----------
  const add = $('#add');
  $('#addBtn').addEventListener('click', () => { $('#addForm').reset(); $('#aDay').value = selected || data.today; $('#aMsg').hidden = true; add.showModal(); });
  $('#addForm').addEventListener('submit', async e => {
    e.preventDefault();
    const day = $('#aDay').value;
    const body = { name: $('#aName').value.trim(), phone: $('#aPhone').value.trim(), service: $('#aService').value, year: $('#aCar').value.trim(),
      date: day, day: day ? longDay(day) : '', exact_time: $('#aTime').value, notes: $('#aNotes').value.trim() };
    const r = await api('/api/shop/booking', { method: 'POST', body: JSON.stringify(body) }).catch(() => ({ ok: false }));
    const m = $('#aMsg');
    m.hidden = false; m.className = 'msg' + (r.ok ? '' : ' bad');
    m.textContent = r.ok ? 'Saved as #' + r.ref : 'Could not save. Check the name and try again.';
    if (r.ok) { if (day) { selected = day; const d = fromIso(day); month = new Date(d.getFullYear(), d.getMonth(), 1); } setTimeout(() => add.close(), 600); load(); }
  });

  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));
  $('#prev').addEventListener('click', () => { month = new Date(month.getFullYear(), month.getMonth() - 1, 1); load(); });
  $('#next').addEventListener('click', () => { month = new Date(month.getFullYear(), month.getMonth() + 1, 1); load(); });

  const now = new Date();
  month = new Date(now.getFullYear(), now.getMonth(), 1);
  load();
  // fresh numbers when he comes back to the page
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
})();
