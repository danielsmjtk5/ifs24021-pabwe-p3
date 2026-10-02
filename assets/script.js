/**
 * KopdesFITE - Integrated Application Suite Logic
 * Practical Web Development Assignment - PABWE P3
 *
 * Versi multi-halaman: setiap fitur punya halaman sendiri
 *   /          -> Catatan Keuangan (Expense Tracker)
 *   /bookmark/ -> Link Manager
 *   /quiz/     -> Kuis Interaktif
 */

document.addEventListener("DOMContentLoaded", () => {
  ModalEngine.init();

  // Fitur hanya dijalankan jika elemennya ada di halaman yang sedang dibuka
  if (document.getElementById("form-expense")) initExpenseTracker();
  if (document.getElementById("form-bookmark")) initBookmarkManager();
  if (document.getElementById("quiz-screen-start")) initQuizApp();
});

/* ==========================================================================
   0. HELPER & UTILITY ENGINE
   ========================================================================== */

/* Baca localStorage dengan aman: jika data kosong/rusak, pakai nilai cadangan */
function loadFromStorage(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`Data "${key}" rusak, memakai data kosong.`, err);
    return fallback;
  }
}

/* Universal Custom Modal Engine */
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

    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => this.close());
    }

    if (this.backdrop) {
      this.backdrop.addEventListener("click", (e) => {
        if (e.target === this.backdrop) this.close();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.backdrop && !this.backdrop.classList.contains("hidden")) {
        this.close();
      }
    });

    this.initialized = true;
  },

  open(modalTitle, contentHtml) {
    this.init();
    if (this.title) this.title.textContent = modalTitle;
    if (this.body) this.body.innerHTML = contentHtml;
    if (this.backdrop) this.backdrop.classList.remove("hidden");
  },

  close() {
    if (this.backdrop) this.backdrop.classList.add("hidden");
    if (this.body) this.body.innerHTML = "";
  },

  showFieldErrorsAlert(title, errors) {
    const errorItemsHTML = errors.map(err => `
      <li class="flex items-start gap-2 text-rose-300">
        <i class="fa-solid fa-circle-exclamation mt-0.5 text-rose-400 text-xs flex-shrink-0" aria-hidden="true"></i>
        <span><strong class="text-slate-200">${escapeHTML(err.label)}:</strong> ${escapeHTML(err.message)}</span>
      </li>
    `).join("");

    this.open(title, `
      <div class="space-y-3">
        <p class="text-xs text-slate-300 leading-relaxed font-medium">Terdapat data input yang belum sesuai validasi:</p>
        <ul class="space-y-2 text-xs bg-rose-950/40 border border-rose-900/60 p-3 rounded-xl">
          ${errorItemsHTML}
        </ul>
      </div>
      <div class="flex justify-end pt-2">
        <button id="btn-modal-alert-ok" class="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-all">Perbaiki Data</button>
      </div>
    `);
    const btnAlertOk = document.getElementById("btn-modal-alert-ok");
    if (btnAlertOk) {
      btnAlertOk.onclick = () => this.close();
    }
  }
};

