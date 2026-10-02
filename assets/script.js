/**
 * KopdesFITE - Praktikum PABWE P3
 * Satu halaman, tiga fitur dipisah tab:
 *   1. Catatan Keuangan (Expense Tracker)
 *   2. Bookmark / Link Manager
 *   3. Kuis Interaktif
 *
 * Isi file ini (urut dari atas):
 *   0. Konstanta & helper
 *   1. Modal
 *   2. Pembuat elemen (card) & template modal
 *   3. Validasi form
 *   4. Tab (ingat tab terakhir)
 *   5. Fitur Expense Tracker
 *   6. Fitur Bookmark Manager
 *   7. Fitur Kuis
 */

/* ==========================================================================
   0. KONSTANTA & HELPER
   ========================================================================== */

// Setiap fitur memakai key localStorage sendiri agar datanya tidak saling menimpa
const STORAGE_KEYS = {
  expense: "kopdesfite_expense",
  bookmark: "kopdesfite_bookmark",
  quizHighScore: "kopdesfite_quiz_highscore",
  activeTab: "kopdesfite_active_tab",
};

// Daftar kategori disimpan di satu tempat supaya form, filter, modal, dan validasi selalu sama
const EXPENSE_CATEGORIES = ["Makanan & Minuman", "Gaji & Project", "Transportasi", "Hiburan", "Tagihan & Edukasi", "Lain-Lain"];
const BOOKMARK_CATEGORIES = ["Pemrograman", "Kuliah & Riset", "Desain & Media", "Produktivitas", "Lainnya"];

document.addEventListener("DOMContentLoaded", () => {
  ModalEngine.init();

  initExpenseTracker();
  initBookmarkManager();
  const quiz = initQuizApp();

  // Saat pindah dari tab kuis, hentikan timer supaya tidak berjalan di belakang layar
  initTabs((activePanelId) => {
    if (activePanelId !== "panel-quiz") quiz.stopAndReset();
  });
});

/* Baca localStorage dengan aman: jika kosong atau rusak, pakai nilai cadangan */
function loadFromStorage(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`Data "${key}" rusak, memakai data kosong.`, err);
    return fallback;
  }
}

/* Simpan ke localStorage (data berupa array/object diubah jadi teks JSON) */
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Gagal menyimpan "${key}".`, err);
  }
}

/* Cegah teks dari pengguna dibaca browser sebagai HTML (XSS) */
function escapeHTML(val) {
  if (val === null || val === undefined) return "";
  return String(val).replace(/[&<>'"]/g,
    (tag) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[tag] || tag)
  );
}

/* Isi <select> dari array. Jika allLabel diisi, tambahkan opsi "Semua ..." (value: SEMUA) */
function fillSelect(selectEl, options, allLabel = null) {
  selectEl.innerHTML = "";
  if (allLabel) {
    const optAll = document.createElement("option");
    optAll.value = "SEMUA";
    optAll.textContent = allLabel;
    selectEl.appendChild(optAll);
  }
  options.forEach((text) => {
    const opt = document.createElement("option");
    opt.value = text;
    opt.textContent = text;
    selectEl.appendChild(opt);
  });
}

/* Tanggal lokal format YYYY-MM-DD (cocok untuk <input type="date">) */
function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatIDR(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

/* Ikon SVG inline (pengganti Font Awesome agar tidak perlu memuat CSS + font eksternal) */
const ICON_PATHS = {
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  arrowDown: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  arrowUp: '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
  pen: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  xCircle: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
};

function icon(name, sizeClass = "w-3.5 h-3.5") {
  return `<svg class="${sizeClass} inline-block flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name]}</svg>`;
}

/* ==========================================================================
   1. MODAL (dipakai untuk ubah, hapus, dan pesan validasi)
   ========================================================================== */
const ModalEngine = {
  backdrop: null,
  title: null,
  body: null,
  closeBtn: null,
  initialized: false,

  init() {
    if (this.initialized) return;

    this.backdrop = document.getElementById("modal-backdrop");
    this.title = document.getElementById("modal-title");
    this.body = document.getElementById("modal-body");
    this.closeBtn = document.getElementById("btn-modal-close");

    this.closeBtn.addEventListener("click", () => this.close());

    // Klik area gelap di luar kotak modal = tutup
    this.backdrop.addEventListener("click", (e) => {
      if (e.target === this.backdrop) this.close();
    });

    // Tombol Escape = tutup
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !this.backdrop.classList.contains("hidden")) this.close();
    });

    this.initialized = true;
  },

  open(modalTitle, contentHtml) {
    this.title.textContent = modalTitle;
    this.body.innerHTML = contentHtml;
    this.backdrop.classList.remove("hidden");
  },

  close() {
    this.backdrop.classList.add("hidden");
    this.body.innerHTML = "";
  },

  /* Tampilkan daftar error validasi. onClose (opsional) dipanggil setelah tombol "Perbaiki Data" ditekan,
     dipakai untuk membuka kembali form ubah agar isian pengguna tidak hilang. */
  showFieldErrorsAlert(title, errors, onClose = null) {
    const items = errors.map((err) => `
      <li class="flex items-start gap-2 text-rose-300">
        <span class="mt-0.5 text-rose-400">${icon("alert")}</span>
        <span><strong class="text-slate-200">${escapeHTML(err.label)}:</strong> ${escapeHTML(err.message)}</span>
      </li>
    `).join("");

    this.open(title, `
      <p class="text-xs text-slate-300 leading-relaxed font-medium">Ada isian yang belum sesuai:</p>
      <ul class="space-y-2 text-xs bg-rose-950/40 border border-rose-900/60 p-3 rounded-xl">${items}</ul>
      <div class="flex justify-end pt-2">
        <button type="button" id="btn-modal-alert-ok" class="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-all">Perbaiki Data</button>
      </div>
    `);

    document.getElementById("btn-modal-alert-ok").onclick = () => {
      this.close();
      if (onClose) onClose();
    };
  },
};

