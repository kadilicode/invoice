/* ============================================================
   SAMOS TECH INVOICE SYSTEM — script.js  v5.0
   Kadili Dev
============================================================ */

'use strict';

/* ══════════════════════════════════════════════════════════
   STORE — central state & persistence
══════════════════════════════════════════════════════════ */
const Store = {
  HIST_KEY:    'samos_v5_history',
  COUNTER_KEY: 'samos_v5_counter',

  history: [],

  load() {
    try { this.history = JSON.parse(localStorage.getItem(this.HIST_KEY) || '[]'); }
    catch(e) { this.history = []; }
  },

  save() {
    localStorage.setItem(this.HIST_KEY, JSON.stringify(this.history));
  },

  nextNumber(mode) {
    const k = this.COUNTER_KEY + '_' + mode;
    const n = parseInt(localStorage.getItem(k) || '0') + 1;
    localStorage.setItem(k, n);
    const prefix = mode === 'samos' ? 'SAM-' : 'TECH-';
    return prefix + String(n).padStart(4, '0');
  },

  push(rec) {
    this.history.unshift(rec);
    this.save();
  },

  update(id, patch) {
    const idx = this.history.findIndex(h => h.id === id);
    if (idx < 0) return false;
    Object.assign(this.history[idx], patch);
    this.save();
    return true;
  },

  remove(id) {
    this.history = this.history.filter(h => h.id !== id);
    this.save();
  },

  clear() {
    this.history = [];
    this.save();
  }
};

/* ══════════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════════ */
function toast(msg, type = 'info', duration = 3200) {
  const box = document.getElementById('toastBox');
  const el  = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => {
    el.style.opacity    = '0';
    el.style.transition = 'opacity .4s';
    setTimeout(() => el.remove(), 420);
  }, duration);
}

/* ══════════════════════════════════════════════════════════
   UI — navigation & sidebar
══════════════════════════════════════════════════════════ */
const UI = {
  currentView: 'samos',

  setView(v) {
    ['samos', 'tech', 'history'].forEach(x => {
      document.getElementById('view-'    + x).style.display = x === v ? 'block' : 'none';
      document.getElementById('nav-'     + x).classList.toggle('active', x === v);
    });
    const labels = { samos: 'SAMOS Invoice', tech: 'Tech Services', history: 'History' };
    document.getElementById('topbarTitle').textContent = labels[v] || 'SAMOS TECH';
    this.currentView = v;
    if (v === 'history') Hist.render();
    this.closeSidebar();
  },

  openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('overlay').classList.add('show');
  },

  closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
  },

  updateBadge() {
    const b = document.getElementById('histBadge');
    const n = Store.history.length;
    b.style.display = n > 0 ? 'inline' : 'none';
    b.textContent   = n;
  }
};

/* ══════════════════════════════════════════════════════════
   APP — login / logout / init
══════════════════════════════════════════════════════════ */
const App = {
  login() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPass').value;
    if (email === 'admin@gmail.com' && pass === 'Massam@123') {
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('appPage').style.display  = 'flex';
      Store.load();
      this._initForms();
      Hist.render();
      UI.updateBadge();
    } else {
      toast('❌ Email au Password si sahihi!', 'error');
    }
  },

  logout() {
    if (!confirm('Unataka kutoka? / Logout?')) return;
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('appPage').style.display  = 'none';
  },

  _initForms() {
    const today = new Date().toISOString().split('T')[0];

    // SAMOS form defaults
    document.getElementById('s_date').value   = today;
    document.getElementById('s_number').value = Store.nextNumber('samos');
    Rows.add('samos');

    // TECH form defaults
    document.getElementById('t_date').value   = today;
    document.getElementById('t_number').value = Store.nextNumber('tech');
    document.getElementById('techDtype').value = 'PROFORMA INVOICE';
    Rows.add('tech');
  }
};

