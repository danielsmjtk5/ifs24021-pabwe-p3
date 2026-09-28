/**
 * KopdesFITE - Integrated Application Suite Logic
 * Practical Web Development Assignment - PABWE P3
 */

document.addEventListener("DOMContentLoaded", () => {
  initTabSystem();
  initExpenseTracker();
  initBookmarkManager();
  initQuizApp();
});

/* ==========================================================================
   0. MODAL UTILITY ENGINE (Universal Custom Modal)
   ========================================================================== */
const ModalEngine = {
  backdrop: document.getElementById("modal-backdrop"),
  title: document.getElementById("modal-title"),
  body: document.getElementById("modal-body"),
  closeBtn: document.getElementById("btn-modal-close"),

  open(modalTitle, contentHtml) {
    this.title.textContent = modalTitle;
    this.body.innerHTML = contentHtml;
    this.backdrop.classList.remove("hidden");
  },

  close() {
    this.backdrop.classList.add("hidden");
    this.body.innerHTML = "";
  }
};

document.getElementById("btn-modal-close").addEventListener("click", () => ModalEngine.close());

/* Helper Escaping String XSS */
function escapeHTML(str) {
  if (typeof str !== "string") return str;
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

/* ==========================================================================
   1. NAVIGASI TAB (DENGAN PERSISTENSI KOPDESFITE)
   ========================================================================== */
function initTabSystem() {
  const tabs = [
    { key: "expense", btn: document.getElementById("tab-btn-expense"), content: document.getElementById("tab-content-expense") },
    { key: "bookmark", btn: document.getElementById("tab-btn-bookmark"), content: document.getElementById("tab-content-bookmark") },
    { key: "quiz", btn: document.getElementById("tab-btn-quiz"), content: document.getElementById("tab-content-quiz") }
  ];

  function activateTab(tabKey) {
    tabs.forEach(tab => {
      if (tab.key === tabKey) {
        tab.btn.classList.add("bg-indigo-600", "text-white", "shadow-md");
        tab.btn.classList.remove("text-slate-400");
        tab.content.classList.remove("hidden");
      } else {
        tab.btn.classList.remove("bg-indigo-600", "text-white", "shadow-md");
        tab.btn.classList.add("text-slate-400");
        tab.content.classList.add("hidden");
      }
    });
    localStorage.setItem("kopdesfite_active_tab", tabKey);
  }

  tabs.forEach(tab => {
    tab.btn.addEventListener("click", () => activateTab(tab.key));
  });

  const savedTab = localStorage.getItem("kopdesfite_active_tab") || "expense";
  activateTab(savedTab);
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

  inputTanggal.valueAsDate = new Date();

  let transactions = JSON.parse(localStorage.getItem("kopdesfite_expense")) || [];

  function formatIDR(amount) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
  }

  function renderExpense() {
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

    if (processed.length === 0) {
      containerList.innerHTML = `
        <div class="text-center py-10 text-slate-500 text-xs border border-dashed border-slate-700 rounded-xl">
          <i class="fa-solid fa-receipt text-2xl mb-2 block"></i>
          Belum ada catatan transaksi yang sesuai.
        </div>`;
      return;
    }

    processed.forEach(item => {
      const isIncome = item.tipe === "Pemasukan";
      const card = document.createElement("div");
      card.className = "flex items-center justify-between p-3.5 bg-slate-900/70 rounded-xl border border-slate-700/60 hover:border-slate-600 transition-all";
      card.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg flex items-center justify-center ${isIncome ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50' : 'bg-rose-950/80 text-rose-400 border border-rose-800/50'}">
            <i class="fa-solid ${isIncome ? 'fa-arrow-down' : 'fa-arrow-up'} text-xs"></i>
          </div>
          <div>
            <h4 class="text-xs font-semibold text-slate-200">${escapeHTML(item.judul)}</h4>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">${escapeHTML(item.kategori)}</span>
              <span class="text-[10px] text-slate-500">${item.tanggal}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs font-bold ${isIncome ? 'text-emerald-400' : 'text-rose-400'}">
            ${isIncome ? '+' : '-'} ${formatIDR(item.jumlah)}
          </span>
          <div class="flex items-center gap-1">
            <button data-id="${item.id}" class="btn-edit-expense p-1 text-slate-400 hover:text-indigo-400 text-xs">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button data-id="${item.id}" class="btn-delete-expense p-1 text-slate-400 hover:text-rose-400 text-xs">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;
      containerList.appendChild(card);
    });

    localStorage.setItem("kopdesfite_expense", JSON.stringify(transactions));
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const judul = inputJudul.value.trim();
    const kategori = inputKategori.value;
    const jumlah = parseFloat(inputJumlah.value);
    const tipe = inputTipe.value;
    const tanggal = inputTanggal.value;

    if (!judul || isNaN(jumlah) || jumlah <= 0 || !tanggal) {
      alert("Harap isi seluruh field wajib dengan benar!");
      return;
    }

    const newTransaction = {
      id: Date.now().toString(),
      judul, kategori, jumlah, tipe, tanggal
    };

    transactions.push(newTransaction);
    renderExpense();
    form.reset();
    inputTanggal.valueAsDate = new Date();
  });

  containerList.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".btn-edit-expense");
    const deleteBtn = e.target.closest(".btn-delete-expense");

    if (deleteBtn) {
      const id = deleteBtn.getAttribute("data-id");
      const target = transactions.find(t => t.id === id);
      if (!target) return;

      ModalEngine.open("Hapus Transaksi", `
        <p class="text-xs text-slate-300">Apakah Anda yakin ingin menghapus catatan "<strong>${escapeHTML(target.judul)}</strong>"?</p>
        <div class="flex justify-end gap-2 pt-2">
          <button id="btn-cancel-modal" class="px-3.5 py-1.5 rounded-xl bg-slate-700 text-xs font-medium text-slate-200">Batal</button>
          <button id="btn-confirm-delete" class="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white">Hapus</button>
        </div>
      `);

      document.getElementById("btn-cancel-modal").onclick = () => ModalEngine.close();
      document.getElementById("btn-confirm-delete").onclick = () => {
        transactions = transactions.filter(t => t.id !== id);
        renderExpense();
        ModalEngine.close();
      };
    }

    if (editBtn) {
      const id = editBtn.getAttribute("data-id");
      const target = transactions.find(t => t.id === id);
      if (!target) return;

      ModalEngine.open("Ubah Transaksi", `
        <form id="form-edit-expense" class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Judul / Deskripsi</label>
            <input type="text" id="edit-expense-judul" value="${escapeHTML(target.judul)}" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100">
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Kategori</label>
            <select id="edit-expense-kategori" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100">
              ${["Makanan & Minuman", "Gaji & Project", "Transportasi", "Hiburan", "Tagihan & Edukasi", "Lain-Lain"].map(cat => 
                `<option value="${cat}" ${target.kategori === cat ? 'selected' : ''}>${cat}</option>`
              ).join('')}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Jumlah (Rp)</label>
              <input type="number" id="edit-expense-jumlah" min="1" value="${target.jumlah}" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100">
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Tipe</label>
              <select id="edit-expense-tipe" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100">
                <option value="Pengeluaran" ${target.tipe === 'Pengeluaran' ? 'selected' : ''}>Pengeluaran</option>
                <option value="Pemasukan" ${target.tipe === 'Pemasukan' ? 'selected' : ''}>Pemasukan</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Tanggal</label>
            <input type="date" id="edit-expense-tanggal" value="${target.tanggal}" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100">
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" id="btn-cancel-modal" class="px-3.5 py-1.5 rounded-xl bg-slate-700 text-xs font-medium text-slate-200">Batal</button>
            <button type="submit" class="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white">Simpan Perubahan</button>
          </div>
        </form>
      `);

      document.getElementById("btn-cancel-modal").onclick = () => ModalEngine.close();
      document.getElementById("form-edit-expense").onsubmit = (ev) => {
        ev.preventDefault();
        target.judul = document.getElementById("edit-expense-judul").value.trim();
        target.kategori = document.getElementById("edit-expense-kategori").value;
        target.jumlah = parseFloat(document.getElementById("edit-expense-jumlah").value);
        target.tipe = document.getElementById("edit-expense-tipe").value;
        target.tanggal = document.getElementById("edit-expense-tanggal").value;

        renderExpense();
        ModalEngine.close();
      };
    }
  });

  inputSearch.addEventListener("input", renderExpense);
  filterTipe.addEventListener("change", renderExpense);
  sortOption.addEventListener("change", renderExpense);

  renderExpense();
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

  let bookmarks = JSON.parse(localStorage.getItem("kopdesfite_bookmark")) || [];

  function validateURL(string) {
    return /^https?:\/\/.+/i.test(string);
  }

  function renderBookmark() {
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

    containerList.innerHTML = "";

    if (processed.length === 0) {
      containerList.innerHTML = `
        <div class="col-span-full text-center py-10 text-slate-500 text-xs border border-dashed border-slate-700 rounded-xl">
          <i class="fa-solid fa-bookmark text-2xl mb-2 block"></i>
          Tidak ada tautan tersimpan.
        </div>`;
      return;
    }

    processed.forEach(item => {
      const card = document.createElement("div");
      card.className = "p-4 bg-slate-900/70 rounded-xl border border-slate-700/60 hover:border-indigo-500/50 transition-all flex flex-col justify-between space-y-3";
      card.innerHTML = `
        <div>
          <div class="flex justify-between items-start gap-2">
            <span class="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50">
              ${escapeHTML(item.kategori)}
            </span>
            <div class="flex items-center gap-1">
              <button data-id="${item.id}" class="btn-edit-bookmark text-slate-400 hover:text-indigo-400 text-xs p-1">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button data-id="${item.id}" class="btn-delete-bookmark text-slate-400 hover:text-rose-400 text-xs p-1">
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
      containerList.appendChild(card);
    });

    localStorage.setItem("kopdesfite_bookmark", JSON.stringify(bookmarks));
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nama = inputNama.value.trim();
    let url = inputUrl.value.trim();
    const kategori = inputKategori.value;
    const catatan = inputCatatan.value.trim();

    if (!validateURL(url)) {
      alert("URL harus diawali dengan http:// atau https://");
      return;
    }

    const newBookmark = {
      id: Date.now().toString(),
      nama, url, kategori, catatan,
      timestamp: Date.now()
    };

    bookmarks.unshift(newBookmark);
    renderBookmark();
    form.reset();
  });

  containerList.addEventListener("click", (e) => {
    const deleteBtn = e.target.closest(".btn-delete-bookmark");
    const editBtn = e.target.closest(".btn-edit-bookmark");

    if (deleteBtn) {
      const id = deleteBtn.getAttribute("data-id");
      const target = bookmarks.find(b => b.id === id);
      if (!target) return;

      ModalEngine.open("Hapus Bookmark", `
        <p class="text-xs text-slate-300">Hapus tautan "<strong>${escapeHTML(target.nama)}</strong>"?</p>
        <div class="flex justify-end gap-2 pt-2">
          <button id="btn-cancel-modal" class="px-3.5 py-1.5 rounded-xl bg-slate-700 text-xs font-medium text-slate-200">Batal</button>
          <button id="btn-confirm-delete" class="px-3.5 py-1.5 rounded-xl bg-rose-600 text-xs font-medium text-white">Hapus</button>
        </div>
      `);

      document.getElementById("btn-cancel-modal").onclick = () => ModalEngine.close();
      document.getElementById("btn-confirm-delete").onclick = () => {
        bookmarks = bookmarks.filter(b => b.id !== id);
        renderBookmark();
        ModalEngine.close();
      };
    }

    if (editBtn) {
      const id = editBtn.getAttribute("data-id");
      const target = bookmarks.find(b => b.id === id);
      if (!target) return;

      ModalEngine.open("Ubah Bookmark", `
        <form id="form-edit-bookmark" class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Nama Situs</label>
            <input type="text" id="edit-bm-nama" value="${escapeHTML(target.nama)}" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100">
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">URL (http:// atau https://)</label>
            <input type="url" id="edit-bm-url" value="${escapeHTML(target.url)}" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100">
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Kategori</label>
            <select id="edit-bm-kategori" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100">
              ${["Pemrograman", "Kuliah & Riset", "Desain & Media", "Produktivitas", "Lainnya"].map(cat => 
                `<option value="${cat}" ${target.kategori === cat ? 'selected' : ''}>${cat}</option>`
              ).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Catatan Singkat</label>
            <textarea id="edit-bm-catatan" rows="2" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 resize-none">${escapeHTML(target.catatan || '')}</textarea>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" id="btn-cancel-modal" class="px-3.5 py-1.5 rounded-xl bg-slate-700 text-xs font-medium text-slate-200">Batal</button>
            <button type="submit" class="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-xs font-medium text-white">Simpan Perubahan</button>
          </div>
        </form>
      `);

      document.getElementById("btn-cancel-modal").onclick = () => ModalEngine.close();
      document.getElementById("form-edit-bookmark").onsubmit = (ev) => {
        ev.preventDefault();
        const updatedUrl = document.getElementById("edit-bm-url").value.trim();
        if (!validateURL(updatedUrl)) {
          alert("URL harus diawali http:// atau https://");
          return;
        }

        target.nama = document.getElementById("edit-bm-nama").value.trim();
        target.url = updatedUrl;
        target.kategori = document.getElementById("edit-bm-kategori").value;
        target.catatan = document.getElementById("edit-bm-catatan").value.trim();

        renderBookmark();
        ModalEngine.close();
      };
    }
  });

  inputSearch.addEventListener("input", renderBookmark);
  sortOption.addEventListener("change", renderBookmark);

  renderBookmark();
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
      btn.innerHTML = `
        <span class="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-700">${String.fromCharCode(65 + i)}</span>
        <span class="flex-grow">${escapeHTML(opsiText)}</span>
      `;
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

    optionBtns.forEach(btn => btn.disabled = true);

    if (isTimeout) {
      elFeedback.className = "p-3 rounded-xl text-xs font-medium transition-all text-center bg-rose-950/80 border border-rose-800 text-rose-300 block";
      elFeedback.innerHTML = `<i class="fa-solid fa-clock"></i> Waktu Habis! Jawaban benar: <strong>${escapeHTML(q.opsi[q.jawaban])}</strong>`;
      optionBtns[q.jawaban].classList.add("bg-emerald-950/80", "border-emerald-500");
    } else if (selectedIndex === q.jawaban) {
      score += (100 / quizData.length);
      elFeedback.className = "p-3 rounded-xl text-xs font-medium transition-all text-center bg-emerald-950/80 border border-emerald-800 text-emerald-300 block";
      elFeedback.innerHTML = `<i class="fa-solid fa-circle-check"></i> Jawaban Tepat! (+20 poin)`;
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