/* ==========================================================================
   2. PEMBUAT ELEMEN (CARD) & TEMPLATE MODAL
   ========================================================================== */

/* Satu baris transaksi, dibuat dengan createElement */
function createExpenseCardElement(item, isIncome) {
  const card = document.createElement("div");
  card.className = "flex items-center justify-between gap-3 p-3.5 bg-slate-900/70 rounded-xl border border-slate-700/60 hover:border-slate-600 transition-all";

  // Kiri: ikon + judul + badge kategori + tanggal
  const leftCol = document.createElement("div");
  leftCol.className = "flex items-center gap-3 min-w-0";

  const iconBox = document.createElement("div");
  iconBox.className = `w-9 h-9 flex-shrink-0 rounded-lg flex items-center justify-center ${isIncome
    ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/50"
    : "bg-rose-950/80 text-rose-400 border border-rose-800/50"}`;
  iconBox.innerHTML = icon(isIncome ? "arrowDown" : "arrowUp");

  const textInfo = document.createElement("div");
  textInfo.className = "min-w-0";

  const title = document.createElement("h3");
  title.className = "text-xs font-semibold text-slate-200 truncate";
  title.textContent = item.judul;

  const metaRow = document.createElement("div");
  metaRow.className = "flex flex-wrap items-center gap-2 mt-0.5";

  const catBadge = document.createElement("span");
  catBadge.className = "text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700";
  catBadge.textContent = item.kategori;

  const dateSpan = document.createElement("span");
  dateSpan.className = "text-[10px] text-slate-400";
  dateSpan.textContent = item.tanggal;

  metaRow.append(catBadge, dateSpan);
  textInfo.append(title, metaRow);
  leftCol.append(iconBox, textInfo);

  // Kanan: nominal + tombol ubah/hapus
  const rightCol = document.createElement("div");
  rightCol.className = "flex items-center gap-3 flex-shrink-0";

  const amountSpan = document.createElement("span");
  amountSpan.className = `text-xs font-bold ${isIncome ? "text-emerald-400" : "text-rose-400"}`;
  amountSpan.textContent = `${isIncome ? "+" : "-"} ${formatIDR(item.jumlah)}`;

  const actionGroup = document.createElement("div");
  actionGroup.className = "flex items-center gap-1";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "btn-edit-expense p-1 text-slate-400 hover:text-indigo-400 text-xs transition-colors";
  editBtn.dataset.id = item.id;
  editBtn.title = "Ubah transaksi";
  editBtn.setAttribute("aria-label", `Ubah transaksi ${item.judul}`);
  editBtn.innerHTML = icon("pen");

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn-delete-expense p-1 text-slate-400 hover:text-rose-400 text-xs transition-colors";
  deleteBtn.dataset.id = item.id;
  deleteBtn.title = "Hapus transaksi";
  deleteBtn.setAttribute("aria-label", `Hapus transaksi ${item.judul}`);
  deleteBtn.innerHTML = icon("trash");

  actionGroup.append(editBtn, deleteBtn);
  rightCol.append(amountSpan, actionGroup);
  card.append(leftCol, rightCol);
  return card;
}