/* ══════════════════════════════════════════════════════════
   ROWS — manage items table rows
══════════════════════════════════════════════════════════ */
const Rows = {
  _tbodyId(mode) { return mode === 'samos' ? 's_tbody' : 't_tbody'; },
  _totalId(mode) { return mode === 'samos' ? 's_total' : 't_total'; },

  add(mode) {
    const tbody = document.getElementById(this._tbodyId(mode));
    const tr    = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <input class="tbl-input tc" type="number" value="1" min="1"
               oninput="Rows.calc('${mode}')" />
      </td>
      <td>
        <input class="tbl-input" type="text"
               placeholder="Maelezo ya bidhaa/huduma..." />
      </td>
      <td>
        <input class="tbl-input tr" type="number" value="0" min="0"
               oninput="Rows.calc('${mode}')" />
      </td>
      <td class="row-total">0</td>
      <td>
        <button class="btn-del" onclick="Rows.remove(this,'${mode}')"
                title="Futa mstari">×</button>
      </td>`;
    tbody.appendChild(tr);
    this.calc(mode);
  },

  remove(btn, mode) {
    const tbody = document.getElementById(this._tbodyId(mode));
    if (tbody.rows.length <= 1) {
      toast('Lazima kuwe na item moja angalau!', 'error');
      return;
    }
    btn.closest('tr').remove();
    this.calc(mode);
  },

  calc(mode) {
    const tbody = document.getElementById(this._tbodyId(mode));
    let total   = 0;
    Array.from(tbody.rows).forEach(tr => {
      const qty   = parseFloat(tr.cells[0].querySelector('input').value) || 0;
      const price = parseFloat(tr.cells[2].querySelector('input').value) || 0;
      const line  = qty * price;
      tr.cells[3].textContent = fmt(line);
      total += line;
    });
    document.getElementById(this._totalId(mode)).textContent = fmt(total);
    return total;
  },

  getAll(mode) {
    const tbody = document.getElementById(this._tbodyId(mode));
    return Array.from(tbody.rows).map(tr => ({
      qty:   parseFloat(tr.cells[0].querySelector('input').value) || 1,
      desc:  tr.cells[1].querySelector('input').value.trim(),
      price: parseFloat(tr.cells[2].querySelector('input').value) || 0,
    }));
  }
};

/* ══════════════════════════════════════════════════════════
   DOCS — save, export (print / pdf / word)
══════════════════════════════════════════════════════════ */
const Docs = {
  _collect(mode) {
    const pf = mode === 'samos' ? 's_' : 't_';
    const selectId = mode === 'samos' ? 'samosDtype' : 'techDtype';
    const customer = document.getElementById(pf + 'customer').value.trim();
    if (!customer) { toast('⚠️ Weka jina la mteja kwanza!', 'error'); return null; }
    return {
      id:       Date.now(),
      mode:     mode,
      type:     document.getElementById(selectId).value,
      customer: customer,
      title:    document.getElementById(pf + 'title').value.trim(),
      number:   document.getElementById(pf + 'number').value.trim(),
      date:     document.getElementById(pf + 'date').value,
      items:    Rows.getAll(mode),
      total:    Rows.calc(mode),
    };
  },

  save(mode, action) {
    const rec = this._collect(mode);
    if (!rec) return;

    // Persist
    Store.push(rec);
    UI.updateBadge();

    // Refresh invoice number for next use
    const pf = mode === 'samos' ? 's_' : 't_';
    document.getElementById(pf + 'number').value = Store.nextNumber(mode);

    if (action === 'print') {
      this._setPrintZone(rec);
      toast('✅ Imehifadhiwa! Inaprint...', 'success');
      setTimeout(() => window.print(), 500);

    } else if (action === 'pdf') {
      toast('⏳ Inaunda PDF...', 'info');
      this._setPrintZone(rec);
      setTimeout(() => this._exportPDF(rec), 600);

    } else if (action === 'word') {
      this._exportWord(rec);
    }
  },

  /* ── reprint from history ── */
  reprint(rec) {
    this._setPrintZone(rec);
    setTimeout(() => window.print(), 400);
  },

  repdf(rec) {
    this._setPrintZone(rec);
    toast('⏳ Inaunda PDF...', 'info');
    setTimeout(() => this._exportPDF(rec), 600);
  },

  /* ── build print zone HTML ── */
  _setPrintZone(rec) {
    const pz = document.getElementById('printZone');
    pz.innerHTML = this._buildHTML(rec);
  },

  /* ══ HTML BUILDER ══ */
  _buildHTML(rec) {
    const isSamos = rec.mode === 'samos';
    const items   = rec.items || [];
    let total     = 0;

    const itemRows = items.map(it => {
      const line = (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0);
      total += line;
      return `
        <tr>
          <td class="tc">${it.qty}</td>
          <td>${escHtml(it.desc)}</td>
          <td class="tr">${fmt(it.price)}</td>
          <td class="tr tb">${fmt(line)}</td>
        </tr>`;
    }).join('');

    const header = isSamos
      ? `<div class="pz-hd-samos">
           <div class="pz-brand">
             <img src="https://i.ibb.co/4nkx6sFd/image-1-removebg-preview.webp" alt="SAMOS" />
             <div class="pz-brand-txt">
               <h1>SAMOS TECHNOLOGY SOLUTION LTD</h1>
               <p>Box 14928 Arusha &amp; Dodoma, Tanzania</p>
               <p>TIN: 164-564-452</p>
             </div>
           </div>
           <div class="pz-contact">
             <p>📞 +255 784 042 020 / +255 784 260 207</p>
             <p>✉ samostechtz@gmail.com</p>
             <p>✉ amosmassam@gmail.com</p>
           </div>
         </div>`
      : `<div class="pz-hd-tech">
           <img class="pz-tech-logo"
                src="https://i.ibb.co/6RHZFQpd/grok-image-1772775041773-removebg-preview.webp"
                alt="Tech Services" />
           <div class="pz-tech-title">TECHNICAL SERVICES</div>
           <div class="pz-tech-sub">Deal with Installation and Maintenance / Service of:</div>
           <div class="pz-tech-svcs">
             CCTV Camera · Electric Fence · Gate Motor ·
             Video Door Phone · Fire Alarm · Access Control ·
             PBX Phone · Internet &amp; ICT Services
           </div>
         </div>`;

    const tinLine = isSamos
      ? `<p>TIN: 164-564-452</p>` : '';

    // ── SAMOS: kampuni bank details (NMB business account)
    const samosPay = `
      <div class="pz-pay">
        <div class="pz-pay-title">🏦 BANK DETAILS</div>
        <div class="pz-samos-bank">
          <img src="https://i.ibb.co/gMP9FG4J/hqdefault-removebg-preview.webp" alt="NMB" />
          <div class="pz-samos-bank-info">
            <div class="pz-samos-acc">42810010869 — NMB BANK ARUSHA BUSINESS CENTRE</div>
            <div class="pz-samos-name">SAMOS TECHNOLOGY SOLUTION LIMITED</div>
          </div>
        </div>
      </div>`;

    // ── TECH: 2-col layout — LEFT: banks | RIGHT: mobile money
    const techPay = `
      <div class="pz-pay">
        <div class="pz-pay-title">💳 MALIPO / PAYMENT OPTIONS</div>
        <table style="width:100%;border-collapse:collapse;table-layout:fixed">
          <tr>
            <td style="width:50%;vertical-align:top;padding-right:8px">
              <div class="pz-col-label">🏦 Benki</div>
              <div class="pz-bank" style="border-radius:8px 8px 0 0;border-bottom:none">
                <img src="https://i.ibb.co/7JqbmBCS/tz-crdb-logo.webp" alt="CRDB" />
                <div>
                  <div class="bn">CRDB BANK</div>
                  <div class="ba">Acc: 0152687656400</div>
                  <div class="bh">Amos Spear Massam</div>
                </div>
              </div>
              <div class="pz-bank" style="border-radius:0 0 8px 8px">
                <img src="https://i.ibb.co/gMP9FG4J/hqdefault-removebg-preview.webp" alt="NMB" />
                <div>
                  <div class="bn">NMB BANK</div>
                  <div class="ba">Acc: 52510010760</div>
                  <div class="bh">Amos Spear Massam</div>
                </div>
              </div>
            </td>
            <td style="width:50%;vertical-align:top;padding-left:8px">
              <div class="pz-col-label">📱 Mobile Money</div>
              <div class="pz-mob" style="border-radius:8px 8px 0 0;border-bottom:none">
                <img src="https://i.ibb.co/zVJrmYn1/images-removebg-preview.webp" alt="Airtel" />
                <div>
                  <div class="mn">Airtel Money</div>
                  <div class="mnum">0784 042 020</div>
                  <div class="mh">Amos Spear Massam</div>
                </div>
              </div>
              <div class="pz-mob" style="border-radius:0 0 8px 8px">
                <img src="https://i.ibb.co/5Xmzv2kq/M-pesa-logo-removebg-preview.webp" alt="M-Pesa" />
                <div>
                  <div class="mn">M-Pesa</div>
                  <div class="mnum">0755 747 340</div>
                  <div class="mh">Amos Spear Massam</div>
                </div>
              </div>
            </td>
          </tr>
        </table>
      </div>`;

    const paySection = isSamos ? samosPay : techPay;

    return `
    <div class="pz">
      ${header}
      <div class="pz-divider"></div>

      <div class="pz-doc-title">${escHtml(rec.type || 'INVOICE')}</div>

      <div class="pz-meta">
        <div>
          ${tinLine}
          <p class="cust">Customer: ${escHtml(rec.customer || '')}</p>
        </div>
        <div class="right">
          <p>Date: ${escHtml(rec.date || '')}</p>
          <p>Invoice No: ${escHtml(rec.number || '')}</p>
        </div>
      </div>

      <div class="pz-tbl-title">
        ${escHtml((rec.title || 'INVOICE DESCRIPTION').toUpperCase())}
      </div>

      <table class="pz-table">
        <thead>
          <tr>
            <th style="width:9%">Qty</th>
            <th>Maelezo / Description</th>
            <th style="width:18%;text-align:right">Bei (TZS)</th>
            <th style="width:18%;text-align:right">Jumla (TZS)</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div class="pz-total-wrap">
        <div class="pz-total-box">
          GRAND TOTAL (TZS):
          <span class="pz-total-big">${fmt(total)}</span>
        </div>
      </div>

      ${paySection}

      <div class="pz-footer">
        <p>Asante kwa biashara yako! &mdash;
           ${isSamos ? 'SAMOS TECHNOLOGY SOLUTION LTD' : 'TECHNICAL SERVICES'}
        </p>
        <p class="small">📞 +255 784 042 020 &middot; amosmassam@gmail.com</p>
      </div>
    </div>`;
  },

  /* ── PDF ── */
  async _exportPDF(rec) {
    const pz = document.getElementById('printZone');
    pz.style.cssText = `
      display:block; position:fixed; top:-9999px; left:0;
      width:794px; background:#fff; z-index:-1;
    `;

    // Inject PDF override styles — force all text to be dark/black so it prints clearly
    const pdfStyle = document.createElement('style');
    pdfStyle.id = 'pdf-override';
    pdfStyle.textContent = `
      #printZone, #printZone * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      #printZone p,
      #printZone span,
      #printZone small,
      #printZone div,
      #printZone td,
      #printZone th,
      #printZone li {
        color: #0f172a !important;
      }
      #printZone .pz-footer p,
      #printZone .pz-footer .small,
      #printZone .pz-brand-txt p,
      #printZone .pz-contact p,
      #printZone .pz-tech-sub,
      #printZone .pz-tech-svcs,
      #printZone .pz-col-label,
      #printZone .pz-bank .ba,
      #printZone .pz-bank .bh,
      #printZone .pz-mob .mh,
      #printZone .pz-samos-acc {
        color: #1e293b !important;
      }
      #printZone .pz-total-big,
      #printZone .pz-mob .mnum {
        color: #f97316 !important;
      }
      #printZone .pz-table th {
        background: #0f172a !important;
        color: #fff !important;
      }
      #printZone .pz-total-box {
        background: #0f172a !important;
        color: #fff !important;
      }
      #printZone strong { font-weight: 800 !important; color: #0f172a !important; }
    `;
    document.head.appendChild(pdfStyle);

    try {
      await sleep(350);
      const canvas = await html2canvas(pz, {
        scale: 2, useCORS: true, allowTaint: true,
        backgroundColor: '#ffffff', logging: false, width: 794,
      });
      pz.removeAttribute('style');
      document.getElementById('pdf-override')?.remove();

      const { jsPDF } = window.jspdf;
      const pdf  = new jsPDF('p', 'mm', 'a4');
      const W    = pdf.internal.pageSize.getWidth();
      const H    = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * W) / canvas.width;
      const img  = canvas.toDataURL('image/jpeg', 0.95);

      if (imgH <= H) {
        pdf.addImage(img, 'JPEG', 0, 0, W, imgH);
      } else {
        let page = 0, y = 0;
        while (y < imgH) {
          if (page > 0) pdf.addPage();
          pdf.addImage(img, 'JPEG', 0, -y, W, imgH);
          y += H; page++;
        }
      }

      const fname = `${rec.number || 'Invoice'}_${rec.customer || 'Customer'}.pdf`
                      .replace(/\s+/g, '_');
      pdf.save(fname);
      toast('✅ PDF imehifadhiwa!', 'success');

    } catch (err) {
      pz.removeAttribute('style');
      document.getElementById('pdf-override')?.remove();
      console.error('PDF error:', err);
      toast('❌ Hitilafu ya PDF. Jaribu tena.', 'error');
    }
  },

  /* ── WORD ── */
  _exportWord(rec) {
    const isSamos = rec.mode === 'samos';
    const items   = rec.items || [];
    let total     = 0;

    const rows = items.map(it => {
      const line = (parseFloat(it.qty)||0) * (parseFloat(it.price)||0);
      total += line;
      return `
        <tr>
          <td style="border:1px solid #cbd5e1;padding:8px;text-align:center">${it.qty}</td>
          <td style="border:1px solid #cbd5e1;padding:8px">${escHtml(it.desc)}</td>
          <td style="border:1px solid #cbd5e1;padding:8px;text-align:right">${fmt(it.price)}</td>
          <td style="border:1px solid #cbd5e1;padding:8px;text-align:right;font-weight:700">${fmt(line)}</td>
        </tr>`;
    }).join('');

    const header = isSamos
      ? `<table style="width:100%;border-bottom:4px solid #f97316;padding-bottom:12px;margin-bottom:10px">
           <tr>
             <td style="vertical-align:top">
               <h1 style="font-size:18px;font-weight:900;color:#0f172a;margin:0 0 4px">
                 SAMOS TECHNOLOGY SOLUTION LTD
               </h1>
               <p style="font-size:11px;color:#64748b;margin:1px 0">
                 Box 14928 Arusha &amp; Dodoma, Tanzania | TIN: 164-564-452
               </p>
             </td>
             <td style="text-align:right;vertical-align:top">
               <p style="font-size:11px;font-weight:600;margin:1px 0">+255 784 042 020 / +255 784 260 207</p>
               <p style="font-size:11px;font-weight:600;margin:1px 0">samostechtz@gmail.com | amosmassam@gmail.com</p>
             </td>
           </tr>
         </table>`
      : `<div style="text-align:center;border-bottom:4px solid #f97316;padding-bottom:12px;margin-bottom:10px">
           <h1 style="font-size:24px;font-weight:900;color:#0f172a;letter-spacing:3px;margin:0 0 6px">
             TECHNICAL SERVICES
           </h1>
           <p style="font-size:12px;color:#1e293b;margin:0 0 4px;font-weight:600">
             Deal with Installation and Maintenance / Service of:
           </p>
           <p style="font-size:11px;color:#334155;margin:0;font-weight:500">
             CCTV Camera &middot; Electric Fence &middot; Gate Motor &middot; Video Door Phone &middot;
             Fire Alarm &middot; Access Control &middot; PBX Phone &middot; Internet &amp; ICT Services
           </p>
         </div>`;

    const tinLine = isSamos
      ? `<p style="margin:2px 0;font-size:12px;font-weight:600">TIN: 164-564-452</p>` : '';

    // Payment block: SAMOS = NMB business account only
    const wordPay = isSamos
      ? `<h3 style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;
           color:#0f172a;margin-top:20px;padding-top:14px;border-top:2px solid #e2e8f0">
  🏦 BANK DETAILS
