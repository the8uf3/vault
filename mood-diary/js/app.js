// Me Sati ? - Main Application

const state = {
  currentPage: 'calendar',
  entries: [],
  calendarMonth: new Date().getMonth(),
  calendarYear: new Date().getFullYear(),
  editingDate: null,
  modalMode: 'view',
  form: {
    items: [],
    freeDiary: '',
    selectedMood: null,
    isPeriod: false
  },
  insightRange: 'weekly'
};

document.addEventListener('DOMContentLoaded', async () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  document.getElementById('entry-modal').addEventListener('click', (e) => {
    if (e.target.id === 'entry-modal') closeEntryModal();
  });

  await loadEntries();
  navigate('calendar');

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.update().catch(() => {});
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner();
          }
        });
      });
    }).catch(console.warn);
  }
});

async function loadEntries() {
  try {
    state.entries = await getAllEntries();
  } catch (e) {
    console.error(e);
    state.entries = [];
  }
}

function navigate(page) {
  if (state.currentPage === 'insights' && page !== 'insights') {
    if (typeof destroyCharts === 'function') destroyCharts();
  }
  state.currentPage = page;
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });
  render();
}

function render() {
  const main = document.getElementById('main-content');
  switch (state.currentPage) {
    case 'calendar': renderCalendar(main); break;
    case 'insights': renderInsights(main); break;
  }
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ========== Calendar ==========
function renderCalendar(container) {
  const year = state.calendarYear;
  const month = state.calendarMonth;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  const entryMap = {};
  state.entries.forEach(e => { entryMap[e.date] = e; });

  let daysHtml = '';
  for (let i = 0; i < firstDay; i++) daysHtml += `<div class="cal-day empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const entry = entryMap[dateStr];
    const isToday = dateStr === todayStr();
    let moodClass = '';
    let summary = '';
    let periodMark = '';
    if (entry) {
      const m = entry.finalMood || 3;
      moodClass = `mood-${m} has-entry`;
      const neg = (entry.items || []).filter(i => i.type === 'negative').length;
      const pos = (entry.items || []).filter(i => i.type === 'positive').length;
      if (neg || pos) {
        summary = `<span class="cal-summary">${neg ? `😤${neg}` : ''}${neg && pos ? ' ' : ''}${pos ? `🌟${pos}` : ''}</span>`;
      }
      if (entry.isPeriod) {
        periodMark = `<span class="period-mark" title="ประจำเดือน">🩸</span>`;
      }
    }
    daysHtml += `
      <div class="cal-day ${moodClass} ${isToday ? 'today' : ''}" data-date="${dateStr}">
        ${periodMark}
        <span class="cal-num">${d}</span>
        ${summary}
      </div>
    `;
  }

  const monthEntries = state.entries.filter(e => e.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`));
  const good = monthEntries.filter(e => (e.finalMood || 3) >= 4).length;
  const bad = monthEntries.filter(e => (e.finalMood || 3) <= 2).length;
  const periodCount = monthEntries.filter(e => e.isPeriod).length;

  container.innerHTML = `
    <div class="card">
      <div class="calendar-header">
        <button class="btn-icon" id="prev-month">◀</button>
        <strong>${monthNames[month]} ${year + 543}</strong>
        <button class="btn-icon" id="next-month">▶</button>
      </div>
      <div class="calendar-grid">
        ${['อา','จ','อ','พ','พฤ','ศ','ส'].map(d => `<div class="cal-day-name">${d}</div>`).join('')}
        ${daysHtml}
      </div>
      <div class="cal-footer">
        <div class="text-sm text-muted">
          วันดี ${good} • วันไม่ดี ${bad} • บันทึก ${monthEntries.length} วัน
          ${periodCount ? ` • 🩸 ${periodCount}` : ''}
        </div>
        <button class="btn-export-sm" id="export-btn" title="Export ข้อมูล">📤</button>
      </div>
      <p class="text-sm text-muted text-center mt-2">แตะวันที่เพื่อดูหรือบันทึก</p>
    </div>
  `;

  document.getElementById('prev-month').addEventListener('click', () => {
    state.calendarMonth--;
    if (state.calendarMonth < 0) { state.calendarMonth = 11; state.calendarYear--; }
    render();
  });
  document.getElementById('next-month').addEventListener('click', () => {
    state.calendarMonth++;
    if (state.calendarMonth > 11) { state.calendarMonth = 0; state.calendarYear++; }
    render();
  });
  document.getElementById('export-btn').addEventListener('click', doExport);
  document.querySelectorAll('.cal-day[data-date]').forEach(el => {
    el.addEventListener('click', () => openEntryModal(el.dataset.date));
  });
}