/* Satu kartu bookmark. Judul dan URL berupa link yang terbuka di tab baru. */
function createBookmarkCardElement(item) {
  const card = document.createElement("div");
  card.className = "p-4 bg-slate-900/70 rounded-xl border border-slate-700/60 hover:border-indigo-500/50 transition-all flex flex-col justify-between gap-3";

  const topSection = document.createElement("div");

  const headerRow = document.createElement("div");
  headerRow.className = "flex justify-between items-start gap-2";

  const badge = document.createElement("span");
  badge.className = "text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50";
  badge.textContent = item.kategori;

  const actionGroup = document.createElement("div");
  actionGroup.className = "flex items-center gap-1";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "btn-edit-bookmark text-slate-400 hover:text-indigo-400 text-xs p-1 transition-colors";
  editBtn.dataset.id = item.id;
  editBtn.title = "Ubah bookmark";
  editBtn.setAttribute("aria-label", `Ubah bookmark ${item.nama}`);
  editBtn.innerHTML = icon("pen");

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn-delete-bookmark text-slate-400 hover:text-rose-400 text-xs p-1 transition-colors";
  deleteBtn.dataset.id = item.id;
  deleteBtn.title = "Hapus bookmark";
  deleteBtn.setAttribute("aria-label", `Hapus bookmark ${item.nama}`);
  deleteBtn.innerHTML = icon("trash");

  actionGroup.append(editBtn, deleteBtn);
  headerRow.append(badge, actionGroup);

  // Judul = link (tab baru)
  const title = document.createElement("h3");
  title.className = "mt-2 text-xs font-bold";
  const titleLink = document.createElement("a");
  titleLink.href = item.url;
  titleLink.target = "_blank";
  titleLink.rel = "noopener noreferrer";
  titleLink.className = "text-slate-200 hover:text-indigo-400 line-clamp-1 transition-colors";
  titleLink.textContent = item.nama;
  title.appendChild(titleLink);

  // URL = link (tab baru)
  const urlLink = document.createElement("a");
  urlLink.href = item.url;
  urlLink.target = "_blank";
  urlLink.rel = "noopener noreferrer";
  urlLink.className = "block mt-0.5 text-[11px] text-slate-400 hover:text-indigo-300 line-clamp-1 break-all transition-colors";
  urlLink.textContent = item.url;

  topSection.append(headerRow, title, urlLink);

  if (item.catatan) {
    const note = document.createElement("p");
    note.className = "text-[10px] text-slate-400 italic mt-1 line-clamp-2";
    note.textContent = item.catatan;
    topSection.appendChild(note);
  }

  card.appendChild(topSection);
  return card;
}

/* Template modal */
function createEditModalFormHTML(formId, fieldsHTML) {
  return `
    <form id="${escapeHTML(formId)}" novalidate class="space-y-3">
      ${fieldsHTML}
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" id="btn-cancel-modal" class="px-3.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-medium text-slate-200 transition-all">Batal</button>
        <button type="submit" class="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-all">Simpan Perubahan</button>
      </div>
    </form>
  `;
}

function createConfirmModalHTML(messageHtml, confirmBtnText = "Hapus") {
  return `
    <p class="text-xs text-slate-300 leading-relaxed">${messageHtml}</p>
    <div class="flex justify-end gap-2 pt-2">
      <button type="button" id="btn-cancel-modal" class="px-3.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-medium text-slate-200 transition-all">Batal</button>
      <button type="button" id="btn-confirm-delete" class="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white transition-all">${escapeHTML(confirmBtnText)}</button>
    </div>
  `;
}

const INPUT_CLASS = "w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500";

function createOptionsHTML(list, selectedValue) {
  return list.map((cat) =>
    `<option value="${escapeHTML(cat)}" ${selectedValue === cat ? "selected" : ""}>${escapeHTML(cat)}</option>`
  ).join("");
}

function createExpenseEditModalHTML(target) {
  const fieldsHTML = `
    <div>
      <label for="edit-expense-judul" class="block text-xs font-medium text-slate-300 mb-1">Judul / Deskripsi</label>
      <input type="text" id="edit-expense-judul" value="${escapeHTML(target.judul)}" class="${INPUT_CLASS}">
    </div>
    <div>
      <label for="edit-expense-kategori" class="block text-xs font-medium text-slate-300 mb-1">Kategori</label>
      <select id="edit-expense-kategori" class="${INPUT_CLASS}">${createOptionsHTML(EXPENSE_CATEGORIES, target.kategori)}</select>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <div>
        <label for="edit-expense-jumlah" class="block text-xs font-medium text-slate-300 mb-1">Jumlah (Rp)</label>
        <input type="number" id="edit-expense-jumlah" min="1" value="${escapeHTML(target.jumlah)}" class="${INPUT_CLASS}">
      </div>
      <div>
        <label for="edit-expense-tipe" class="block text-xs font-medium text-slate-300 mb-1">Tipe</label>
        <select id="edit-expense-tipe" class="${INPUT_CLASS}">${createOptionsHTML(["Pengeluaran", "Pemasukan"], target.tipe)}</select>
      </div>
    </div>
    <div>
      <label for="edit-expense-tanggal" class="block text-xs font-medium text-slate-300 mb-1">Tanggal</label>
      <input type="date" id="edit-expense-tanggal" value="${escapeHTML(target.tanggal)}" class="${INPUT_CLASS}">
    </div>
  `;
  return createEditModalFormHTML("form-edit-expense", fieldsHTML);
}