</h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:10px">
  <tr>
    <td style="border:2px solid #0f172a;padding:14px;background:#f8fafc;vertical-align:middle">
      <strong style="font-size:13px">42810010869 — NMB BANK ARUSHA BUSINESS CENTRE</strong><br>
      <strong style="font-size:15px;color:#0f172a">SAMOS TECHNOLOGY SOLUTION LIMITED</strong>
    </td>
  </tr>
</table>`
      : `<h3 style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;
           color:#0f172a;margin-top:20px;padding-top:14px;border-top:2px solid #e2e8f0;margin-bottom:8px">
  💳 MALIPO / PAYMENT OPTIONS
</h3>
<table style="width:100%;border-collapse:collapse;margin-bottom:10px">
  <tr>
    <td style="width:50%;vertical-align:top;padding-right:6px">
      <div style="font-size:10px;font-weight:800;text-transform:uppercase;color:#64748b;letter-spacing:1px;margin-bottom:6px">🏦 Benki</div>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="border:1px solid #e2e8f0;padding:8px;background:#f8fafc;vertical-align:middle">
            <strong style="font-size:11px">CRDB BANK</strong><br>
            <span style="font-size:11px;color:#334155">Acc: 0152687656400</span><br>
            <small style="color:#64748b">Amos Spear Massam</small>
          </td>
        </tr>
        <tr>
          <td style="border:1px solid #e2e8f0;padding:8px;background:#f8fafc;vertical-align:middle">
            <strong style="font-size:11px">NMB BANK</strong><br>
            <span style="font-size:11px;color:#334155">Acc: 52510010760</span><br>
            <small style="color:#64748b">Amos Spear Massam</small>
          </td>
        </tr>
      </table>
    </td>
    <td style="width:50%;vertical-align:top;padding-left:6px">
      <div style="font-size:10px;font-weight:800;text-transform:uppercase;color:#64748b;letter-spacing:1px;margin-bottom:6px">📱 Mobile Money</div>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="border:1px solid #e2e8f0;padding:8px;background:#f8fafc;vertical-align:middle">
            <strong style="font-size:11px">Airtel Money</strong><br>
            <span style="font-size:12px;font-weight:700;color:#f97316">0784 042 020</span><br>
            <small style="color:#64748b">Amos Spear Massam</small>
          </td>
        </tr>
        <tr>
          <td style="border:1px solid #e2e8f0;padding:8px;background:#f8fafc;vertical-align:middle">
            <strong style="font-size:11px">M-Pesa</strong><br>
            <span style="font-size:12px;font-weight:700;color:#f97316">0755 747 340</span><br>
            <small style="color:#64748b">Amos Spear Massam</small>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:Calibri,Arial,sans-serif;color:#0f172a;padding:22px;font-size:13px}</style>