async function doExport() {
  try {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `me-sati-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export เรียบร้อย');
  } catch (e) {
    console.error(e);
    showToast('Export ไม่สำเร็จ');
  }
}

// ========== Entry Modal (View / Edit) ==========
async function openEntryModal(date, forceEdit = false) {
  state.editingDate = date;
  const existing = await getEntry(date);

  if (existing && ((existing.items && existing.items.length) || existing.freeDiary || existing.isPeriod)) {
    state.form = {
      items: (existing.items || []).map(i => ({
        ...i,
        id: i.id || genId(),
        intensity: i.intensity || 2,
        feelingTags: i.feelingTags || i.tags || [],
        contextTags: i.contextTags || []
      })),
      freeDiary: existing.freeDiary || '',
      selectedMood: existing.mood || null,
      isPeriod: !!existing.isPeriod
    };
    state.modalMode = forceEdit ? 'edit' : 'view';
  } else {
    state.form = { items: [], freeDiary: '', selectedMood: null, isPeriod: false };
    state.modalMode = 'edit';
  }

  renderEntryModal();
  document.getElementById('entry-modal').classList.add('show');
}

function closeEntryModal() {
  document.getElementById('entry-modal').classList.remove('show');
  state.editingDate = null;
  state.modalMode = 'view';
}

function renderEntryModal() {
  if (state.modalMode === 'view') {
    renderViewMode();
  } else {
    renderEditMode();
  }
}

function renderViewMode() {
  const date = state.editingDate;
  const entry = state.entries.find(e => e.date === date) || {
    items: state.form.items,
    freeDiary: state.form.freeDiary,
    finalMood: state.form.selectedMood || 3,
    mood: state.form.selectedMood,
    isPeriod: state.form.isPeriod
  };
  const m = entry.finalMood || 3;
  const moodInfo = MOOD_LEVELS[m];
  const negItems = (entry.items || []).filter(i => i.type === 'negative');
  const posItems = (entry.items || []).filter(i => i.type === 'positive');

  const modal = document.getElementById('entry-modal-content');
  modal.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${formatDateThai(date)}</div>
      <button class="btn-icon" id="close-modal">✕</button>
    </div>

    <div class="view-mood-banner mood-${m}">
      <span class="view-mood-emoji">${moodInfo.emoji}</span>
      <div>
        <div class="view-mood-label">Mood ${m} — ${moodInfo.label}</div>
        <div class="text-sm opacity-80">${moodInfo.desc}</div>
      </div>
    </div>

    ${entry.isPeriod ? `<div class="period-badge">🩸 ประจำเดือน</div>` : ''}

    ${negItems.length ? `
      <div class="view-section">
        <div class="view-section-title">😤 เรื่องที่รู้สึกแย่ (${negItems.length})</div>
        ${negItems.map(item => renderViewItem(item)).join('')}
      </div>
    ` : ''}

    ${posItems.length ? `
      <div class="view-section">
        <div class="view-section-title">🌟 เรื่องที่ทำได้ดี (${posItems.length})</div>
        ${posItems.map(item => renderViewItem(item)).join('')}
      </div>
    ` : ''}

    ${entry.freeDiary ? `
      <div class="view-section">
        <div class="view-section-title">✍️ ไดอารี่</div>
        <div class="view-diary">${escapeHtml(entry.freeDiary)}</div>
      </div>
    ` : ''}

    ${!negItems.length && !posItems.length && !entry.freeDiary && !entry.isPeriod ? `
      <div class="empty-state" style="padding:24px 0">
        <p class="text-muted">ยังไม่มีรายละเอียด</p>
      </div>
    ` : ''}

    <div class="flex gap-2 mt-3">
      <button type="button" class="btn btn-primary" id="edit-entry" style="flex:1">✏️ แก้ไข</button>
      <button type="button" class="btn btn-secondary" id="delete-entry" style="color:var(--danger)">ลบ</button>
    </div>
  `;

  document.getElementById('close-modal').addEventListener('click', closeEntryModal);
  document.getElementById('edit-entry').addEventListener('click', () => {
    state.modalMode = 'edit';
    renderEntryModal();
  });
  document.getElementById('delete-entry').addEventListener('click', async () => {
    if (confirm('ลบบันทึกวันนี้?')) {
      await deleteEntry(date);
      await loadEntries();
      closeEntryModal();
      render();
      showToast('ลบแล้ว');
    }
  });
}

function renderViewItem(item) {
  const intensity = item.intensity || 2;
  const feelings = item.feelingTags || [];
  const contexts = item.contextTags || [];
  return `
    <div class="view-item ${item.type}">
      <div class="view-item-text">${escapeHtml(item.text)}</div>
      <div class="view-item-meta">
        <span class="intensity-badge ${item.type}">${INTENSITY_LABELS[intensity].label}</span>
        ${feelings.map(t => `<span class="view-tag">${escapeHtml(t)}</span>`).join('')}
        ${contexts.map(t => `<span class="view-tag ctx">${escapeHtml(t)}</span>`).join('')}
      </div>
      ${item.learning ? `<div class="view-learning">💡 ${escapeHtml(item.learning)}</div>` : ''}
    </div>
  `;
}

function renderEditMode() {
  const date = state.editingDate;
  const auto = analyzeMood({ items: state.form.items, freeDiary: state.form.freeDiary });
  const displayMood = state.form.selectedMood || auto.mood;
  const moodInfo = MOOD_LEVELS[displayMood];

  const negItems = state.form.items.filter(i => i.type === 'negative');
  const posItems = state.form.items.filter(i => i.type === 'positive');

  const modal = document.getElementById('entry-modal-content');
  modal.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${formatDateThai(date)}</div>
      <button class="btn-icon" id="close-modal">✕</button>
    </div>

    <div class="form-group">
      <label>Mood โดยรวม <span class="text-muted">(ไม่บังคับ)</span></label>
      <div class="mood-grid">
        ${[1,2,3,4,5].map(m => `
          <button type="button" class="mood-btn ${state.form.selectedMood === m ? 'selected' : ''}" data-mood="${m}">
            <span class="emoji">${MOOD_LEVELS[m].emoji}</span>
            <span>${m}</span>
          </button>
        `).join('')}
      </div>
      <div class="mood-desc">
        ${state.form.selectedMood
          ? `<strong>${moodInfo.label}</strong> — ${moodInfo.desc}`
          : `วิเคราะห์อัตโนมัติ ≈ <strong>${auto.mood} ${MOOD_LEVELS[auto.mood].label}</strong>`
        }
      </div>
      ${!state.form.selectedMood ? `
        <div class="auto-mood-box">
          <div class="text-sm">${auto.details.map(d => `• ${d}`).join('<br>')}</div>
        </div>
      ` : `
        <button type="button" class="btn btn-secondary btn-sm mt-2" id="clear-mood">ใช้วิเคราะห์อัตโนมัติ</button>
      `}
    </div>

    <div class="form-group">
      <label class="period-check-label">
        <input type="checkbox" id="is-period" ${state.form.isPeriod ? 'checked' : ''}>
        <span>🩸 เป็นประจำเดือนวันนี้</span>
      </label>
    </div>

    <div class="form-group">
      <label>😤 เรื่องที่รู้สึกแย่ / อารมณ์ไม่ดี</label>
      <div id="neg-list">
        ${negItems.map(item => renderItemCard(item)).join('') || '<p class="text-sm text-muted">ยังไม่มีรายการ</p>'}
      </div>
      <button type="button" class="btn btn-secondary btn-sm mt-2" id="add-neg">+ เพิ่มเรื่องที่รู้สึกแย่</button>
    </div>

    <div class="form-group">
      <label>🌟 เรื่องที่ทำได้ดี / รู้สึกดี</label>
      <div id="pos-list">
        ${posItems.map(item => renderItemCard(item)).join('') || '<p class="text-sm text-muted">ยังไม่มีรายการ</p>'}
      </div>
      <button type="button" class="btn btn-secondary btn-sm mt-2" id="add-pos">+ เพิ่มเรื่องที่ทำได้ดี</button>
    </div>

    <div class="form-group">
      <label>✍️ ไดอารี่อิสระ</label>
      <textarea id="free-diary" placeholder="เขียนอะไรเพิ่มเติมก็ได้...">${escapeHtml(state.form.freeDiary)}</textarea>
    </div>

    <div class="flex gap-2">
      <button type="button" class="btn btn-primary" id="save-entry" style="flex:1">💾 บันทึก</button>
      <button type="button" class="btn btn-secondary" id="cancel-edit">ยกเลิก</button>
    </div>
  `;

  document.getElementById('close-modal').addEventListener('click', closeEntryModal);
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = parseInt(btn.dataset.mood);
      state.form.selectedMood = state.form.selectedMood === m ? null : m;
      renderEntryModal();
    });
  });
  document.getElementById('clear-mood')?.addEventListener('click', () => {
    state.form.selectedMood = null;
    renderEntryModal();
  });
  document.getElementById('is-period').addEventListener('change', (e) => {
    state.form.isPeriod = e.target.checked;
  });
  document.getElementById('add-neg').addEventListener('click', () => {
    state.form.items.push({ id: genId(), type: 'negative', text: '', intensity: 2, feelingTags: [], contextTags: [], learning: '' });
    renderEntryModal();
  });
  document.getElementById('add-pos').addEventListener('click', () => {
    state.form.items.push({ id: genId(), type: 'positive', text: '', intensity: 2, feelingTags: [], contextTags: [], learning: '' });
    renderEntryModal();
  });
  document.getElementById('free-diary').addEventListener('input', (e) => {
    state.form.freeDiary = e.target.value;
  });
  document.getElementById('save-entry').addEventListener('click', saveEntryFromModal);
  document.getElementById('cancel-edit').addEventListener('click', async () => {
    const existing = await getEntry(date);
    if (existing && ((existing.items || []).length || existing.freeDiary || existing.isPeriod)) {
      state.modalMode = 'view';
      state.form = {
        items: (existing.items || []).map(i => ({
          ...i,
          id: i.id || genId(),
          intensity: i.intensity || 2,
          feelingTags: i.feelingTags || [],
          contextTags: i.contextTags || []
        })),
        freeDiary: existing.freeDiary || '',
        selectedMood: existing.mood || null,
        isPeriod: !!existing.isPeriod
      };
      renderEntryModal();
    } else {
      closeEntryModal();
    }
  });
  bindItemEvents();
}

function renderItemCard(item) {
  const feelings = FEELING_PRESETS[item.type] || [];
  const intensity = item.intensity || 2;
  return `
    <div class="item-card" data-id="${item.id}">
      <div class="item-row">
        <input type="text" class="item-text" value="${escapeHtml(item.text)}" placeholder="${item.type === 'negative' ? 'รู้สึกแย่เรื่องอะไร...' : 'ทำได้ดีเรื่องอะไร...'}">
        <button type="button" class="btn-icon danger remove-item">✕</button>
      </div>

      <div class="intensity-row mt-2">
        <span class="text-sm text-muted">ระดับ:</span>
        ${[1,2,3].map(lv => `
          <button type="button" class="intensity-btn ${intensity === lv ? 'selected' : ''} ${item.type}" data-lv="${lv}">
            ${INTENSITY_LABELS[lv].label}
          </button>
        `).join('')}
      </div>

      <div class="mt-2">
        <div class="text-sm text-muted mb-1">อารมณ์ / ความรู้สึก</div>
        <div class="chip-group item-feelings">
          ${feelings.map(t => `
            <button type="button" class="chip ${item.type} ${(item.feelingTags || []).includes(t) ? 'selected' : ''}" data-feeling="${t}">${t}</button>
          `).join('')}
        </div>
        <input type="text" class="item-custom-feeling mt-1" placeholder="แท็กอารมณ์อื่น (Enter)" style="font-size:0.85rem">
        ${(item.feelingTags || []).filter(t => !feelings.includes(t)).map(t => `
          <button type="button" class="chip selected ${item.type}" style="margin-top:4px" data-custom-feeling="${t}">${t} ✕</button>
        `).join('')}
      </div>

      <div class="mt-2">
        <div class="text-sm text-muted mb-1">เกี่ยวกับอะไร</div>
        <div class="chip-group item-contexts">
          ${CONTEXT_PRESETS.map(t => `
            <button type="button" class="chip ${(item.contextTags || []).includes(t) ? 'selected' : ''}" data-context="${t}">${t}</button>
          `).join('')}
        </div>
        <input type="text" class="item-custom-context mt-1" placeholder="บริบทอื่น (Enter)" style="font-size:0.85rem">
        ${(item.contextTags || []).filter(t => !CONTEXT_PRESETS.includes(t)).map(t => `
          <button type="button" class="chip selected" style="margin-top:4px" data-custom-context="${t}">${t} ✕</button>
        `).join('')}
      </div>

      <div class="mt-2">
        <input type="text" class="item-learning" value="${escapeHtml(item.learning || '')}" placeholder="อยากแก้ / เรียนรู้จากอันนี้...">
      </div>
    </div>
  `;
}

/** Mobile-friendly tap (handles touch + click without double-fire) */
function onTap(el, handler) {
  if (!el) return;
  let lastTouch = 0;
  el.addEventListener('touchend', (e) => {
    // ignore multi-touch / scroll gestures
    if (e.changedTouches && e.changedTouches.length > 1) return;
    lastTouch = Date.now();
    e.preventDefault();
    handler(e);
  }, { passive: false });
  el.addEventListener('click', (e) => {
    if (Date.now() - lastTouch < 400) return; // already handled by touchend
    handler(e);
  });
}

function bindItemEvents() {
  document.querySelectorAll('.item-card').forEach(card => {
    const id = card.dataset.id;
    const item = state.form.items.find(i => i.id === id);
    if (!item) return;

    card.querySelector('.item-text').addEventListener('input', (e) => { item.text = e.target.value; });

    onTap(card.querySelector('.remove-item'), () => {
      state.form.items = state.form.items.filter(i => i.id !== id);
      renderEntryModal();
    });

    card.querySelectorAll('.intensity-btn').forEach(btn => {
      onTap(btn, () => {
        item.intensity = parseInt(btn.dataset.lv);
        renderEntryModal();
      });
    });

    card.querySelectorAll('.chip[data-feeling]').forEach(chip => {
      onTap(chip, () => {
        const tag = chip.dataset.feeling;
        item.feelingTags = item.feelingTags || [];
        const idx = item.feelingTags.indexOf(tag);
        if (idx >= 0) item.feelingTags.splice(idx, 1);
        else item.feelingTags.push(tag);
        chip.classList.toggle('selected');
      });
    });

    card.querySelectorAll('.chip[data-custom-feeling]').forEach(chip => {
      onTap(chip, () => {
        item.feelingTags = (item.feelingTags || []).filter(t => t !== chip.dataset.customFeeling);
        renderEntryModal();
      });
    });

    const customFeeling = card.querySelector('.item-custom-feeling');
    customFeeling.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = customFeeling.value.trim();
        if (val) {
          item.feelingTags = item.feelingTags || [];
          if (!item.feelingTags.includes(val)) item.feelingTags.push(val);
          customFeeling.value = '';
          renderEntryModal();
        }
      }
    });

    card.querySelectorAll('.chip[data-context]').forEach(chip => {
      onTap(chip, () => {
        const tag = chip.dataset.context;
        item.contextTags = item.contextTags || [];
        const idx = item.contextTags.indexOf(tag);
        if (idx >= 0) item.contextTags.splice(idx, 1);
        else item.contextTags.push(tag);
        chip.classList.toggle('selected');
      });
    });

    card.querySelectorAll('.chip[data-custom-context]').forEach(chip => {
      onTap(chip, () => {
        item.contextTags = (item.contextTags || []).filter(t => t !== chip.dataset.customContext);
        renderEntryModal();
      });
    });

    const customContext = card.querySelector('.item-custom-context');
    customContext.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = customContext.value.trim();
        if (val) {
          item.contextTags = item.contextTags || [];
          if (!item.contextTags.includes(val)) item.contextTags.push(val);
          customContext.value = '';
          renderEntryModal();
        }
      }
    });

    card.querySelector('.item-learning').addEventListener('input', (e) => {
      item.learning = e.target.value;
    });
  });
}

async function saveEntryFromModal() {
  const date = state.editingDate;
  const items = state.form.items
    .filter(i => i.text.trim())
    .map(i => ({
      id: i.id,
      type: i.type,
      text: i.text.trim(),
      intensity: i.intensity || 2,
      feelingTags: i.feelingTags || [],
      contextTags: i.contextTags || [],
      learning: (i.learning || '').trim()
    }));

  const auto = analyzeMood({ items, freeDiary: state.form.freeDiary });

  const entry = {
    date,
    mood: state.form.selectedMood,
    finalMood: state.form.selectedMood || auto.mood,
    autoAnalysis: state.form.selectedMood ? null : auto,
    items,
    freeDiary: state.form.freeDiary.trim(),
    isPeriod: !!state.form.isPeriod,
    badMoodCount: items.filter(i => i.type === 'negative').length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    await saveEntry(entry);
    await loadEntries();
    state.modalMode = 'view';
    renderEntryModal();
    render();
    showToast('บันทึกเรียบร้อย 🌿');
  } catch (e) {
    console.error(e);
    showToast('เกิดข้อผิดพลาด');
  }
}

// ========== Insights Dashboard ==========
let moodChart = null;
let moodDistChart = null;
let feelNegChart = null;
let feelPosChart = null;

const FEEL_NEG_COLORS = ['#ef4444','#f97316','#eab308','#dc2626','#fb923c','#fbbf24','#b91c1c','#ea580c'];
const FEEL_POS_COLORS = ['#10b981','#22c55e','#14b8a6','#34d399','#4ade80','#2dd4bf','#059669','#16a34a'];

function getFullBounds(offset = 0) {
  return getPeriodBounds(state.insightRange, offset);
}

function getDisplayBounds(offset = 0) {
  const bounds = getPeriodBounds(state.insightRange, offset);
  // current period: clip end to today (no future days)
  if (offset === 0) {
    const today = todayStr();
    if (bounds.end > today) bounds.end = today;
  }
  return bounds;
}

function getFilteredEntries(offset = 0) {
  return filterEntriesByBounds(state.entries, getDisplayBounds(offset));
}

function destroyCharts() {
  if (moodChart) { moodChart.destroy(); moodChart = null; }
  if (moodDistChart) { moodDistChart.destroy(); moodDistChart = null; }
  if (feelNegChart) { feelNegChart.destroy(); feelNegChart = null; }
  if (feelPosChart) { feelPosChart.destroy(); feelPosChart = null; }
}

function topCtxText(topCtx) {
  // topCtx is [name, count] or null — overall across all feelings of that side
  if (!topCtx) return '';
  return ` · ปัจจัยมากสุดคือ <strong>${escapeHtml(topCtx[0])}</strong>`;
}

function showFeelPopup(feeling) {
  document.getElementById('feel-popup')?.remove();

  const ctxHtml = feeling.contexts && feeling.contexts.length
    ? feeling.contexts.map(([c, n]) =>
        `<div class="feel-popup-ctx"><span>${escapeHtml(c)}</span><strong>${n}</strong></div>`
      ).join('')
    : '<p class="text-sm text-muted">ไม่มีบริบทที่บันทึก</p>';

  const overlay = document.createElement('div');
  overlay.id = 'feel-popup';
  overlay.className = 'feel-popup-overlay';
  overlay.innerHTML = `
    <div class="feel-popup-card">
      <div class="feel-popup-header">
        <strong>${escapeHtml(feeling.name)}</strong>
        <span class="text-muted">${feeling.count} ครั้ง</span>
        <button class="btn-icon" id="feel-popup-close">✕</button>
      </div>
      <div class="feel-popup-body">
        <div class="text-sm text-muted mb-1">บริบทที่เกี่ยวข้อง</div>
        ${ctxHtml}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.id === 'feel-popup-close') overlay.remove();
  });
}