function createBookmarkEditModalHTML(target) {
  const fieldsHTML = `
    <div>
      <label for="edit-bm-nama" class="block text-xs font-medium text-slate-300 mb-1">Nama Situs</label>
      <input type="text" id="edit-bm-nama" value="${escapeHTML(target.nama)}" class="${INPUT_CLASS}">
    </div>
    <div>
      <label for="edit-bm-url" class="block text-xs font-medium text-slate-300 mb-1">URL (http:// atau https://)</label>
      <input type="url" id="edit-bm-url" value="${escapeHTML(target.url)}" class="${INPUT_CLASS}">
    </div>
    <div>
      <label for="edit-bm-kategori" class="block text-xs font-medium text-slate-300 mb-1">Kategori</label>
      <select id="edit-bm-kategori" class="${INPUT_CLASS}">${createOptionsHTML(BOOKMARK_CATEGORIES, target.kategori)}</select>
    </div>
    <div>
      <label for="edit-bm-catatan" class="block text-xs font-medium text-slate-300 mb-1">Catatan Singkat</label>
      <textarea id="edit-bm-catatan" rows="2" class="${INPUT_CLASS} resize-none">${escapeHTML(target.catatan || "")}</textarea>
    </div>
  `;
  return createEditModalFormHTML("form-edit-bookmark", fieldsHTML);
}

/* ==========================================================================
   3. VALIDASI FORM (mengembalikan array error; kosong = valid)
   ========================================================================== */
function validateExpenseForm({ judul, kategori, jumlah, tipe, tanggal }) {
  const errors = [];

  const trimmedJudul = (judul || "").trim();
  if (!trimmedJudul) {
    errors.push({ label: "Judul / Deskripsi", message: "Wajib diisi." });
  } else if (trimmedJudul.length < 3) {
    errors.push({ label: "Judul / Deskripsi", message: "Minimal 3 karakter." });
  }

  if (!EXPENSE_CATEGORIES.includes(kategori)) {
    errors.push({ label: "Kategori", message: "Pilih salah satu kategori." });
  }

  const numJumlah = Number(jumlah);
  if (String(jumlah).trim() === "" || isNaN(numJumlah) || numJumlah <= 0) {
    errors.push({ label: "Jumlah (Rp)", message: "Harus berupa angka lebih besar dari 0." });
  }

  if (!["Pengeluaran", "Pemasukan"].includes(tipe)) {
    errors.push({ label: "Tipe", message: "Pilih Pengeluaran atau Pemasukan." });
  }

  if (!tanggal || isNaN(new Date(tanggal).getTime())) {
    errors.push({ label: "Tanggal", message: "Pilih tanggal yang valid." });
  }

  return errors;
}

function validateBookmarkForm({ nama, url, kategori }) {
  const errors = [];

  if ((nama || "").trim().length < 2) {
    errors.push({ label: "Nama Situs", message: "Minimal 2 karakter." });
  }

  // URL harus diawali http:// atau https://
  if (!/^https?:\/\/\S+$/i.test((url || "").trim())) {
    errors.push({ label: "URL", message: "Harus diawali http:// atau https:// dan tanpa spasi." });
  }

  if (!BOOKMARK_CATEGORIES.includes(kategori)) {
    errors.push({ label: "Kategori", message: "Pilih salah satu kategori." });
  }

  return errors;
}

/* ==========================================================================
   4. TAB (hanya satu panel aktif; tab terakhir diingat di localStorage)
   ========================================================================== */
function initTabs(onTabChange) {
  const tabButtons = document.querySelectorAll("[data-tab-target]");
  const tabPanels = document.querySelectorAll("[data-tab-panel]");
  const panelIds = Array.from(tabPanels).map((panel) => panel.id);

  const ACTIVE_CLASSES = ["text-indigo-400", "border-indigo-400"];
  const INACTIVE_CLASSES = ["text-slate-400", "border-transparent", "hover:text-slate-200"];

  function activateTab(panelId) {
    tabButtons.forEach((btn) => {
      const isActive = btn.dataset.tabTarget === panelId;
      btn.setAttribute("aria-selected", String(isActive));
      btn.classList.remove(...(isActive ? INACTIVE_CLASSES : ACTIVE_CLASSES));
      btn.classList.add(...(isActive ? ACTIVE_CLASSES : INACTIVE_CLASSES));
    });

    tabPanels.forEach((panel) => {
      panel.classList.toggle("hidden", panel.id !== panelId);
    });

    try {
      localStorage.setItem(STORAGE_KEYS.activeTab, panelId);
    } catch (err) {
      console.error("Gagal menyimpan tab aktif.", err);
    }

    if (onTabChange) onTabChange(panelId);
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tabTarget));
  });

  // Pulihkan tab terakhir; jika tidak ada atau tidak valid, mulai dari tab pertama
  let savedTab = null;
  try {
    savedTab = localStorage.getItem(STORAGE_KEYS.activeTab);
  } catch (err) {
    console.error("Gagal membaca tab aktif.", err);
  }
  activateTab(panelIds.includes(savedTab) ? savedTab : panelIds[0]);
}

/* ==========================================================================
   5. FITUR 3.1: CATATAN PENGELUARAN HARIAN (EXPENSE TRACKER)
   ========================================================================== */