</head><body>
${header}
<h2 style="text-align:center;font-size:20px;font-weight:900;text-decoration:underline;
           letter-spacing:2px;margin:18px 0 14px">
  ${escHtml(rec.type || 'INVOICE')}
</h2>
<table style="width:100%;margin-bottom:14px">
  <tr>
    <td style="vertical-align:top">
      ${tinLine}
      <p style="font-size:14px;font-weight:800;margin:3px 0">
        Customer: ${escHtml(rec.customer || '')}
      </p>
    </td>
    <td style="text-align:right;vertical-align:top">
      <p style="font-size:12px;font-weight:600;margin:2px 0">Date: ${escHtml(rec.date || '')}</p>
      <p style="font-size:12px;font-weight:600;margin:2px 0">Invoice No: ${escHtml(rec.number || '')}</p>
    </td>
  </tr>
</table>
<h3 style="text-align:center;font-size:13px;font-weight:800;text-decoration:underline;
           text-transform:uppercase;letter-spacing:1px;margin:14px 0 10px">
  ${escHtml((rec.title || 'INVOICE DESCRIPTION').toUpperCase())}
</h3>
<table style="width:100%;border-collapse:collapse">
  <thead>
    <tr style="background:#0f172a;color:#fff">
      <th style="border:1.5px solid #1e293b;padding:9px;width:9%;font-size:11px">Qty</th>
      <th style="border:1.5px solid #1e293b;padding:9px;font-size:11px">Description</th>
      <th style="border:1.5px solid #1e293b;padding:9px;width:18%;text-align:right;font-size:11px">Bei (TZS)</th>
      <th style="border:1.5px solid #1e293b;padding:9px;width:18%;text-align:right;font-size:11px">Jumla (TZS)</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<table style="width:100%;margin-top:12px">
  <tr>
    <td></td>
    <td style="text-align:right">
      <div style="background:#0f172a;color:#fff;padding:11px 22px;border-radius:8px;display:inline-block">
        <strong>GRAND TOTAL (TZS):</strong>
        <span style="font-size:20px;font-weight:900;color:#f97316;margin-left:14px">${fmt(total)}</span>
      </div>
    </td>
  </tr>