function showFactorPopup(factor, contextTotal) {
  document.getElementById('feel-popup')?.remove();
  const pct = contextTotal ? Math.round((factor.total / contextTotal) * 100) : 0;
  const negShare = factor.total ? Math.round((factor.neg / factor.total) * 100) : 0;
  const posShare = factor.total ? Math.round((factor.pos / factor.total) * 100) : 0;

  const overlay = document.createElement('div');
  overlay.id = 'feel-popup';
  overlay.className = 'feel-popup-overlay';
  overlay.innerHTML = `
    <div class="feel-popup-card">
      <div class="feel-popup-header">
        <strong>${escapeHtml(factor.name)}</strong>
        <span class="text-muted">${factor.total} ครั้ง · ${pct}%</span>
        <button class="btn-icon" id="feel-popup-close">✕</button>
      </div>
      <div class="feel-popup-body">
        <div class="factor-popup-bar">
          ${factor.neg ? `<div class="factor-seg neg" style="width:${negShare}%"></div>` : ''}
          ${factor.pos ? `<div class="factor-seg pos" style="width:${posShare}%"></div>` : ''}
        </div>
        <div class="feel-popup-ctx factor-popup-neg">
          <span>😤 เชิงลบ</span>
          <strong>${factor.neg} ครั้ง</strong>
        </div>
        <div class="feel-popup-ctx factor-popup-pos">
          <span>🌟 เชิงบวก</span>
          <strong>${factor.pos} ครั้ง</strong>
        </div>
        ${factor.neg > factor.pos ? `
          <p class="text-sm factor-popup-note warn">ปัจจัยนี้โผล่กับอารมณ์เชิงลบบ่อยกว่า</p>
        ` : factor.pos > factor.neg ? `
          <p class="text-sm factor-popup-note good">ปัจจัยนี้โผล่กับอารมณ์เชิงบวกบ่อยกว่า</p>
        ` : `
          <p class="text-sm factor-popup-note">สัดส่วนบวก–ลบใกล้เคียงกัน</p>
        `}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.id === 'feel-popup-close') overlay.remove();
  });
}

function renderInsights(container) {
  destroyCharts();
  const entries = getFilteredEntries(0);
  const prevEntries = getFilteredEntries(-1);
  const fullBounds = getFullBounds(0);
  const displayBounds = getDisplayBounds(0);
  const rangeLabel = formatRangeLabel(fullBounds.start, fullBounds.end);
  const dataRangeLabel = formatRangeLabel(displayBounds.start, displayBounds.end);
  const stats = getStats(entries);
  const insight = getInsightData(entries);
  const avgDesc = stats.totalDays ? describeAvgMood(stats.avgMood) : null;
  const cmp = comparePeriods(entries, prevEntries);
  const rangeInfo = RANGE_LABELS[state.insightRange] || RANGE_LABELS.weekly;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  const topNeg = insight.topFeelingsNeg[0];
  const topPos = insight.topFeelingsPos[0];

  const cmpClass = cmp.direction === 'up' ? 'cmp-up' : cmp.direction === 'down' ? 'cmp-down' : 'cmp-same';
  const cmpDeltaText = cmp.hasCompare
    ? (cmp.delta > 0 ? `+${cmp.delta}` : `${cmp.delta}`)
    : '';

  container.innerHTML = `
    <div class="dash-range-row">
      <div class="dash-range" id="range-btns">
        <button type="button" class="range-btn ${state.insightRange==='weekly'?'active':''}" data-range="weekly">Weekly</button>
        <button type="button" class="range-btn ${state.insightRange==='monthly'?'active':''}" data-range="monthly">Monthly</button>
        <button type="button" class="range-btn ${state.insightRange==='yearly'?'active':''}" data-range="yearly">Yearly</button>
      </div>
      <button type="button" class="info-btn" id="analysis-info-btn" title="เกณฑ์การวิเคราะห์">ℹ️</button>
    </div>

    ${stats.totalDays === 0 ? `
      <div class="card empty-state">
        <div class="emoji">📊</div>
        <p>ยังไม่มีข้อมูลพอสำหรับวิเคราะห์</p>
        <p class="text-sm text-muted">บันทึกสัก 2-3 วัน แล้วกลับมาดูนะ</p>
      </div>
    ` : `
      <div class="insight-hero ${avgDesc.tone}">
        <div class="insight-hero-emoji">${avgDesc.emoji}</div>
        <div class="insight-hero-text">
          <div class="insight-hero-title">${avgDesc.text}</div>
          <div class="insight-hero-sub">
            ${rangeInfo.unit} · ${rangeLabel}
          </div>
          <div class="insight-hero-sub">
            บันทึก ${stats.totalDays} วัน · วันดี ${stats.goodDays} · วันไม่ดี ${stats.badDays}
            ${insight.periodDays ? ` · 🩸 ${insight.periodDays}` : ''}
          </div>
        </div>
      </div>

      <div class="compare-chip ${cmpClass}">
        <span class="compare-symbol">${cmp.symbol}</span>
        <div class="compare-body">
          <div class="compare-label">${cmp.label}</div>
          ${cmp.hasCompare ? `
            <div class="compare-detail">
              ${rangeInfo.unit} ${cmp.curAvg} · ${rangeInfo.prev} ${cmp.prevAvg}
              <span class="compare-delta">${cmpDeltaText}</span>
            </div>
          ` : `
            <div class="compare-detail text-muted">ยังเทียบช่วงก่อนหน้าไม่ได้</div>
          `}
        </div>
      </div>

      ${(() => {
        const tech = getTechnicalInsights(entries);
        const items = [
          tech.trend,
          tech.volatility,
          tech.changePoint,
          ...tech.correlations
        ];
        return `
          <div class="card">
            <div class="card-title">🔍 มองลึกขึ้น</div>
            <div class="tech-list">
              ${items.map(it => `
                <div class="tech-item tech-${it.tone || 'info'}">
                  <span class="tech-icon">${it.icon || '•'}</span>
                  <span>${it.text}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      })()}

      ${insight.contextFactors && insight.contextFactors.length ? `
        <div class="chart-card">
          <div class="card-title">🏷️ ปัจจัยที่เกี่ยวข้อง</div>
          <p class="text-sm text-muted mb-2">รวมจากอารมณ์บวกและลบ · แตะแท่งเพื่อดูรายละเอียด</p>
          <div class="factor-bars" id="factor-bars">
            ${insight.contextFactors.slice(0, 8).map((f, idx) => {
              const pct = insight.contextTotal ? Math.round((f.total / insight.contextTotal) * 100) : 0;
              const negPct = f.total ? (f.neg / f.total) * 100 : 0;
              const posPct = f.total ? (f.pos / f.total) * 100 : 0;
              const maxT = insight.contextFactors[0].total || 1;
              const barW = Math.max(8, Math.round((f.total / maxT) * 100));
              return `
                <button type="button" class="factor-row" data-factor-idx="${idx}">
                  <div class="factor-name">${escapeHtml(f.name)}</div>
                  <div class="factor-track-wrap">
                    <div class="factor-track" style="width:${barW}%">
                      ${f.neg ? `<div class="factor-seg neg" style="width:${negPct}%"></div>` : ''}
                      ${f.pos ? `<div class="factor-seg pos" style="width:${posPct}%"></div>` : ''}
                    </div>
                  </div>
                  <div class="factor-meta">
                    <span class="factor-count">${f.total}</span>
                    <span class="factor-pct">${pct}%</span>
                  </div>
                </button>
              `;
            }).join('')}
          </div>
          <div class="factor-legend">
            <span><i class="factor-dot neg"></i>เชิงลบ</span>
            <span><i class="factor-dot pos"></i>เชิงบวก</span>
          </div>
        </div>
      ` : ''}

      ${insight.totalNegFeel > 0 ? `
        <div class="chart-card">
          <div class="card-title">😤 อารมณ์เชิงลบ</div>
          <p class="feel-overview">
            รวม <strong>${insight.totalNegFeel}</strong> ครั้ง
            ${topNeg ? ` · มากสุดคือ <strong>${escapeHtml(topNeg.name)}</strong>${topCtxText(insight.topCtxNeg)}` : ''}
          </p>
          <p class="text-sm text-muted mb-2">แตะชิ้นในกราฟเพื่อดูบริบท</p>
          <div class="chart-wrap doughnut"><canvas id="feel-neg-chart"></canvas></div>
        </div>
      ` : ''}

      ${insight.totalPosFeel > 0 ? `
        <div class="chart-card">
          <div class="card-title">🌟 อารมณ์เชิงบวก</div>
          <p class="feel-overview">
            รวม <strong>${insight.totalPosFeel}</strong> ครั้ง
            ${topPos ? ` · มากสุดคือ <strong>${escapeHtml(topPos.name)}</strong>${topCtxText(insight.topCtxPos)}` : ''}
          </p>
          <p class="text-sm text-muted mb-2">แตะชิ้นในกราฟเพื่อดูบริบท</p>
          <div class="chart-wrap doughnut"><canvas id="feel-pos-chart"></canvas></div>
        </div>
      ` : ''}

      ${!insight.totalNegFeel && !insight.totalPosFeel ? `
        <div class="card">
          <p class="text-sm text-muted text-center">ยังไม่มีแท็กอารมณ์ บันทึกเพิ่มแล้วเลือกแท็กจะเห็นสัดส่วนที่นี่</p>
        </div>
      ` : ''}

      ${insight.periodDays >= 2 ? `
        <div class="card">
          <div class="card-title">🩸 ประจำเดือนกับ Mood</div>
          <p class="text-sm">
            บันทึกประจำเดือน ${insight.periodDays} วัน
            ${insight.periodLowMood
              ? ` · วัน Mood ไม่ดีร่วมด้วย ${insight.periodLowMood} วัน`
              : ' · ยังไม่มีวันที่ Mood ต่ำร่วมด้วย'}
          </p>
        </div>
      ` : ''}

      <div class="chart-card">
        <div class="chart-title">สัดส่วน Mood</div>
        <div class="chart-wrap doughnut"><canvas id="mood-dist-chart"></canvas></div>
        <div class="viz-legend">
          <span class="legend-item"><span class="legend-dot" style="background:#ef4444"></span>ไม่ดี</span>
          <span class="legend-item"><span class="legend-dot" style="background:#eab308"></span>เฉย ๆ</span>
          <span class="legend-item"><span class="legend-dot" style="background:#10b981"></span>ดี</span>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-title">แนวโน้ม Mood</div>
        ${entries.length < 2
          ? '<div class="empty-chart">บันทึกอย่างน้อย 2 วันเพื่อดูแนวโน้ม</div>'
          : '<div class="chart-wrap line"><canvas id="mood-line-chart"></canvas></div>'}
      </div>
    `}
  `;

  document.querySelectorAll('#range-btns .range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.insightRange = btn.dataset.range;
      renderInsights(container);
    });
  });
  document.getElementById('analysis-info-btn')?.addEventListener('click', showAnalysisInfo);

  document.querySelectorAll('#factor-bars .factor-row').forEach(row => {
    row.addEventListener('click', () => {
      const idx = parseInt(row.dataset.factorIdx, 10);
      const f = insight.contextFactors[idx];
      if (f) showFactorPopup(f, insight.contextTotal);
    });
  });

  if (stats.totalDays > 0) {
    requestAnimationFrame(() => {
      buildMoodDistChart(entries, isDark);
      buildMoodLineChart(entries, isDark, gridColor, textColor);
      buildFeelingPie('feel-neg-chart', insight.topFeelingsNeg, FEEL_NEG_COLORS, 'neg');
      buildFeelingPie('feel-pos-chart', insight.topFeelingsPos, FEEL_POS_COLORS, 'pos');
    });
  }
}

function showAnalysisInfo() {
  document.getElementById('analysis-info-popup')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'analysis-info-popup';
  overlay.className = 'info-popup-overlay';
  overlay.innerHTML = `
    <div class="info-popup-card">
      <div class="info-popup-header">
        <strong>เกณฑ์การวิเคราะห์</strong>
        <button class="btn-icon" id="analysis-info-close">✕</button>
      </div>
      <div class="info-popup-body">
        <section class="info-section">
          <h4>📅 ช่วงเวลา</h4>
          <p><strong>Weekly</strong> = สัปดาห์ปฏิทินนี้ เริ่มวันอาทิตย์ถึงวันเสาร์ เทียบกับสัปดาห์ก่อน</p>
          <p><strong>Monthly</strong> = วันที่ 1 ถึงวันสุดท้ายของเดือนนี้ เทียบกับเดือนก่อน</p>
          <p><strong>Yearly</strong> = 1 ม.ค. – 31 ธ.ค. ของปีนี้ เทียบกับปีก่อน</p>
          <p>ช่วงปัจจุบันจะนับถึงแค่วันนี้ (ยังไม่รวมวันข้างหน้า)</p>
          <p>วันที่แสดงใต้หัวข้อสรุปคือช่วงปฏิทินจริงของแท็บนั้น</p>
        </section>

        <section class="info-section">
          <h4>😊 สรุป Mood</h4>
          <p>ใช้ค่าเฉลี่ย Mood ของวันที่บันทึกในช่วงที่เลือก</p>
          <ul>
            <li>≥ 4.2 → ดีมาก</li>
            <li>≥ 3.5 → ค่อนข้างดี</li>
            <li>≥ 2.8 → ปกติ</li>
            <li>≥ 2.0 → ค่อนข้างต่ำ</li>
            <li>&lt; 2.0 → ต่ำมาก</li>
          </ul>
          <p>วันดี = Mood ≥ 4 · วันไม่ดี = Mood ≤ 2</p>
        </section>

        <section class="info-section">
          <h4>↑↓ เทียบช่วงก่อนหน้า</h4>
          <p>เทียบค่าเฉลี่ย Mood ช่วงนี้กับช่วงก่อน</p>
          <ul>
            <li>ต่างกัน ≥ +0.3 → ดีขึ้น</li>
            <li>ต่างกัน ≤ −0.3 → แย่ลง</li>
            <li>อยู่ระหว่างนั้น → ใกล้เคียง</li>
          </ul>
        </section>

        <section class="info-section">
          <h4>📈 แนวโน้ม (Moving Average)</h4>
          <p>เปรียบเทียบค่าเฉลี่ยช่วงสั้นกับช่วงยาว และ EMA ล่าสุดกับช่วงต้นของข้อมูล</p>
          <ul>
            <li>ต่างกันชัด (≥ 0.35–0.4) ไปทางบวก → กำลังดีขึ้น</li>
            <li>ไปทางลบ → กำลังแย่ลง</li>
            <li>ไม่ต่างชัด → ทรงตัว</li>
          </ul>
        </section>

        <section class="info-section">
          <h4>⚡ ความผันผวน</h4>
          <p>ใช้ส่วนเบี่ยงเบนมาตรฐาน (SD) ของ Mood ในช่วง</p>
          <ul>
            <li>SD &lt; 0.5 → ค่อนข้างคงที่</li>
            <li>SD 0.5–1.0 → ขึ้นลงระดับปกติ</li>
            <li>SD &gt; 1.0 → ผันผวนค่อนข้างมาก</li>
          </ul>
          <p>ต้องมีอย่างน้อย 3 วันที่มีบันทึก</p>
        </section>

        <section class="info-section">
          <h4>🔀 จุดเปลี่ยน</h4>
          <p>หาจุดที่แบ่งข้อมูลเป็นสองช่วง แล้วค่าเฉลี่ย Mood ต่างกันมากที่สุด</p>
          <ul>
            <li>ต่างกัน ≥ 0.6 และมีข้อมูลอย่างน้อย 6 วัน → ถือว่ามีจุดเปลี่ยน</li>
            <li>บอกวันที่ประมาณนั้นว่าเริ่มดีขึ้นหรือแย่ลง</li>
          </ul>
        </section>

        <section class="info-section">
          <h4>🔗 ความสัมพันธ์</h4>
          <p><strong>ประจำเดือน:</strong> เทียบค่าเฉลี่ย Mood วันที่ติ๊กประจำเดือน กับวันที่ไม่ได้ติ๊ก ถ้าต่าง ≥ 0.4 จะระบุ</p>
          <p><strong>บริบท / อารมณ์:</strong> ดูเฉพาะวันที่ Mood ≤ 2 แล้วนับว่าแท็กบริบทหรืออารมณ์เชิงลบไหนโผล่ในจำนวนวันมากสุด (นับอย่างละครั้งต่อวัน)</p>
        </section>

        <section class="info-section">
          <h4>🥧 สัดส่วนอารมณ์</h4>
          <p>นับจากแท็กอารมณ์ที่เลือกตอนบันทึก แยกเชิงลบ / เชิงบวก</p>
          <p>「ปัจจัยมากสุด」นับจากบริบทของทุกรายการในฝั่งนั้น ไม่จำกัดแค่อารมณ์ที่มากสุด</p>
          <p>กดชิ้นในกราฟเพื่อดูบริบทของอารมณ์นั้น</p>
        </section>

        <section class="info-section">
          <h4>📊 สัดส่วน Mood / แนวโน้ม</h4>
          <p>สัดส่วน = วันไม่ดี (1–2) · เฉย ๆ (3) · ดี (4–5)</p>
          <p>กราฟแนวโน้ม = Mood รายวันในช่วงที่เลือก (Yearly ย่อเป็นค่าเฉลี่ยรายเดือน)</p>
        </section>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.id === 'analysis-info-close') overlay.remove();
  });
}