function initExpenseTracker() {
  const form = document.getElementById("form-expense");
  const inputJudul = document.getElementById("expense-judul");
  const inputKategori = document.getElementById("expense-kategori");
  const inputJumlah = document.getElementById("expense-jumlah");
  const inputTipe = document.getElementById("expense-tipe");
  const inputTanggal = document.getElementById("expense-tanggal");

  const containerList = document.getElementById("daftar-expense");
  const elSaldo = document.getElementById("total-saldo");
  const elPemasukan = document.getElementById("total-pemasukan");
  const elPengeluaran = document.getElementById("total-pengeluaran");

  const inputSearch = document.getElementById("expense-search");
  const filterTipe = document.getElementById("expense-filter-tipe");
  const filterKategori = document.getElementById("expense-filter-kategori");
  const sortOption = document.getElementById("expense-sort");

  fillSelect(inputKategori, EXPENSE_CATEGORIES);
  fillSelect(filterKategori, EXPENSE_CATEGORIES, "Semua Kategori");
  inputTanggal.value = getLocalDateString();

  // State: array transaksi, dimuat dari localStorage
  let transactions = loadFromStorage(STORAGE_KEYS.expense);

  function saveExpenseData() {
    saveToStorage(STORAGE_KEYS.expense, transactions);
  }

  function renderExpenseUI() {
    // Ringkasan dihitung dari semua transaksi (bukan hasil filter)
    let totalIn = 0;
    let totalOut = 0;
    transactions.forEach((t) => {
      if (t.tipe === "Pemasukan") totalIn += Number(t.jumlah);
      else totalOut += Number(t.jumlah);
    });
    elPemasukan.textContent = formatIDR(totalIn);
    elPengeluaran.textContent = formatIDR(totalOut);
    elSaldo.textContent = formatIDR(totalIn - totalOut);

    // Cari -> filter tipe -> filter kategori -> urutkan
    let processed = [...transactions];

    const query = inputSearch.value.trim().toLowerCase();
    if (query) processed = processed.filter((t) => t.judul.toLowerCase().includes(query));

    if (filterTipe.value !== "SEMUA") processed = processed.filter((t) => t.tipe === filterTipe.value);
    if (filterKategori.value !== "SEMUA") processed = processed.filter((t) => t.kategori === filterKategori.value);

    const sortVal = sortOption.value;
    processed.sort((a, b) => {
      if (sortVal === "terlama") return new Date(a.tanggal) - new Date(b.tanggal);
      if (sortVal === "terbesar") return b.jumlah - a.jumlah;
      if (sortVal === "terkecil") return a.jumlah - b.jumlah;
      return new Date(b.tanggal) - new Date(a.tanggal); // terbaru (default)
    });

    containerList.innerHTML = "";

    // Empty state
    if (processed.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "text-center py-10 text-slate-300 text-xs border border-dashed border-slate-700 rounded-xl";
      const message = transactions.length === 0
        ? "Belum ada transaksi. Tambahkan transaksi pertama lewat form di atas."
        : "Tidak ada transaksi yang cocok dengan pencarian atau filter.";
      emptyDiv.innerHTML = `<span class="block mb-2">${icon("receipt", "w-8 h-8")}</span>${message}`;
      containerList.appendChild(emptyDiv);
      return;
    }

    processed.forEach((item) => {
      containerList.appendChild(createExpenseCardElement(item, item.tipe === "Pemasukan"));
    });
  }

  // Tambah transaksi
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const values = {
      judul: inputJudul.value,
      kategori: inputKategori.value,
      jumlah: inputJumlah.value,
      tipe: inputTipe.value,
      tanggal: inputTanggal.value,
    };

    const errors = validateExpenseForm(values);
    if (errors.length > 0) {
      ModalEngine.showFieldErrorsAlert("Data transaksi belum valid", errors);
      return;
    }

    transactions.push({
      id: Date.now().toString(),
      judul: values.judul.trim(),
      kategori: values.kategori,
      jumlah: parseFloat(values.jumlah),
      tipe: values.tipe,
      tanggal: values.tanggal,
    });

    saveExpenseData();
    renderExpenseUI();
    form.reset();
    inputTanggal.value = getLocalDateString();
  });

  // Modal ubah. Jika validasi gagal, form dibuka lagi dengan isian terakhir pengguna.
  function openEditModal(target, draft) {
    ModalEngine.open("Ubah Transaksi", createExpenseEditModalHTML(draft));

    document.getElementById("btn-cancel-modal").onclick = () => ModalEngine.close();
    document.getElementById("form-edit-expense").onsubmit = (ev) => {
      ev.preventDefault();

      const values = {
        judul: document.getElementById("edit-expense-judul").value,
        kategori: document.getElementById("edit-expense-kategori").value,
        jumlah: document.getElementById("edit-expense-jumlah").value,
        tipe: document.getElementById("edit-expense-tipe").value,
        tanggal: document.getElementById("edit-expense-tanggal").value,
      };

      const errors = validateExpenseForm(values);
      if (errors.length > 0) {
        ModalEngine.showFieldErrorsAlert("Data ubahan belum valid", errors, () => openEditModal(target, values));
        return;
      }

      target.judul = values.judul.trim();
      target.kategori = values.kategori;
      target.jumlah = parseFloat(values.jumlah);
      target.tipe = values.tipe;
      target.tanggal = values.tanggal;

      saveExpenseData();
      renderExpenseUI();
      ModalEngine.close();
    };
  }

  // Satu listener di container untuk semua tombol Ubah/Hapus (event delegation)
  containerList.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".btn-edit-expense");
    const deleteBtn = e.target.closest(".btn-delete-expense");

    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      const target = transactions.find((t) => t.id === id);
      if (!target) return;

      ModalEngine.open("Hapus Transaksi", createConfirmModalHTML(
        `Hapus transaksi "<strong>${escapeHTML(target.judul)}</strong>"? Tindakan ini tidak bisa dibatalkan.`
      ));
      document.getElementById("btn-cancel-modal").onclick = () => ModalEngine.close();
      document.getElementById("btn-confirm-delete").onclick = () => {
        transactions = transactions.filter((t) => t.id !== id);
        saveExpenseData();
        renderExpenseUI();
        ModalEngine.close();
      };
    }

    if (editBtn) {
      const target = transactions.find((t) => t.id === editBtn.dataset.id);
      if (target) openEditModal(target, target);
    }
  });

  inputSearch.addEventListener("input", renderExpenseUI);
  filterTipe.addEventListener("change", renderExpenseUI);
  filterKategori.addEventListener("change", renderExpenseUI);
  sortOption.addEventListener("change", renderExpenseUI);

  renderExpenseUI();
}

