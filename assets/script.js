/**
 * KopdesFITE - Integrated Application Suite Logic
 * Practical Web Development Assignment - PABWE P3
 */

document.addEventListener("DOMContentLoaded", () => {
  ModalEngine.init();
  initTabSystem();
  initExpenseTracker();
  initBookmarkManager();
  initQuizApp();
});

/* ==========================================================================
   0. HELPER & UTILITY ENGINE
   ========================================================================== */

/* Universal Custom Modal Engine */
const ModalEngine = {
  backdrop: null,
  title: null,
  body: null,
  closeBtn: null,

  init() {
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
  },

  open(modalTitle, contentHtml) {
    if (!this.title || !this.body || !this.backdrop) {
      this.init();
    }
    if (this.title) this.title.textContent = modalTitle;
    if (this.body) this.body.innerHTML = contentHtml;
    if (this.backdrop) this.backdrop.classList.remove("hidden");
  },

  close() {
    if (this.backdrop) this.backdrop.classList.add("hidden");
    if (this.body) this.body.innerHTML = "";
  },

  showValidationAlert(title, message) {
    this.open(title, `
      <p class="text-xs text-slate-300 leading-relaxed">${message}</p>
      <div class="flex justify-end pt-2">
        <button id="btn-modal-alert-ok" class="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-all">Mengerti</button>
      </div>
    `);
    const btnAlertOk = document.getElementById("btn-modal-alert-ok");
    if (btnAlertOk) {
      btnAlertOk.onclick = () => this.close();
    }
  },

  showFieldErrorsAlert(title, errors) {
    const errorItemsHTML = errors.map(err => `
      <li class="flex items-start gap-2 text-rose-300">
        <i class="fa-solid fa-circle-exclamation mt-0.5 text-rose-400 text-xs flex-shrink-0"></i>
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

/* Escaping String XSS Helper (Aman untuk String, Angka, Tanggal, dll) */
function escapeHTML(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

/* Helper HTML Card Generation untuk Menghindari Duplikasi Template (100% Escaped) */
function createExpenseCardHTML(item, isIncome, formattedAmount) {
  return `
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-lg flex items-center justify-center ${isIncome ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50' : 'bg-rose-950/80 text-rose-400 border border-rose-800/50'}">
        <i class="fa-solid ${isIncome ? 'fa-arrow-down' : 'fa-arrow-up'} text-xs"></i>
      </div>
      <div>
        <h4 class="text-xs font-semibold text-slate-200">${escapeHTML(item.judul)}</h4>
        <div class="flex items-center gap-2 mt-0.5">
          <span class="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">${escapeHTML(item.kategori)}</span>
          <span class="text-[10px] text-slate-500">${escapeHTML(item.tanggal)}</span>
        </div>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-xs font-bold ${isIncome ? 'text-emerald-400' : 'text-rose-400'}">
        ${isIncome ? '+' : '-'} ${escapeHTML(formattedAmount)}
      </span>
      <div class="flex items-center gap-1">
        <button data-id="${escapeHTML(item.id)}" class="btn-edit-expense p-1 text-slate-400 hover:text-indigo-400 text-xs transition-colors" title="Ubah Transaksi">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button data-id="${escapeHTML(item.id)}" class="btn-delete-expense p-1 text-slate-400 hover:text-rose-400 text-xs transition-colors" title="Hapus Transaksi">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    </div>
  `;
}

/* DOM Element Card Builder menggunakan createElement & textContent (Mencegah XSS & Konsisten) */
function createExpenseCardElement(item, isIncome, formattedAmount) {
  const card = document.createElement("div");
  card.className = "flex items-center justify-between p-3.5 bg-slate-900/70 rounded-xl border border-slate-700/60 hover:border-slate-600 transition-all";

  // Left Section
  const leftCol = document.createElement("div");
  leftCol.className = "flex items-center gap-3";

  const iconBox = document.createElement("div");
  iconBox.className = `w-9 h-9 rounded-lg flex items-center justify-center ${
    isIncome ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50' : 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
  }`;
  const icon = document.createElement("i");
  icon.className = `fa-solid ${isIncome ? 'fa-arrow-down' : 'fa-arrow-up'} text-xs`;
  iconBox.appendChild(icon);

  const textInfo = document.createElement("div");
  const title = document.createElement("h4");
  title.className = "text-xs font-semibold text-slate-200";
  title.textContent = item.judul;

  const metaRow = document.createElement("div");
  metaRow.className = "flex items-center gap-2 mt-0.5";

  const catBadge = document.createElement("span");
  catBadge.className = "text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700";
  catBadge.textContent = item.kategori;

  const dateSpan = document.createElement("span");
  dateSpan.className = "text-[10px] text-slate-500";
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
  editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn-delete-expense p-1 text-slate-400 hover:text-rose-400 text-xs transition-colors";
  deleteBtn.setAttribute("data-id", item.id);
  deleteBtn.setAttribute("title", "Hapus Transaksi");
  deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';

  actionGroup.appendChild(editBtn);
  actionGroup.appendChild(deleteBtn);
  rightCol.appendChild(amountSpan);
  rightCol.appendChild(actionGroup);

  card.appendChild(leftCol);
  card.appendChild(rightCol);
  return card;
}

/* Helper HTML Card Generation untuk Bookmark (100% Escaped) */
function createBookmarkCardHTML(item) {
  return `
    <div>
      <div class="flex justify-between items-start gap-2">
        <span class="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50">
          ${escapeHTML(item.kategori)}
        </span>
        <div class="flex items-center gap-1">
          <button data-id="${escapeHTML(item.id)}" class="btn-edit-bookmark text-slate-400 hover:text-indigo-400 text-xs p-1 transition-colors" title="Ubah Bookmark">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button data-id="${escapeHTML(item.id)}" class="btn-delete-bookmark text-slate-400 hover:text-rose-400 text-xs p-1 transition-colors" title="Hapus Bookmark">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
      <h4 class="font-bold text-slate-200 mt-2 text-xs line-clamp-1">${escapeHTML(item.nama)}</h4>
      <p class="text-[11px] text-slate-400 line-clamp-1 mt-0.5">${escapeHTML(item.url)}</p>
      ${item.catatan ? `<p class="text-[10px] text-slate-500 italic mt-1 line-clamp-2">${escapeHTML(item.catatan)}</p>` : ''}
    </div>
    <a href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 text-xs font-medium text-indigo-400 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/40 py-1.5 rounded-lg transition-colors w-full">
      <span>Kunjungi Tautan</span>
      <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
    </a>
  `;
}

/* DOM Element Bookmark Builder menggunakan createElement & textContent (Mencegah XSS & Konsisten) */
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
  editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn-delete-bookmark text-slate-400 hover:text-rose-400 text-xs p-1 transition-colors";
  deleteBtn.setAttribute("data-id", item.id);
  deleteBtn.setAttribute("title", "Hapus Bookmark");
  deleteBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';

  actionGroup.appendChild(editBtn);
  actionGroup.appendChild(deleteBtn);
  headerRow.appendChild(badge);
  headerRow.appendChild(actionGroup);

  const title = document.createElement("h4");
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
    note.className = "text-[10px] text-slate-500 italic mt-1 line-clamp-2";
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
  visitLink.appendChild(linkText);
  visitLink.appendChild(linkIcon);

  card.appendChild(topSection);
  card.appendChild(visitLink);
  return card;
}

/* Helper Format Tanggal Lokal YYYY-MM-DD (Aman Lintas Browser & iOS Safari) */
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

/* Helper Builder Template Modal Form & Konfirmasi (DRY Architecture) */
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
    <form id="${escapeHTML(formId)}" class="space-y-3">
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
      <label class="block text-xs font-medium text-slate-300 mb-1">Judul / Deskripsi</label>
      <input type="text" id="edit-expense-judul" value="${escapeHTML(target.judul)}" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
    </div>
    <div>
      <label class="block text-xs font-medium text-slate-300 mb-1">Kategori</label>
      <select id="edit-expense-kategori" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
        ${categories.map(cat => 
          `<option value="${escapeHTML(cat)}" ${target.kategori === cat ? 'selected' : ''}>${escapeHTML(cat)}</option>`
        ).join('')}
      </select>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <div>
        <label class="block text-xs font-medium text-slate-300 mb-1">Jumlah (Rp)</label>
        <input type="number" id="edit-expense-jumlah" min="1" value="${escapeHTML(target.jumlah)}" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-300 mb-1">Tipe</label>
        <select id="edit-expense-tipe" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
          <option value="Pengeluaran" ${target.tipe === 'Pengeluaran' ? 'selected' : ''}>Pengeluaran</option>
          <option value="Pemasukan" ${target.tipe === 'Pemasukan' ? 'selected' : ''}>Pemasukan</option>
        </select>
      </div>
    </div>
    <div>
      <label class="block text-xs font-medium text-slate-300 mb-1">Tanggal</label>
      <input type="date" id="edit-expense-tanggal" value="${escapeHTML(target.tanggal)}" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
    </div>
  `;
  return createEditModalFormHTML("form-edit-expense", fieldsHTML);
}

function createBookmarkEditModalHTML(target) {
  const categories = ["Pemrograman", "Kuliah & Riset", "Desain & Media", "Produktivitas", "Lainnya"];
  const fieldsHTML = `
    <div>
      <label class="block text-xs font-medium text-slate-300 mb-1">Nama Situs</label>
      <input type="text" id="edit-bm-nama" value="${escapeHTML(target.nama)}" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
    </div>
    <div>
      <label class="block text-xs font-medium text-slate-300 mb-1">URL (http:// atau https://)</label>
      <input type="url" id="edit-bm-url" value="${escapeHTML(target.url)}" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
    </div>
    <div>
      <label class="block text-xs font-medium text-slate-300 mb-1">Kategori</label>
      <select id="edit-bm-kategori" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
        ${categories.map(cat => 
          `<option value="${escapeHTML(cat)}" ${target.kategori === cat ? 'selected' : ''}>${escapeHTML(cat)}</option>`
        ).join('')}
      </select>
    </div>
    <div>
      <label class="block text-xs font-medium text-slate-300 mb-1">Catatan Singkat</label>
      <textarea id="edit-bm-catatan" rows="2" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 resize-none focus:outline-none focus:border-indigo-500">${escapeHTML(target.catatan || '')}</textarea>
    </div>
  `;
  return createEditModalFormHTML("form-edit-bookmark", fieldsHTML);
}

/* Helper Validasi Per-Field dengan Pesan Spesifik & Feedback Informatif */
function validateExpenseForm({ judul, kategori, jumlah, tipe, tanggal }) {
  const errors = [];
  const validCategories = ["Makanan & Minuman", "Gaji & Project", "Transportasi", "Hiburan", "Tagihan & Edukasi", "Lain-Lain"];
  const validTypes = ["Pengeluaran", "Pemasukan"];

  const trimmedJudul = (judul || "").trim();
  if (!trimmedJudul) {
    errors.push({
      fieldId: "judul",
      label: "Judul / Deskripsi",
      message: "Judul transaksi wajib diisi dan tidak boleh hanya berisi spasi."
    });
  } else if (trimmedJudul.length < 3) {
    errors.push({
      fieldId: "judul",
      label: "Judul / Deskripsi",
      message: "Judul transaksi minimal 3 karakter agar informatif."
    });
  }

  if (!kategori || !validCategories.includes(kategori)) {
    errors.push({
      fieldId: "kategori",
      label: "Kategori",
      message: "Silakan pilih salah satu kategori yang tersedia."
    });
  }

  const numJumlah = Number(jumlah);
  if (jumlah === "" || jumlah === null || jumlah === undefined || isNaN(numJumlah)) {
    errors.push({
      fieldId: "jumlah",
      label: "Jumlah (Rp)",
      message: "Nominal transaksi harus diisi dengan angka."
    });
  } else if (numJumlah <= 0) {
    errors.push({
      fieldId: "jumlah",
      label: "Jumlah (Rp)",
      message: "Nominal transaksi harus berupa angka lebih besar dari 0 (Rp)."
    });
  }

  if (!tipe || !validTypes.includes(tipe)) {
    errors.push({
      fieldId: "tipe",
      label: "Tipe Transaksi",
      message: "Tipe transaksi harus dipilih antara 'Pengeluaran' atau 'Pemasukan'."
    });
  }

  const trimmedTanggal = (tanggal || "").trim();
  if (!trimmedTanggal) {
    errors.push({
      fieldId: "tanggal",
      label: "Tanggal",
      message: "Tanggal transaksi wajib dipilih."
    });
  } else if (isNaN(new Date(trimmedTanggal).getTime())) {
    errors.push({
      fieldId: "tanggal",
      label: "Tanggal",
      message: "Format tanggal tidak valid (gunakan format YYYY-MM-DD)."
    });
  }

  return errors;
}

function validateBookmarkForm({ nama, url, kategori }) {
  const errors = [];
  const validCategories = ["Pemrograman", "Kuliah & Riset", "Desain & Media", "Produktivitas", "Lainnya"];

  const trimmedNama = (nama || "").trim();
  if (!trimmedNama) {
    errors.push({
      fieldId: "nama",
      label: "Nama Situs",
      message: "Nama situs bookmark wajib diisi dan tidak boleh kosong."
    });
  } else if (trimmedNama.length < 2) {
    errors.push({
      fieldId: "nama",
      label: "Nama Situs",
      message: "Nama situs minimal 2 karakter."
    });
  }

  const trimmedUrl = (url || "").trim();
  if (!trimmedUrl) {
    errors.push({
      fieldId: "url",
      label: "URL Tautan",
      message: "Alamat URL website wajib diisi."
    });
  } else if (!/^https?:\/\/.+/i.test(trimmedUrl)) {
    errors.push({
      fieldId: "url",
      label: "URL Tautan",
      message: "URL harus diawali dengan protokol valid ('http://' atau 'https://'), contoh: https://del.ac.id"
    });
  } else {
    try {
      new URL(trimmedUrl);
    } catch (_) {
      errors.push({
        fieldId: "url",
        label: "URL Tautan",
        message: "Format struktur alamat URL tidak valid."
      });
    }
  }

  if (!kategori || !validCategories.includes(kategori)) {
    errors.push({
      fieldId: "kategori",
      label: "Kategori",
      message: "Silakan pilih salah satu kategori bookmark yang tersedia."
    });
  }

  return errors;
}

/* Helper Highlight Border Input ketika Validasi Gagal */
function applyFieldValidationHighlights(formEl, errors) {
  if (!formEl) return;
  const inputs = formEl.querySelectorAll("input, select, textarea");
  inputs.forEach(input => {
    input.classList.remove("border-rose-500", "ring-1", "ring-rose-500/50");
    input.classList.add("border-slate-700");
  });

  errors.forEach(err => {
    const input = formEl.querySelector(`#${err.fieldId}`) || 
                  formEl.querySelector(`[id$="-${err.fieldId}"]`);
    if (input) {
      input.classList.add("border-rose-500", "ring-1", "ring-rose-500/50");
      input.classList.remove("border-slate-700");
    }
  });
}

function attachInputClearHighlight(formEl) {
  if (!formEl) return;
  const inputs = formEl.querySelectorAll("input, select, textarea");
  inputs.forEach(input => {
    input.addEventListener("input", () => {
      input.classList.remove("border-rose-500", "ring-1", "ring-rose-500/50");
      input.classList.add("border-slate-700");
    });
    input.addEventListener("change", () => {
      input.classList.remove("border-rose-500", "ring-1", "ring-rose-500/50");
      input.classList.add("border-slate-700");
    });
  });
}

/* ==========================================================================
   1. NAVIGASI TAB (URL QUERY PARAMETER & HISTORY API)
   ========================================================================== */
function initTabSystem() {
  const tabs = [
    { key: "expense", btn: document.getElementById("tab-btn-expense"), content: document.getElementById("tab-content-expense") },
    { key: "bookmark", btn: document.getElementById("tab-btn-bookmark"), content: document.getElementById("tab-content-bookmark") },
    { key: "quiz", btn: document.getElementById("tab-btn-quiz"), content: document.getElementById("tab-content-quiz") }
  ];

  const validKeys = tabs.map(t => t.key);

  function activateTab(tabKey, updateUrl = true) {
    const activeKey = validKeys.includes(tabKey) ? tabKey : "expense";

    tabs.forEach(tab => {
      if (tab.key === activeKey) {
        tab.btn.classList.add("bg-indigo-600", "text-white", "shadow-md");
        tab.btn.classList.remove("text-slate-400");
        tab.content.classList.remove("hidden");
      } else {
        tab.btn.classList.remove("bg-indigo-600", "text-white", "shadow-md");
        tab.btn.classList.add("text-slate-400");
        tab.content.classList.add("hidden");
      }
    });

    if (updateUrl) {
      const url = new URL(window.location);
      url.searchParams.set("tab", activeKey);
      window.history.replaceState({}, "", url);
    }
  }

  tabs.forEach(tab => {
    tab.btn.addEventListener("click", () => activateTab(tab.key, true));
  });

  const urlParams = new URLSearchParams(window.location.search);
  activateTab(urlParams.get("tab"), true);

  window.addEventListener("popstate", () => {
    const currentParams = new URLSearchParams(window.location.search);
    activateTab(currentParams.get("tab"), false);
  });
}

/* ==========================================================================
   2. FITUR 3.1: CATATAN PENGELUARAN HARIAN (EXPENSE TRACKER)
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
  attachInputClearHighlight(form);

  let transactions = JSON.parse(localStorage.getItem("kopdesfite_expense")) || [];

  function saveExpenseData() {
    localStorage.setItem("kopdesfite_expense", JSON.stringify(transactions));
  }

  function formatIDR(amount) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
  }

  function renderExpenseUI() {
    // 1. Ringkasan Saldo
    let totalIn = 0;
    let totalOut = 0;
    transactions.forEach(t => {
      if (t.tipe === "Pemasukan") totalIn += Number(t.jumlah);
      else totalOut += Number(t.jumlah);
    });

    elPemasukan.textContent = formatIDR(totalIn);
    elPengeluaran.textContent = formatIDR(totalOut);
    elSaldo.textContent = formatIDR(totalIn - totalOut);

    // 2. Filter & Sort
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

    // 3. Render List DOM dengan createElement & textContent (Bebas Risiko XSS)
    containerList.innerHTML = "";

    if (processed.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "text-center py-10 text-slate-500 text-xs border border-dashed border-slate-700 rounded-xl";
      emptyDiv.innerHTML = '<i class="fa-solid fa-receipt text-2xl mb-2 block"></i> Belum ada catatan transaksi yang sesuai.';
      containerList.appendChild(emptyDiv);
      return;
    }

    processed.forEach(item => {
      const isIncome = item.tipe === "Pemasukan";
      const card = createExpenseCardElement(item, isIncome, formatIDR(item.jumlah));
      containerList.appendChild(card);
    });
  }

  // Event Handlers
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const judul = inputJudul.value;
    const kategori = inputKategori.value;
    const jumlah = inputJumlah.value;
    const tipe = inputTipe.value;
    const tanggal = inputTanggal.value;

    const validationErrors = validateExpenseForm({ judul, kategori, jumlah, tipe, tanggal });
    if (validationErrors.length > 0) {
      applyFieldValidationHighlights(form, validationErrors);
      ModalEngine.showFieldErrorsAlert("Peringatan Validasi Transaksi", validationErrors);
      return;
    }

    transactions.push({
      id: Date.now().toString(),
      judul: judul.trim(),
      kategori,
      jumlah: parseFloat(jumlah),
      tipe,
      tanggal
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
      attachInputClearHighlight(editForm);
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
          applyFieldValidationHighlights(editForm, validationErrors);
          ModalEngine.showFieldErrorsAlert("Peringatan Validasi Ubah Transaksi", validationErrors);
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
   3. FITUR 3.2: BOOKMARK / LINK MANAGER
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

  attachInputClearHighlight(form);

  let bookmarks = JSON.parse(localStorage.getItem("kopdesfite_bookmark")) || [];

  function saveBookmarkData() {
    localStorage.setItem("kopdesfite_bookmark", JSON.stringify(bookmarks));
  }

  function renderBookmarkUI() {
    let processed = [...bookmarks];

    const query = inputSearch.value.trim().toLowerCase();
    if (query) {
      processed = processed.filter(b => 
        b.nama.toLowerCase().includes(query) || 
        b.url.toLowerCase().includes(query) ||
        b.kategori.toLowerCase().includes(query)
      );
    }

    const sortVal = sortOption.value;
    processed.sort((a, b) => {
      if (sortVal === "az") return a.nama.localeCompare(b.nama);
      if (sortVal === "za") return b.nama.localeCompare(a.nama);
      return b.timestamp - a.timestamp;
    });

    // Render List DOM dengan createElement & textContent (Bebas Risiko XSS)
    containerList.innerHTML = "";

    if (processed.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "col-span-full text-center py-10 text-slate-500 text-xs border border-dashed border-slate-700 rounded-xl";
      emptyDiv.innerHTML = '<i class="fa-solid fa-bookmark text-2xl mb-2 block"></i> Tidak ada tautan tersimpan.';
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
    const nama = inputNama.value;
    const url = inputUrl.value;
    const kategori = inputKategori.value;
    const catatan = inputCatatan.value.trim();

    const validationErrors = validateBookmarkForm({ nama, url, kategori });
    if (validationErrors.length > 0) {
      applyFieldValidationHighlights(form, validationErrors);
      ModalEngine.showFieldErrorsAlert("Peringatan Validasi Bookmark", validationErrors);
      return;
    }

    bookmarks.unshift({
      id: Date.now().toString(),
      nama: nama.trim(),
      url: url.trim(),
      kategori,
      catatan,
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
      attachInputClearHighlight(editForm);
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
          applyFieldValidationHighlights(editForm, validationErrors);
          ModalEngine.showFieldErrorsAlert("Peringatan Validasi Ubah Bookmark", validationErrors);
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
   4. FITUR 3.3: KUIS INTERAKTIF (QUIZ APP)
   ========================================================================== */
function initQuizApp() {
  const quizData = [
    {
      pertanyaan: "Elemen HTML5 semantik mana yang paling tepat untuk membungkus navigasi utama web?",
      opsi: ["<section>", "<nav>", "<header>", "<aside>"],
      jawaban: 1
    },
    {
      pertanyaan: "Method JavaScript yang digunakan untuk mengonversi string JSON menjadi objek JavaScript adalah:",
      opsi: ["JSON.stringify()", "JSON.parse()", "JSON.toObject()", "JSON.convert()"],
      jawaban: 1
    },
    {
      pertanyaan: "Di manakah lokasi penyimpanan persistent data `localStorage` berada?",
      opsi: ["Temporary Session RAM", "Client-side Web Browser", "Remote Database Server", "HTTP Cookies"],
      jawaban: 1
    },
    {
      pertanyaan: "Bagaimana cara mendeteksi event klik pada sebuah tombol via Vanilla JS tanpa inline HTML?",
      opsi: ["button.onclick()", "button.addEventListener('click', fn)", "button.setEvent('click')", "button.attachClick()"],
      jawaban: 1
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
      elFeedback.className = "p-3 rounded-xl text-xs font-medium transition-all text-center bg-rose-950/80 border border-rose-800 text-rose-300 block";
      elFeedback.innerHTML = `<i class="fa-solid fa-clock"></i> Waktu Habis! Jawaban benar: <strong>${escapeHTML(q.opsi[q.jawaban])}</strong>`;
      optionBtns[q.jawaban].classList.add("bg-emerald-950/80", "border-emerald-500");
    } else if (selectedIndex === q.jawaban) {
      score += (100 / quizData.length);
      elFeedback.className = "p-3 rounded-xl text-xs font-medium transition-all text-center bg-emerald-950/80 border border-emerald-800 text-emerald-300 block";
      elFeedback.innerHTML = `<i class="fa-solid fa-circle-check"></i> Jawaban Tepat! (+${pointsPerQuestion} poin)`;
      optionBtns[selectedIndex].classList.add("bg-emerald-950/80", "border-emerald-500");
    } else {
      elFeedback.className = "p-3 rounded-xl text-xs font-medium transition-all text-center bg-rose-950/80 border border-rose-800 text-rose-300 block";
      elFeedback.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Jawaban Salah! Jawaban benar: <strong>${escapeHTML(q.opsi[q.jawaban])}</strong>`;
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