function buildFeelingPie(canvasId, feelings, colors, side) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined' || !feelings.length) return;

  const chart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: feelings.map(f => f.name),
      datasets: [{
        data: feelings.map(f => f.count),
        backgroundColor: colors.slice(0, feelings.length),
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      onClick: (evt, elements) => {
        if (!elements.length) return;
        const idx = elements[0].index;
        const feeling = feelings[idx];
        if (feeling) showFeelPopup(feeling);
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 10,
            padding: 10,
            font: { size: 11 },
            color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#94a3b8' : '#64748b'
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total ? Math.round((ctx.raw / total) * 100) : 0;
              return `${ctx.label}: ${ctx.raw} ครั้ง (${pct}%)`;
            }
          }
        }
      }
    }
  });

  if (side === 'neg') feelNegChart = chart;
  else feelPosChart = chart;
}

function buildMoodLineChart(entries, isDark, gridColor, textColor) {
  const canvas = document.getElementById('mood-line-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  const range = state.insightRange;
  const curBounds = getPeriodBounds(range, 0);
  const today = todayStr();
  if (curBounds.end > today) curBounds.end = today;

  const curMap = {};
  entries.forEach(e => { curMap[e.date] = e.finalMood || 3; });

  const curDates = [];
  {
    let d = new Date(curBounds.start + 'T00:00:00');
    const end = new Date(curBounds.end + 'T00:00:00');
    while (d <= end) {
      curDates.push(toDateStr(d));
      d.setDate(d.getDate() + 1);
    }
  }

  let labels = [];
  let data = [];

  if (range === 'yearly') {
    const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    labels = months;
    for (let m = 0; m < 12; m++) {
      const vals = [];
      curDates.forEach(ds => {
        if (parseInt(ds.slice(5, 7)) === m + 1 && curMap[ds] != null) vals.push(curMap[ds]);
      });
      data.push(vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null);
    }
  } else {
    curDates.forEach(ds => {
      labels.push(`${parseInt(ds.slice(8, 10))}/${parseInt(ds.slice(5, 7))}`);
      data.push(curMap[ds] != null ? curMap[ds] : null);
    });
  }

  moodChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Mood',
        data,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: range === 'yearly' ? 4 : 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#6366f1',
        spanGaps: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ctx.raw != null ? `Mood ${ctx.raw}` : 'ไม่มีข้อมูล'
          }
        }
      },
      scales: {
        y: {
          min: 1,
          max: 5,
          ticks: { stepSize: 1, color: textColor },
          grid: { color: gridColor }
        },
        x: {
          ticks: { color: textColor, maxRotation: 0, autoSkip: true, maxTicksLimit: range === 'yearly' ? 12 : 8 },
          grid: { display: false }
        }
      }
    }
  });
}

function buildMoodDistChart(entries, isDark) {
  const canvas = document.getElementById('mood-dist-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  let bad = 0, mid = 0, good = 0;
  entries.forEach(e => {
    const m = e.finalMood || 3;
    if (m <= 2) bad++;
    else if (m === 3) mid++;
    else good++;
  });

  moodDistChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['ไม่ดี', 'เฉย ๆ', 'ดี'],
      datasets: [{
        data: [bad, mid, good],
        backgroundColor: ['#ef4444', '#eab308', '#10b981'],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.raw} วัน`
          }
        }
      }
    }
  });
}

// ========== Theme / Utils ==========
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  document.getElementById('theme-toggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2500);
}

function showUpdateBanner() {
  if (document.getElementById('update-banner')) return;
  const bar = document.createElement('div');
  bar.id = 'update-banner';
  bar.className = 'update-banner';
  bar.innerHTML = `
    <span>มีเวอร์ชันใหม่</span>
    <button type="button" id="update-reload-btn">อัปเดตเลย</button>
  `;
  document.body.appendChild(bar);
  document.getElementById('update-reload-btn').addEventListener('click', () => {
    // tell waiting SW to activate if any, then reload
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