/* ==========================================================================
   6. FITUR 3.2: BOOKMARK / LINK MANAGER
   ========================================================================== */
function initBookmarkManager() {
  const form = document.getElementById("form-bookmark");
  const inputNama = document.getElementById("bookmark-nama");
  const inputUrl = document.getElementById("bookmark-url");
  const inputKategori = document.getElementById("bookmark-kategori");
  const inputCatatan = document.getElementById("bookmark-catatan");

  const containerList = document.getElementById("daftar-bookmark");
  const inputSearch = document.getElementById("bookmark-search");
  const sortOption = document.getElementById("bookmark-sort");

  fillSelect(inputKategori, BOOKMARK_CATEGORIES);

  let bookmarks = loadFromStorage(STORAGE_KEYS.bookmark);

  function saveBookmarkData() {
    saveToStorage(STORAGE_KEYS.bookmark, bookmarks);
  }

  function renderBookmarkUI() {
    let processed = [...bookmarks];

    // Cari berdasarkan nama, URL, atau kategori
    const query = inputSearch.value.trim().toLowerCase();
    if (query) {
      processed = processed.filter((b) =>
        b.nama.toLowerCase().includes(query) ||
        b.url.toLowerCase().includes(query) ||
        b.kategori.toLowerCase().includes(query)
      );
    }

    const sortVal = sortOption.value;
    processed.sort((a, b) => {
      if (sortVal === "az") return a.nama.localeCompare(b.nama);
      if (sortVal === "za") return b.nama.localeCompare(a.nama);
      return b.timestamp - a.timestamp; // terbaru (default)
    });

    containerList.innerHTML = "";

    // Empty state
    if (processed.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "col-span-full text-center py-10 text-slate-300 text-xs border border-dashed border-slate-700 rounded-xl";
      const message = bookmarks.length === 0
        ? "Belum ada bookmark. Simpan tautan pertama lewat form di atas."
        : "Tidak ada bookmark yang cocok dengan pencarian.";
      emptyDiv.innerHTML = `<span class="block mb-2">${icon("bookmark", "w-8 h-8")}</span>${message}`;
      containerList.appendChild(emptyDiv);
      return;
    }

    processed.forEach((item) => containerList.appendChild(createBookmarkCardElement(item)));
  }

  // Tambah bookmark
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const values = {
      nama: inputNama.value,
      url: inputUrl.value,
      kategori: inputKategori.value,
    };

    const errors = validateBookmarkForm(values);
    if (errors.length > 0) {
      ModalEngine.showFieldErrorsAlert("Data bookmark belum valid", errors);
      return;
    }

    bookmarks.unshift({
      id: Date.now().toString(),
      nama: values.nama.trim(),
      url: values.url.trim(),
      kategori: values.kategori,
      catatan: inputCatatan.value.trim(),
      timestamp: Date.now(),
    });

    saveBookmarkData();
    renderBookmarkUI();
    form.reset();
  });

  // Modal ubah (form dibuka lagi dengan isian terakhir jika validasi gagal)
  function openEditModal(target, draft) {
    ModalEngine.open("Ubah Bookmark", createBookmarkEditModalHTML(draft));

    document.getElementById("btn-cancel-modal").onclick = () => ModalEngine.close();
    document.getElementById("form-edit-bookmark").onsubmit = (ev) => {
      ev.preventDefault();

      const values = {
        nama: document.getElementById("edit-bm-nama").value,
        url: document.getElementById("edit-bm-url").value,
        kategori: document.getElementById("edit-bm-kategori").value,
        catatan: document.getElementById("edit-bm-catatan").value,
      };

      const errors = validateBookmarkForm(values);
      if (errors.length > 0) {
        ModalEngine.showFieldErrorsAlert("Data ubahan belum valid", errors, () => openEditModal(target, values));
        return;
      }

      target.nama = values.nama.trim();
      target.url = values.url.trim();
      target.kategori = values.kategori;
      target.catatan = values.catatan.trim();

      saveBookmarkData();
      renderBookmarkUI();
      ModalEngine.close();
    };
  }

  containerList.addEventListener("click", (e) => {
    const deleteBtn = e.target.closest(".btn-delete-bookmark");
    const editBtn = e.target.closest(".btn-edit-bookmark");

    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      const target = bookmarks.find((b) => b.id === id);
      if (!target) return;

      ModalEngine.open("Hapus Bookmark", createConfirmModalHTML(
        `Hapus tautan "<strong>${escapeHTML(target.nama)}</strong>"?`
      ));
      document.getElementById("btn-cancel-modal").onclick = () => ModalEngine.close();
      document.getElementById("btn-confirm-delete").onclick = () => {
        bookmarks = bookmarks.filter((b) => b.id !== id);
        saveBookmarkData();
        renderBookmarkUI();
        ModalEngine.close();
      };
    }

    if (editBtn) {
      const target = bookmarks.find((b) => b.id === editBtn.dataset.id);
      if (target) openEditModal(target, target);
    }
  });

  inputSearch.addEventListener("input", renderBookmarkUI);
  sortOption.addEventListener("change", renderBookmarkUI);

  renderBookmarkUI();
}