</table>

${wordPay}

<div style="margin-top:20px;border-top:2px solid #e2e8f0;padding-top:12px;text-align:center">
  <p style="font-size:11px;color:#64748b;font-weight:600">
    Asante kwa biashara yako! —
    ${isSamos ? 'SAMOS TECHNOLOGY SOLUTION LTD' : 'TECHNICAL SERVICES'}
  </p>
  <p style="font-size:10px;color:#94a3b8">
    📞 +255 784 042 020 · amosmassam@gmail.com
  </p>
</div>
</body></html>`;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${rec.number || 'Invoice'}_${rec.customer || 'Customer'}.doc`
                   .replace(/\s+/g, '_');
    a.click();
    URL.revokeObjectURL(url);
    toast('✅ Word imehifadhiwa!', 'success');
  }
};

/* ══════════════════════════════════════════════════════════
   HIST — history view, edit modal
══════════════════════════════════════════════════════════ */
const Hist = {
  _editId: null,

  render() {
    const tbody = document.getElementById('histTbody');
    const empty = document.getElementById('histEmpty');
    const wrap  = document.getElementById('histWrap');
    tbody.innerHTML = '';

    if (!Store.history.length) {
      empty.style.display = 'block';
      wrap.style.display  = 'none';
      return;
    }
    empty.style.display = 'none';
    wrap.style.display  = 'block';

    Store.history.forEach(rec => {
      const modePill = rec.mode === 'samos'
        ? `<span class="pill pill-samos">SAMOS</span>`
        : `<span class="pill pill-tech">TECH</span>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="inv-num">${escHtml(rec.number || '—')}</td>
        <td style="font-weight:700">${escHtml(rec.customer || '—')}</td>
        <td><span class="pill pill-type">${escHtml(rec.type || '—')}</span></td>
        <td>${modePill}</td>
        <td>${escHtml(rec.date || '—')}</td>
        <td class="h-amt">${fmt(rec.total)}</td>
        <td>
          <div class="h-acts">
            <button class="btn-hs bprint" onclick="Hist.reprint(${rec.id})" title="Print">🖨️</button>
            <button class="btn-hs bpdf"   onclick="Hist.repdf(${rec.id})"   title="PDF">📄 PDF</button>
            <button class="btn-hs bedit"  onclick="Hist.openEdit(${rec.id})"title="Hariri">✏️ Edit</button>
            <button class="btn-hs bdel"   onclick="Hist.del(${rec.id})"     title="Futa">🗑️</button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });
  },

  reprint(id) {
    const rec = Store.history.find(h => h.id === id);
    if (rec) Docs.reprint(rec);
  },

  repdf(id) {
    const rec = Store.history.find(h => h.id === id);
    if (rec) Docs.repdf(rec);
  },

  del(id) {
    if (!confirm('Futa invoice hii?')) return;
    Store.remove(id);
    this.render();
    UI.updateBadge();
    toast('🗑️ Imefutwa!', 'success');
  },

  clearAll() {
    if (!confirm('Futa records ZOTE? Haiwezi kutenduliwa!')) return;
    Store.clear();
    this.render();
    UI.updateBadge();
    toast('🗑️ History yote imefutwa!', 'success');
  },

  openEdit(id) {
    const rec = Store.history.find(h => h.id === id);
    if (!rec) return;
    this._editId = id;
    document.getElementById('e_customer').value = rec.customer || '';
    document.getElementById('e_date').value     = rec.date     || '';
    document.getElementById('e_number').value   = rec.number   || '';
    document.getElementById('e_title').value    = rec.title    || '';
    document.getElementById('e_type').value     = rec.type     || 'TAX INVOICE';
    document.getElementById('editModal').style.display = 'flex';
  },

  saveEdit() {
    if (!this._editId) return;
    const patch = {
      customer: document.getElementById('e_customer').value.trim(),
      date:     document.getElementById('e_date').value,
      number:   document.getElementById('e_number').value.trim(),
      title:    document.getElementById('e_title').value.trim(),
      type:     document.getElementById('e_type').value,
    };
    if (!patch.customer) { toast('⚠️ Jina la mteja haliwezi kuwa wazi!', 'error'); return; }
    Store.update(this._editId, patch);
    this.render();
    this.closeEdit();
    toast('✅ Invoice imehaririwa!', 'success');
  },

  closeEdit() {
    document.getElementById('editModal').style.display = 'none';
    this._editId = null;
  }
};

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
function fmt(n) {
  return new Intl.NumberFormat('en-TZ').format(parseFloat(n) || 0);
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/* ══════════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS
══════════════════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    Hist.closeEdit();
    UI.closeSidebar();
  }
});

/* ══════════════════════════════════════════════════════════
   CLICK OUTSIDE MODAL TO CLOSE
══════════════════════════════════════════════════════════ */
document.getElementById('editModal').addEventListener('click', function(e) {
  if (e.target === this) Hist.closeEdit();
});