/* Escaping String XSS Helper */
function escapeHTML(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  return str.replace(/[&<>'"]/g,
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

/* DOM Element Expense Card Builder */
function createExpenseCardElement(item, isIncome, formattedAmount) {
  const card = document.createElement("div");
  card.className = "flex items-center justify-between p-3.5 bg-slate-900/70 rounded-xl border border-slate-700/60 hover:border-slate-600 transition-all";

  // Left Section
  const leftCol = document.createElement("div");
  leftCol.className = "flex items-center gap-3";

  const iconBox = document.createElement("div");
  iconBox.className = `w-9 h-9 rounded-lg flex items-center justify-center ${isIncome ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50' : 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
    }`;
  const icon = document.createElement("i");
  icon.className = `fa-solid ${isIncome ? 'fa-arrow-down' : 'fa-arrow-up'} text-xs`;
  icon.setAttribute("aria-hidden", "true");
  iconBox.appendChild(icon);

  const textInfo = document.createElement("div");
  const title = document.createElement("h3");
  title.className = "text-xs font-semibold text-slate-200";
  title.textContent = item.judul;

  const metaRow = document.createElement("div");
  metaRow.className = "flex items-center gap-2 mt-0.5";

  const catBadge = document.createElement("span");
  catBadge.className = "text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700";
  catBadge.textContent = item.kategori;

  const dateSpan = document.createElement("span");
  dateSpan.className = "text-[10px] text-slate-400";
  dateSpan.textContent = item.tanggal;

  metaRow.appendChild(catBadge);
  metaRow.appendChild(dateSpan);
  textInfo.appendChild(title);
  textInfo.appendChild(metaRow);

  leftCol.appendChild(iconBox);
  leftCol.appendChild(textInfo);

  // Right Section
  const rightCol = document.createElement("div");
  rightCol.className = "flex items-center gap-3";

  const amountSpan = document.createElement("span");
  amountSpan.className = `text-xs font-bold ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`;
  amountSpan.textContent = `${isIncome ? '+' : '-'} ${formattedAmount}`;

  const actionGroup = document.createElement("div");
  actionGroup.className = "flex items-center gap-1";

  const editBtn = document.createElement("button");
  editBtn.className = "btn-edit-expense p-1 text-slate-400 hover:text-indigo-400 text-xs transition-colors";
  editBtn.setAttribute("data-id", item.id);
  editBtn.setAttribute("title", "Ubah Transaksi");
  editBtn.setAttribute("aria-label", `Ubah transaksi ${item.judul}`);
  editBtn.innerHTML = '<i class="fa-solid fa-pen" aria-hidden="true"></i>';

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn-delete-expense p-1 text-slate-400 hover:text-rose-400 text-xs transition-colors";
  deleteBtn.setAttribute("data-id", item.id);
  deleteBtn.setAttribute("title", "Hapus Transaksi");
  deleteBtn.setAttribute("aria-label", `Hapus transaksi ${item.judul}`);
  deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i>';

  actionGroup.appendChild(editBtn);
  actionGroup.appendChild(deleteBtn);
  rightCol.appendChild(amountSpan);
  rightCol.appendChild(actionGroup);

  card.appendChild(leftCol);
  card.appendChild(rightCol);
  return card;
}

/* DOM Element Bookmark Card Builder */
function createBookmarkCardElement(item) {
  const card = document.createElement("div");
  card.className = "p-4 bg-slate-900/70 rounded-xl border border-slate-700/60 hover:border-indigo-500/50 transition-all flex flex-col justify-between space-y-3";

  const topSection = document.createElement("div");

  const headerRow = document.createElement("div");
  headerRow.className = "flex justify-between items-start gap-2";

  const badge = document.createElement("span");
  badge.className = "text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50";
  badge.textContent = item.kategori;

  const actionGroup = document.createElement("div");
  actionGroup.className = "flex items-center gap-1";

  const editBtn = document.createElement("button");
  editBtn.className = "btn-edit-bookmark text-slate-400 hover:text-indigo-400 text-xs p-1 transition-colors";
  editBtn.setAttribute("data-id", item.id);
  editBtn.setAttribute("title", "Ubah Bookmark");
  editBtn.setAttribute("aria-label", `Ubah bookmark ${item.nama}`);
  editBtn.innerHTML = '<i class="fa-solid fa-pen" aria-hidden="true"></i>';

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn-delete-bookmark text-slate-400 hover:text-rose-400 text-xs p-1 transition-colors";
  deleteBtn.setAttribute("data-id", item.id);
  deleteBtn.setAttribute("title", "Hapus Bookmark");
  deleteBtn.setAttribute("aria-label", `Hapus bookmark ${item.nama}`);
  deleteBtn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';

  actionGroup.appendChild(editBtn);
  actionGroup.appendChild(deleteBtn);
  headerRow.appendChild(badge);
  headerRow.appendChild(actionGroup);

  const title = document.createElement("h3");
  title.className = "font-bold text-slate-200 mt-2 text-xs line-clamp-1";
  title.textContent = item.nama;

  const urlDisplay = document.createElement("p");
  urlDisplay.className = "text-[11px] text-slate-400 line-clamp-1 mt-0.5";
  urlDisplay.textContent = item.url;

  topSection.appendChild(headerRow);
  topSection.appendChild(title);
  topSection.appendChild(urlDisplay);

  if (item.catatan) {
    const note = document.createElement("p");
    note.className = "text-[10px] text-slate-400 italic mt-1 line-clamp-2";
    note.textContent = item.catatan;
    topSection.appendChild(note);
  }

  const visitLink = document.createElement("a");
  visitLink.href = item.url;
  visitLink.target = "_blank";
  visitLink.rel = "noopener noreferrer";
  visitLink.className = "inline-flex items-center justify-center gap-2 text-xs font-medium text-indigo-400 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/40 py-1.5 rounded-lg transition-colors w-full";

  const linkText = document.createElement("span");
  linkText.textContent = "Kunjungi Tautan";
  const linkIcon = document.createElement("i");
  linkIcon.className = "fa-solid fa-arrow-up-right-from-square text-[10px]";
  linkIcon.setAttribute("aria-hidden", "true");
  visitLink.appendChild(linkText);
  visitLink.appendChild(linkIcon);

  card.appendChild(topSection);
  card.appendChild(visitLink);
  return card;
}

/* Helper Format Tanggal Lokal */
function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function setSafeDateInputValue(inputElement, date = new Date()) {
  if (inputElement) {
    inputElement.value = getLocalDateString(date);
  }
}

/* Modal Template Builders */
function createModalActionButtonsHTML(submitText = "Simpan Perubahan", cancelText = "Batal") {
  return `
    <div class="flex justify-end gap-2 pt-2">
      <button type="button" id="btn-cancel-modal" class="px-3.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-medium text-slate-200 transition-all">${escapeHTML(cancelText)}</button>
      <button type="submit" class="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-all">${escapeHTML(submitText)}</button>
    </div>
  `;
}

function createEditModalFormHTML(formId, fieldsHTML, submitText = "Simpan Perubahan") {
  return `
    <form id="${escapeHTML(formId)}" novalidate class="space-y-3">
      ${fieldsHTML}
      ${createModalActionButtonsHTML(submitText)}
    </form>
  `;
}

function createConfirmModalHTML(messageHtml, confirmBtnText = "Hapus") {
  return `
    <p class="text-xs text-slate-300 leading-relaxed">${messageHtml}</p>
    <div class="flex justify-end gap-2 pt-2">
      <button id="btn-cancel-modal" class="px-3.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-medium text-slate-200 transition-all">Batal</button>
      <button id="btn-confirm-delete" class="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white transition-all">${escapeHTML(confirmBtnText)}</button>
    </div>
  `;
}

function createExpenseEditModalHTML(target) {
  const categories = ["Makanan & Minuman", "Gaji & Project", "Transportasi", "Hiburan", "Tagihan & Edukasi", "Lain-Lain"];
  const fieldsHTML = `
    <div>
      <label for="edit-expense-judul" class="block text-xs font-medium text-slate-300 mb-1">Judul / Deskripsi</label>
      <input type="text" id="edit-expense-judul" value="${escapeHTML(target.judul)}" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
    </div>
    <div>
      <label for="edit-expense-kategori" class="block text-xs font-medium text-slate-300 mb-1">Kategori</label>
      <select id="edit-expense-kategori" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
        ${categories.map(cat =>
    `<option value="${escapeHTML(cat)}" ${target.kategori === cat ? 'selected' : ''}>${escapeHTML(cat)}</option>`
  ).join('')}
      </select>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <div>
        <label for="edit-expense-jumlah" class="block text-xs font-medium text-slate-300 mb-1">Jumlah (Rp)</label>
        <input type="number" id="edit-expense-jumlah" min="1" value="${escapeHTML(target.jumlah)}" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
      </div>
      <div>
        <label for="edit-expense-tipe" class="block text-xs font-medium text-slate-300 mb-1">Tipe</label>
        <select id="edit-expense-tipe" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
          <option value="Pengeluaran" ${target.tipe === 'Pengeluaran' ? 'selected' : ''}>Pengeluaran</option>
          <option value="Pemasukan" ${target.tipe === 'Pemasukan' ? 'selected' : ''}>Pemasukan</option>
        </select>
      </div>
    </div>
    <div>
      <label for="edit-expense-tanggal" class="block text-xs font-medium text-slate-300 mb-1">Tanggal</label>
      <input type="date" id="edit-expense-tanggal" value="${escapeHTML(target.tanggal)}" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
    </div>
  `;
  return createEditModalFormHTML("form-edit-expense", fieldsHTML);
}

function createBookmarkEditModalHTML(target) {
  const categories = ["Pemrograman", "Kuliah & Riset", "Desain & Media", "Produktivitas", "Lainnya"];
  const fieldsHTML = `
    <div>
      <label for="edit-bm-nama" class="block text-xs font-medium text-slate-300 mb-1">Nama Situs</label>
      <input type="text" id="edit-bm-nama" value="${escapeHTML(target.nama)}" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
    </div>
    <div>
      <label for="edit-bm-url" class="block text-xs font-medium text-slate-300 mb-1">URL (http:// atau https://)</label>
      <input type="url" id="edit-bm-url" value="${escapeHTML(target.url)}" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
    </div>
    <div>
      <label for="edit-bm-kategori" class="block text-xs font-medium text-slate-300 mb-1">Kategori</label>
      <select id="edit-bm-kategori" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
        ${categories.map(cat =>
    `<option value="${escapeHTML(cat)}" ${target.kategori === cat ? 'selected' : ''}>${escapeHTML(cat)}</option>`
  ).join('')}
      </select>
    </div>
    <div>
      <label for="edit-bm-catatan" class="block text-xs font-medium text-slate-300 mb-1">Catatan Singkat</label>
      <textarea id="edit-bm-catatan" rows="2" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 resize-none focus:outline-none focus:border-indigo-500">${escapeHTML(target.catatan || '')}</textarea>
    </div>
  `;
  return createEditModalFormHTML("form-edit-bookmark", fieldsHTML);
}

/* Validasi Form */
function validateExpenseForm({ judul, kategori, jumlah, tipe, tanggal }) {
  const errors = [];
  const validCategories = ["Makanan & Minuman", "Gaji & Project", "Transportasi", "Hiburan", "Tagihan & Edukasi", "Lain-Lain"];
  const validTypes = ["Pengeluaran", "Pemasukan"];

  const trimmedJudul = (judul || "").trim();
  if (!trimmedJudul) {
    errors.push({ fieldId: "judul", label: "Judul / Deskripsi", message: "Judul transaksi wajib diisi." });
  } else if (trimmedJudul.length < 3) {
    errors.push({ fieldId: "judul", label: "Judul / Deskripsi", message: "Judul transaksi minimal 3 karakter." });
  }

  if (!kategori || !validCategories.includes(kategori)) {
    errors.push({ fieldId: "kategori", label: "Kategori", message: "Silakan pilih salah satu kategori yang valid." });
  }

  const numJumlah = Number(jumlah);
  if (jumlah === "" || isNaN(numJumlah) || numJumlah <= 0) {
    errors.push({ fieldId: "jumlah", label: "Jumlah (Rp)", message: "Nominal harus angka lebih besar dari 0." });
  }

  if (!tipe || !validTypes.includes(tipe)) {
    errors.push({ fieldId: "tipe", label: "Tipe Transaksi", message: "Pilih tipe antara Pengeluaran atau Pemasukan." });
  }

  if (!tanggal || isNaN(new Date(tanggal).getTime())) {
    errors.push({ fieldId: "tanggal", label: "Tanggal", message: "Pilih tanggal transaksi yang valid." });
  }

  return errors;
}

function validateBookmarkForm({ nama, url, kategori }) {
  const errors = [];
  const validCategories = ["Pemrograman", "Kuliah & Riset", "Desain & Media", "Produktivitas", "Lainnya"];

  const trimmedNama = (nama || "").trim();
  if (!trimmedNama || trimmedNama.length < 2) {
    errors.push({ fieldId: "nama", label: "Nama Situs", message: "Nama situs minimal 2 karakter." });
  }

  const trimmedUrl = (url || "").trim();
  if (!trimmedUrl || !/^https?:\/\/.+/i.test(trimmedUrl)) {
    errors.push({ fieldId: "url", label: "URL Tautan", message: "URL harus diawali dengan http:// atau https://" });
  }

  if (!kategori || !validCategories.includes(kategori)) {
    errors.push({ fieldId: "kategori", label: "Kategori", message: "Pilih kategori bookmark yang valid." });
  }

  return errors;
}

/* ==========================================================================
   1. FITUR 3.1: CATATAN PENGELUARAN HARIAN (EXPENSE TRACKER) -> halaman /
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
  const sortOption = document.getElementById("expense-sort");

  setSafeDateInputValue(inputTanggal);

  let transactions = loadFromStorage("kopdesfite_expense");

  function saveExpenseData() {
    localStorage.setItem("kopdesfite_expense", JSON.stringify(transactions));
  }

  function formatIDR(amount) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
  }

  function renderExpenseUI() {
    let totalIn = 0;
    let totalOut = 0;
    transactions.forEach(t => {
      if (t.tipe === "Pemasukan") totalIn += Number(t.jumlah);
      else totalOut += Number(t.jumlah);
    });

    elPemasukan.textContent = formatIDR(totalIn);
    elPengeluaran.textContent = formatIDR(totalOut);
    elSaldo.textContent = formatIDR(totalIn - totalOut);

    let processed = [...transactions];
    const query = inputSearch.value.trim().toLowerCase();
    if (query) {
      processed = processed.filter(t => t.judul.toLowerCase().includes(query));
    }

    const tipeVal = filterTipe.value;
    if (tipeVal !== "SEMUA") {
      processed = processed.filter(t => t.tipe === tipeVal);
    }

    const sortVal = sortOption.value;
    processed.sort((a, b) => {
      if (sortVal === "terbaru") return new Date(b.tanggal) - new Date(a.tanggal);
      if (sortVal === "terlama") return new Date(a.tanggal) - new Date(b.tanggal);
      if (sortVal === "terbesar") return b.jumlah - a.jumlah;
      if (sortVal === "terkecil") return a.jumlah - b.jumlah;
    });

    containerList.innerHTML = "";

    // Empty State dengan warna text-slate-300 yang memenuhi kontras WCAG AA
    if (processed.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "text-center py-10 text-slate-300 text-xs border border-dashed border-slate-700 rounded-xl";
      emptyDiv.innerHTML = '<i class="fa-solid fa-receipt text-2xl mb-2 block" aria-hidden="true"></i> Belum ada catatan transaksi yang sesuai.';
      containerList.appendChild(emptyDiv);
      return;
    }

    processed.forEach(item => {
      const isIncome = item.tipe === "Pemasukan";
      const card = createExpenseCardElement(item, isIncome, formatIDR(item.jumlah));
      containerList.appendChild(card);
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const validationErrors = validateExpenseForm({
      judul: inputJudul.value,
      kategori: inputKategori.value,
      jumlah: inputJumlah.value,
      tipe: inputTipe.value,
      tanggal: inputTanggal.value
    });

    if (validationErrors.length > 0) {
      ModalEngine.showFieldErrorsAlert("Validasi Transaksi", validationErrors);
      return;
    }

    transactions.push({
      id: Date.now().toString(),
      judul: inputJudul.value.trim(),
      kategori: inputKategori.value,
      jumlah: parseFloat(inputJumlah.value),
      tipe: inputTipe.value,
      tanggal: inputTanggal.value
    });

    saveExpenseData();
    renderExpenseUI();
    form.reset();
    setSafeDateInputValue(inputTanggal);
  });

  containerList.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".btn-edit-expense");
    const deleteBtn = e.target.closest(".btn-delete-expense");

    if (deleteBtn) {
      const id = deleteBtn.getAttribute("data-id");
      const target = transactions.find(t => t.id === id);
      if (!target) return;

      ModalEngine.open("Hapus Transaksi", createConfirmModalHTML(
        `Apakah Anda yakin ingin menghapus catatan "<strong>${escapeHTML(target.judul)}</strong>"?`
      ));

      document.getElementById("btn-cancel-modal").onclick = () => ModalEngine.close();
      document.getElementById("btn-confirm-delete").onclick = () => {
        transactions = transactions.filter(t => t.id !== id);
        saveExpenseData();
        renderExpenseUI();
        ModalEngine.close();
      };
    }

    if (editBtn) {
      const id = editBtn.getAttribute("data-id");
      const target = transactions.find(t => t.id === id);
      if (!target) return;

      ModalEngine.open("Ubah Transaksi", createExpenseEditModalHTML(target));

      const editForm = document.getElementById("form-edit-expense");
      document.getElementById("btn-cancel-modal").onclick = () => ModalEngine.close();

      editForm.onsubmit = (ev) => {
        ev.preventDefault();
        const updatedJudul = document.getElementById("edit-expense-judul").value;
        const updatedKategori = document.getElementById("edit-expense-kategori").value;
        const updatedJumlah = document.getElementById("edit-expense-jumlah").value;
        const updatedTipe = document.getElementById("edit-expense-tipe").value;
        const updatedTanggal = document.getElementById("edit-expense-tanggal").value;

        const validationErrors = validateExpenseForm({
          judul: updatedJudul,
          kategori: updatedKategori,
          jumlah: updatedJumlah,
          tipe: updatedTipe,
          tanggal: updatedTanggal
        });

        if (validationErrors.length > 0) {
          ModalEngine.showFieldErrorsAlert("Validasi Ubah Transaksi", validationErrors);
          return;
        }

        target.judul = updatedJudul.trim();
        target.kategori = updatedKategori;
        target.jumlah = parseFloat(updatedJumlah);
        target.tipe = updatedTipe;
        target.tanggal = updatedTanggal;

        saveExpenseData();
        renderExpenseUI();
        ModalEngine.close();
      };
    }
  });

  inputSearch.addEventListener("input", renderExpenseUI);
  filterTipe.addEventListener("change", renderExpenseUI);
  sortOption.addEventListener("change", renderExpenseUI);

  renderExpenseUI();
}

/* ==========================================================================
   2. FITUR 3.2: BOOKMARK / LINK MANAGER -> halaman /bookmark/
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

  let bookmarks = loadFromStorage("kopdesfite_bookmark");

  function saveBookmarkData() {
    localStorage.setItem("kopdesfite_bookmark", JSON.stringify(bookmarks));
  }

  function renderBookmarkUI() {
    let processed = [...bookmarks];
    const query = inputSearch.value.trim().toLowerCase();
    if (query) {
      processed = processed.filter(b =>
        b.nama.toLowerCase().includes(query) ||
        b.url.toLowerCase().includes(query)
      );
    }

    const sortVal = sortOption.value;
    processed.sort((a, b) => {
      if (sortVal === "az") return a.nama.localeCompare(b.nama);
      if (sortVal === "za") return b.nama.localeCompare(a.nama);
      return b.timestamp - a.timestamp;
    });

    containerList.innerHTML = "";

    // Empty State dengan warna text-slate-300 yang memenuhi kontras WCAG AA
    if (processed.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "col-span-full text-center py-10 text-slate-300 text-xs border border-dashed border-slate-700 rounded-xl";
      emptyDiv.innerHTML = '<i class="fa-solid fa-bookmark text-2xl mb-2 block" aria-hidden="true"></i> Tidak ada tautan tersimpan.';
      containerList.appendChild(emptyDiv);
      return;
    }

    processed.forEach(item => {
      const card = createBookmarkCardElement(item);
      containerList.appendChild(card);
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const validationErrors = validateBookmarkForm({
      nama: inputNama.value,
      url: inputUrl.value,
      kategori: inputKategori.value
    });

    if (validationErrors.length > 0) {
      ModalEngine.showFieldErrorsAlert("Validasi Bookmark", validationErrors);
      return;
    }

    bookmarks.unshift({
      id: Date.now().toString(),
      nama: inputNama.value.trim(),
      url: inputUrl.value.trim(),
      kategori: inputKategori.value,
      catatan: inputCatatan.value.trim(),
      timestamp: Date.now()
    });

    saveBookmarkData();
    renderBookmarkUI();
    form.reset();
  });

  containerList.addEventListener("click", (e) => {
    const deleteBtn = e.target.closest(".btn-delete-bookmark");
    const editBtn = e.target.closest(".btn-edit-bookmark");

    if (deleteBtn) {
      const id = deleteBtn.getAttribute("data-id");
      const target = bookmarks.find(b => b.id === id);
      if (!target) return;

      ModalEngine.open("Hapus Bookmark", createConfirmModalHTML(
        `Hapus tautan "<strong>${escapeHTML(target.nama)}</strong>"?`
      ));

      document.getElementById("btn-cancel-modal").onclick = () => ModalEngine.close();
      document.getElementById("btn-confirm-delete").onclick = () => {
        bookmarks = bookmarks.filter(b => b.id !== id);
        saveBookmarkData();
        renderBookmarkUI();
        ModalEngine.close();
      };
    }

    if (editBtn) {
      const id = editBtn.getAttribute("data-id");
      const target = bookmarks.find(b => b.id === id);
      if (!target) return;

      ModalEngine.open("Ubah Bookmark", createBookmarkEditModalHTML(target));

      const editForm = document.getElementById("form-edit-bookmark");
      document.getElementById("btn-cancel-modal").onclick = () => ModalEngine.close();

      editForm.onsubmit = (ev) => {
        ev.preventDefault();
        const updatedNama = document.getElementById("edit-bm-nama").value;
        const updatedUrl = document.getElementById("edit-bm-url").value;
        const updatedKategori = document.getElementById("edit-bm-kategori").value;
        const updatedCatatan = document.getElementById("edit-bm-catatan").value.trim();

        const validationErrors = validateBookmarkForm({
          nama: updatedNama,
          url: updatedUrl,
          kategori: updatedKategori
        });

        if (validationErrors.length > 0) {
          ModalEngine.showFieldErrorsAlert("Validasi Ubah Bookmark", validationErrors);
          return;
        }

        target.nama = updatedNama.trim();
        target.url = updatedUrl.trim();
        target.kategori = updatedKategori;
        target.catatan = updatedCatatan;

        saveBookmarkData();
        renderBookmarkUI();
        ModalEngine.close();
      };
    }
  });

  inputSearch.addEventListener("input", renderBookmarkUI);
  sortOption.addEventListener("change", renderBookmarkUI);

  renderBookmarkUI();
}

/* ==========================================================================
   3. FITUR 3.3: KUIS INTERAKTIF (QUIZ APP) -> halaman /quiz/
   ========================================================================== */
function initQuizApp() {
  const quizData = [
    {
      pertanyaan: "Elemen HTML5 semantik mana yang paling tepat untuk membungkus navigasi utama web?",
      opsi: ["<section>", "<header>", "<nav>", "<aside>"],
      jawaban: 2
    },
    {
      pertanyaan: "Method JavaScript yang digunakan untuk mengonversi string JSON menjadi objek adalah:",
      opsi: ["JSON.stringify()", "JSON.parse()", "JSON.toObject()", "JSON.convert()"],
      jawaban: 1
    },
    {
      pertanyaan: "Di manakah lokasi penyimpanan persistent data `localStorage` berada?",
      opsi: ["Temporary Session RAM", "Remote Database Server", "HTTP Cookies", "Client-side Web Browser"],
      jawaban: 3
    },
    {
      pertanyaan: "Bagaimana cara mendeteksi event klik pada tombol via Vanilla JS tanpa inline HTML?",
      opsi: ["button.addEventListener('click', fn)", "button.onclick()", "button.setEvent('click')", "button.attachClick()"],
      jawaban: 0
    },
    {
      pertanyaan: "Metode array JS mana yang menghasilkan array baru berdasarkan transformasi setiap elemen?",
      opsi: ["forEach()", "filter()", "map()", "reduce()"],
      jawaban: 2
    }
  ];

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

  let currentIndex = 0;
  let score = 0;
  let timerInterval = null;
  let timeLeft = 15;
  let selectedOptionIndex = null;

  let highScore = parseInt(localStorage.getItem("kopdesfite_quiz_highscore") || "0", 10);
  if (isNaN(highScore)) highScore = 0;
  elHighScoreVal.textContent = highScore;

  function startQuiz() {
    currentIndex = 0;
    score = 0;
    screenStart.classList.add("hidden");
    screenResult.classList.add("hidden");
    screenRunning.classList.remove("hidden");
    loadQuestion();
  }

  function loadQuestion() {
    clearInterval(timerInterval);
    timeLeft = 15;
    selectedOptionIndex = null;

    btnNext.classList.add("hidden");
    elFeedback.classList.add("hidden");
    updateTimerUI();

    const q = quizData[currentIndex];
    elProgress.textContent = `Soal ${currentIndex + 1} dari ${quizData.length}`;
    elQuestion.textContent = q.pertanyaan;

    elOptions.innerHTML = "";
    q.opsi.forEach((opsiText, i) => {
      const btn = document.createElement("button");
      btn.className = "w-full text-left p-3.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-indigo-950/50 hover:border-indigo-500/50 text-xs font-medium text-slate-200 transition-all flex items-center gap-3 option-btn";

      const badge = document.createElement("span");
      badge.className = "w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-700 flex-shrink-0";
      badge.textContent = String.fromCharCode(65 + i);

      const label = document.createElement("span");
      label.className = "flex-grow";
      label.textContent = opsiText;

      btn.appendChild(badge);
      btn.appendChild(label);
      btn.onclick = () => selectOption(i);
      elOptions.appendChild(btn);
    });

    timerInterval = setInterval(() => {
      timeLeft--;
      updateTimerUI();
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        showFeedback(null, true);
      }
    }, 1000);
  }

  function updateTimerUI() {
    elTimer.textContent = `Waktu: ${timeLeft}s`;
  }

  function selectOption(index) {
    if (selectedOptionIndex !== null) return;
    clearInterval(timerInterval);
    selectedOptionIndex = index;
    showFeedback(index, false);
  }

  function showFeedback(selectedIndex, isTimeout) {
    const q = quizData[currentIndex];
    const optionBtns = elOptions.querySelectorAll(".option-btn");
    const pointsPerQuestion = Math.round(100 / quizData.length);

    optionBtns.forEach(btn => btn.disabled = true);

    if (isTimeout) {
      elFeedback.className = "p-3 rounded-xl text-xs font-medium text-center bg-rose-950/80 border border-rose-800 text-rose-300 block";
      elFeedback.innerHTML = `<i class="fa-solid fa-clock" aria-hidden="true"></i> Waktu Habis! Jawaban benar: <strong>${escapeHTML(q.opsi[q.jawaban])}</strong>`;
      optionBtns[q.jawaban].classList.add("bg-emerald-950/80", "border-emerald-500");
    } else if (selectedIndex === q.jawaban) {
      score += (100 / quizData.length);
      elFeedback.className = "p-3 rounded-xl text-xs font-medium text-center bg-emerald-950/80 border border-emerald-800 text-emerald-300 block";
      elFeedback.innerHTML = `<i class="fa-solid fa-circle-check" aria-hidden="true"></i> Jawaban Tepat! (+${pointsPerQuestion} poin)`;
      optionBtns[selectedIndex].classList.add("bg-emerald-950/80", "border-emerald-500");
    } else {
      elFeedback.className = "p-3 rounded-xl text-xs font-medium text-center bg-rose-950/80 border border-rose-800 text-rose-300 block";
      elFeedback.innerHTML = `<i class="fa-solid fa-circle-xmark" aria-hidden="true"></i> Jawaban Salah! Jawaban benar: <strong>${escapeHTML(q.opsi[q.jawaban])}</strong>`;
      optionBtns[selectedIndex].classList.add("bg-rose-950/80", "border-rose-500");
      optionBtns[q.jawaban].classList.add("bg-emerald-950/80", "border-emerald-500");
    }

    btnNext.classList.remove("hidden");
  }

  btnNext.onclick = () => {
    currentIndex++;
    if (currentIndex < quizData.length) {
      loadQuestion();
    } else {
      finishQuiz();
    }
  };

  function finishQuiz() {
    screenRunning.classList.add("hidden");
    screenResult.classList.remove("hidden");

    const finalScore = Math.round(score);
    elFinalScore.textContent = `${finalScore} / 100`;

    if (finalScore > highScore) {
      highScore = finalScore;
      localStorage.setItem("kopdesfite_quiz_highscore", highScore.toString());
      elHighScoreVal.textContent = highScore;
      elNewRecord.classList.remove("hidden");
    } else {
      elNewRecord.classList.add("hidden");
    }
  }

  btnStart.onclick = startQuiz;
  btnRestart.onclick = startQuiz;
}