/* ==========================================================================
   7. FITUR 3.3: KUIS INTERAKTIF
   ========================================================================== */
function initQuizApp() {
  // Soal berupa array of object: pertanyaan, opsi (4), dan indeks jawaban benar
  const quizData = [
    {
      pertanyaan: "Elemen HTML5 semantik mana yang paling tepat untuk membungkus navigasi utama web?",
      opsi: ["<section>", "<header>", "<nav>", "<aside>"],
      jawaban: 2,
    },
    {
      pertanyaan: "Method JavaScript untuk mengubah string JSON menjadi objek adalah:",
      opsi: ["JSON.stringify()", "JSON.parse()", "JSON.toObject()", "JSON.convert()"],
      jawaban: 1,
    },
    {
      pertanyaan: "Di mana data localStorage disimpan?",
      opsi: ["RAM sementara (session)", "Server database jarak jauh", "Cookie HTTP", "Browser milik pengguna"],
      jawaban: 3,
    },
    {
      pertanyaan: "Bagaimana cara mendeteksi klik pada tombol dengan JavaScript tanpa atribut inline di HTML?",
      opsi: ["button.addEventListener('click', fn)", "button.onclick()", "button.setEvent('click')", "button.attachClick()"],
      jawaban: 0,
    },
    {
      pertanyaan: "Method array mana yang menghasilkan array baru dari hasil transformasi tiap elemen?",
      opsi: ["forEach()", "filter()", "map()", "reduce()"],
      jawaban: 2,
    },
  ];

  const TIME_PER_QUESTION = 15; // detik

  const screenStart = document.getElementById("quiz-screen-start");
  const screenRunning = document.getElementById("quiz-screen-running");
  const screenResult = document.getElementById("quiz-screen-result");

  const btnStart = document.getElementById("btn-quiz-start");
  const btnRestart = document.getElementById("btn-quiz-restart");
  const btnNext = document.getElementById("btn-quiz-next");

  const elProgress = document.getElementById("quiz-progress-text");
  const elTimer = document.getElementById("quiz-timer-text");
  const elQuestion = document.getElementById("quiz-question-text");
  const elOptions = document.getElementById("quiz-options-container");
  const elFeedback = document.getElementById("quiz-feedback");

  const elHighScoreVal = document.getElementById("quiz-high-score-val");
  const elFinalScore = document.getElementById("quiz-final-score");
  const elNewRecord = document.getElementById("quiz-new-record");

  // State kuis
  let currentIndex = 0;
  let correctCount = 0;
  let timerInterval = null;
  let timeLeft = TIME_PER_QUESTION;
  let answered = false;

  // High score dari localStorage
  let highScore = parseInt(localStorage.getItem(STORAGE_KEYS.quizHighScore) || "0", 10);
  if (isNaN(highScore)) highScore = 0;
  elHighScoreVal.textContent = highScore;

  const OPTION_BASE = "w-full text-left p-3.5 rounded-xl border text-xs font-medium text-slate-200 transition-all flex items-center gap-3 option-btn";
  const OPTION_STYLE = {
    normal: "border-slate-700 bg-slate-900/80 hover:bg-indigo-950/50 hover:border-indigo-500/50",
    correct: "border-emerald-500 bg-emerald-950/80",
    wrong: "border-rose-500 bg-rose-950/80",
    idle: "border-slate-700 bg-slate-900/80 opacity-60",
  };

  function setOptionStyle(btn, style) {
    // className ditimpa penuh agar kelas warna lama tidak bentrok dengan yang baru
    btn.className = `${OPTION_BASE} ${OPTION_STYLE[style]}`;
  }

  function startQuiz() {
    currentIndex = 0;
    correctCount = 0;
    screenStart.classList.add("hidden");
    screenResult.classList.add("hidden");
    screenRunning.classList.remove("hidden");
    loadQuestion();
  }

  function loadQuestion() {
    clearInterval(timerInterval);
    timeLeft = TIME_PER_QUESTION;
    answered = false;

    btnNext.classList.add("hidden");
    elFeedback.classList.add("hidden");
    updateTimerUI();

    const q = quizData[currentIndex];
    elProgress.textContent = `Soal ${currentIndex + 1} dari ${quizData.length}`;
    elQuestion.textContent = q.pertanyaan;
    btnNext.textContent = currentIndex === quizData.length - 1 ? "Lihat Hasil" : "Soal Berikutnya";

    // Render opsi dari data
    elOptions.innerHTML = "";
    q.opsi.forEach((opsiText, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      setOptionStyle(btn, "normal");

      const badge = document.createElement("span");
      badge.className = "w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300 border border-slate-700 flex-shrink-0";
      badge.textContent = String.fromCharCode(65 + i); // A, B, C, D

      const label = document.createElement("span");
      label.className = "flex-grow";
      label.textContent = opsiText;

      btn.append(badge, label);
      btn.addEventListener("click", () => selectOption(i));
      elOptions.appendChild(btn);
    });

    // Timer per soal
    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimerUI();
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        answered = true;
        showFeedback(null);
      }
    }, 1000);
  }

  function updateTimerUI() {
    elTimer.textContent = `Waktu: ${timeLeft}s`;
  }

  function selectOption(index) {
    if (answered) return;
    answered = true;
    clearInterval(timerInterval);
    showFeedback(index);
  }

  // selectedIndex = null berarti waktu habis
  function showFeedback(selectedIndex) {
    const q = quizData[currentIndex];
    const optionBtns = elOptions.querySelectorAll(".option-btn");
    const isTimeout = selectedIndex === null;
    const isCorrect = selectedIndex === q.jawaban;

    optionBtns.forEach((btn, i) => {
      btn.disabled = true;
      setOptionStyle(btn, i === q.jawaban ? "correct" : (i === selectedIndex ? "wrong" : "idle"));
    });

    const feedbackBase = "p-3 rounded-xl text-xs font-medium text-center border";
    const rightAnswer = `<strong>${escapeHTML(q.opsi[q.jawaban])}</strong>`;

    if (isCorrect) {
      correctCount++;
      elFeedback.className = `${feedbackBase} bg-emerald-950/80 border-emerald-800 text-emerald-300`;
      elFeedback.innerHTML = `${icon("checkCircle")} Benar!`;
    } else if (isTimeout) {
      elFeedback.className = `${feedbackBase} bg-rose-950/80 border-rose-800 text-rose-300`;
      elFeedback.innerHTML = `${icon("clock")} Waktu habis. Jawaban benar: ${rightAnswer}`;
    } else {
      elFeedback.className = `${feedbackBase} bg-rose-950/80 border-rose-800 text-rose-300`;
      elFeedback.innerHTML = `${icon("xCircle")} Salah. Jawaban benar: ${rightAnswer}`;
    }

    btnNext.classList.remove("hidden");
  }

  function finishQuiz() {
    clearInterval(timerInterval);
    screenRunning.classList.add("hidden");
    screenResult.classList.remove("hidden");

    // Skor skala 0-100 (5 soal benar = 100)
    const finalScore = Math.round((correctCount / quizData.length) * 100);
    elFinalScore.textContent = `${finalScore} / 100 (${correctCount} dari ${quizData.length} benar)`;

    if (finalScore > highScore) {
      highScore = finalScore;
      localStorage.setItem(STORAGE_KEYS.quizHighScore, String(highScore));
      elHighScoreVal.textContent = highScore;
      elNewRecord.classList.remove("hidden");
    } else {
      elNewRecord.classList.add("hidden");
    }
  }

  btnNext.addEventListener("click", () => {
    currentIndex++;
    if (currentIndex < quizData.length) loadQuestion();
    else finishQuiz();
  });

  btnStart.addEventListener("click", startQuiz);
  btnRestart.addEventListener("click", startQuiz);

  // Dipanggil saat pengguna pindah tab: hentikan timer, kembali ke layar mulai jika kuis sedang berjalan
  function stopAndReset() {
    clearInterval(timerInterval);
    if (!screenRunning.classList.contains("hidden")) {
      screenRunning.classList.add("hidden");
      screenStart.classList.remove("hidden");
    }
  }

  return { stopAndReset };
}