// ========== Supabase Config ==========
const SUPABASE_URL = 'https://mxlkvizugbqnifiabbyg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bV4cxGjSTHlKJ9G1rPBFZw_RF_vwpVG';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ========== State ==========
let currentUser = null;
let allEntries = [];
let analysisPeriod = 'all';
let weightChart = null;
let waistChart = null;

// ========== Theme ==========
function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('bodytrack-theme', isDark ? 'dark' : 'light');
  if (!document.getElementById('page-analysis').classList.contains('hidden')) {
    renderAnalysis();
  }
}

function initTheme() {
  const saved = localStorage.getItem('bodytrack-theme');
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
}

// ========== Auth (Anonymous) ==========
async function initAuth() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      currentUser = session.user;
    } else {
      const { data, error } = await sb.auth.signInAnonymously();
      if (error) {
        console.error('Auth error:', error);
        alert('ไม่สามารถเข้าสู่ระบบได้: ' + error.message + '\n\nกรุณาเช็คว่าเปิด Anonymous Sign-ins แล้วหรือยัง');
        return;
      }
      currentUser = data.user;
    }
    await loadEntries();
  } catch (err) {
    console.error(err);
    alert('เกิดข้อผิดพลาด: ' + err.message);
  } finally {
    document.getElementById('loadingOverlay').classList.add('hidden');
  }
}

// ========== Data ==========
async function loadEntries() {
  if (!currentUser) return;
  const { data, error } = await sb
    .from('weight_entries')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('date', { ascending: true });

  if (error) {
    console.error(error);
    allEntries = [];
  } else {
    allEntries = data || [];
  }
  updateLatestSummary();
}

async function saveEntry(entry) {
  const { data, error } = await sb
    .from('weight_entries')
    .insert([{
      user_id: currentUser.id,
      date: entry.date,
      weight: entry.weight,
      waist: entry.waist,
      note: entry.note || null
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateEntry(id, entry) {
  const { error } = await sb
    .from('weight_entries')
    .update({
      date: entry.date,
      weight: entry.weight,
      waist: entry.waist,
      note: entry.note || null
    })
    .eq('id', id)
    .eq('user_id', currentUser.id);

  if (error) throw error;
}

async function deleteEntry(id) {
  if (!confirm('ต้องการลบข้อมูลนี้ใช่ไหม?')) return;
  const { error } = await sb
    .from('weight_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', currentUser.id);

  if (error) {
    alert('ลบไม่สำเร็จ: ' + error.message);
    return;
  }
  await loadEntries();
  renderHistory();
}

// ========== Navigation ==========
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(`page-${page}`).classList.remove('hidden');

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.remove('active');
    btn.classList.add('text-slate-600', 'dark:text-slate-300');
  });
  const activeBtn = document.getElementById(`nav-${page}`);
  activeBtn.classList.add('active');
  activeBtn.classList.remove('text-slate-600', 'dark:text-slate-300');

  if (page === 'history') renderHistory();
  if (page === 'analysis') renderAnalysis();
  if (page === 'input') updateLatestSummary();
}

// ========== Form ==========
document.getElementById('entryForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'กำลังบันทึก...';

  try {
    const date = document.getElementById('date').value;
    const weight = parseFloat(document.getElementById('weight').value);
    const waist = parseFloat(document.getElementById('waist').value);
    const note = document.getElementById('note').value.trim();

    const existing = allEntries.find(e => e.date === date);
    if (existing) {
      if (!confirm(`มีข้อมูลวันที่ ${formatDate(date)} อยู่แล้ว ต้องการอัปเดทหรือไม่?`)) {
        btn.disabled = false;
        btn.textContent = 'บันทึกข้อมูล';
        return;
      }
      await updateEntry(existing.id, { date, weight, waist, note });
    } else {
      await saveEntry({ date, weight, waist, note });
    }

    await loadEntries();
    document.getElementById('weight').value = '';
    document.getElementById('waist').value = '';
    document.getElementById('note').value = '';
    setToday();
    updateLatestSummary();

    btn.textContent = '✓ บันทึกแล้ว';
    setTimeout(() => {
      btn.textContent = 'บันทึกข้อมูล';
      btn.disabled = false;
    }, 1500);
  } catch (err) {
    console.error(err);
    alert('บันทึกไม่สำเร็จ: ' + (err.message || 'เกิดข้อผิดพลาด'));
    btn.disabled = false;
    btn.textContent = 'บันทึกข้อมูล';
  }
});

function setToday() {
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
}

function updateLatestSummary() {
  const box = document.getElementById('latestSummary');
  if (allEntries.length === 0) {
    box.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  const latest = allEntries[allEntries.length - 1];
  document.getElementById('latestWeight').textContent = Number(latest.weight).toFixed(1) + ' kg';
  document.getElementById('latestWaist').textContent = Number(latest.waist).toFixed(1) + ' นิ้ว';
  document.getElementById('totalDays').textContent = allEntries.length;
}

// ========== History ==========
function renderHistory() {
  const entries = [...allEntries].reverse();
  const tbody = document.getElementById('historyTable');
  const noData = document.getElementById('noDataMsg');

  if (entries.length === 0) {
    tbody.innerHTML = '';
    noData.classList.remove('hidden');
    return;
  }
  noData.classList.add('hidden');
  tbody.innerHTML = entries.map(e => `
    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
      <td class="py-3.5 px-4 font-medium">${formatDate(e.date)}</td>
      <td class="py-3.5 px-4">${Number(e.weight).toFixed(1)} kg</td>
      <td class="py-3.5 px-4">${Number(e.waist).toFixed(1)} นิ้ว</td>
      <td class="py-3.5 px-4 text-slate-500 dark:text-slate-400">${e.note || '—'}</td>
      <td class="py-3.5 px-4 text-right space-x-3">
        <button onclick="openEditModal('${e.id}')" class="text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-medium">แก้ไข</button>
        <button onclick="deleteEntry('${e.id}')" class="text-red-500 hover:underline text-xs font-medium">ลบ</button>
      </td>
    </tr>
  `).join('');
}

function openEditModal(id) {
  const entry = allEntries.find(e => e.id === id);
  if (!entry) return;
  document.getElementById('editId').value = entry.id;
  document.getElementById('editDate').value = entry.date;
  document.getElementById('editWeight').value = entry.weight;
  document.getElementById('editWaist').value = entry.waist;
  document.getElementById('editNote').value = entry.note || '';
  document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
}

document.getElementById('editForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const id = document.getElementById('editId').value;
  try {
    await updateEntry(id, {
      date: document.getElementById('editDate').value,
      weight: parseFloat(document.getElementById('editWeight').value),
      waist: parseFloat(document.getElementById('editWaist').value),
      note: document.getElementById('editNote').value.trim()
    });
    await loadEntries();
    closeEditModal();
    renderHistory();
  } catch (err) {
    alert('แก้ไขไม่สำเร็จ: ' + err.message);
  }
});

function exportCSV() {
  if (allEntries.length === 0) {
    alert('ยังไม่มีข้อมูล');
    return;
  }
  let csv = 'Date,Weight (kg),Waist (inch),Note\n';
  allEntries.forEach(e => {
    csv += `${e.date},${e.weight},${e.waist},"${(e.note || '').replace(/"/g, '""')}"\n`;
  });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bodytrack-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ========== Analysis ==========
function setAnalysisPeriod(period) {
  analysisPeriod = period;
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.classList.remove('bg-indigo-500', 'text-white');
    btn.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300');
  });
  const active = document.getElementById(`period-${period}`);
  active.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-600', 'dark:text-slate-300');
  active.classList.add('bg-indigo-500', 'text-white');
  renderAnalysis();
}

function getFilteredEntries() {
  if (analysisPeriod === 'all' || allEntries.length === 0) return allEntries;
  const now = new Date();
  let days = 7;
  if (analysisPeriod === 'month') days = 30;
  if (analysisPeriod === 'year') days = 365;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return allEntries.filter(e => e.date >= cutoffStr);
}

function renderAnalysis() {
  const entries = getFilteredEntries();
  const insightsEl = document.getElementById('healthInsights');

  if (entries.length === 0) {
    document.getElementById('statCurrentWeight').textContent = '—';
    document.getElementById('statCurrentWaist').textContent = '—';
    document.getElementById('statAvgWeight').textContent = '—';
    document.getElementById('statAvgWaist').textContent = '—';
    document.getElementById('statWeightChange').textContent = '';
    document.getElementById('statWaistChange').textContent = '';
    insightsEl.innerHTML = '<p class="text-slate-400">ยังไม่มีข้อมูลเพียงพอในช่วงเวลานี้</p>';
    if (weightChart) { weightChart.destroy(); weightChart = null; }
    if (waistChart) { waistChart.destroy(); waistChart = null; }
    return;
  }

  const latest = entries[entries.length - 1];
  const first = entries[0];
  const avgWeight = (entries.reduce((s, e) => s + Number(e.weight), 0) / entries.length).toFixed(1);
  const avgWaist = (entries.reduce((s, e) => s + Number(e.waist), 0) / entries.length).toFixed(1);

  document.getElementById('statCurrentWeight').textContent = Number(latest.weight).toFixed(1) + ' kg';
  document.getElementById('statCurrentWaist').textContent = Number(latest.waist).toFixed(1) + ' นิ้ว';
  document.getElementById('statAvgWeight').textContent = avgWeight + ' kg';
  document.getElementById('statAvgWaist').textContent = avgWaist + ' นิ้ว';

  const weightDiff = Number(latest.weight) - Number(first.weight);
  const waistDiff = Number(latest.waist) - Number(first.waist);

  const wChange = document.getElementById('statWeightChange');
  const waChange = document.getElementById('statWaistChange');
  wChange.textContent = formatChange(weightDiff, 'kg');
  wChange.className = 'text-xs mt-1.5 ' + (weightDiff < 0 ? 'text-emerald-600 dark:text-emerald-400' : weightDiff > 0 ? 'text-red-500' : 'text-slate-400');
  waChange.textContent = formatChange(waistDiff, 'นิ้ว');
  waChange.className = 'text-xs mt-1.5 ' + (waistDiff < 0 ? 'text-emerald-600 dark:text-emerald-400' : waistDiff > 0 ? 'text-red-500' : 'text-slate-400');

  let insights = [];
  insights.push(`ช่วงที่เลือกมีข้อมูล <strong>${entries.length}</strong> วัน (${formatDate(first.date)} – ${formatDate(latest.date)})`);

  if (entries.length >= 2) {
    if (weightDiff < -0.5) {
      insights.push(`น้ำหนักลดลง <strong>${Math.abs(weightDiff).toFixed(1)} kg</strong> — ทิศทางดีสำหรับการลดน้ำหนัก`);
    } else if (weightDiff > 0.5) {
      insights.push(`น้ำหนักเพิ่มขึ้น <strong>${weightDiff.toFixed(1)} kg</strong> — ควรสังเกตพฤติกรรมการกินและการออกกำลังกาย`);
    } else {
      insights.push(`น้ำหนักค่อนข้างคงที่ (±0.5 kg)`);
    }

    const currentWaist = Number(latest.waist);
    if (currentWaist >= 40) {
      insights.push(`รอบเอว ${currentWaist.toFixed(1)} นิ้ว อยู่ในเกณฑ์ที่ควรระวัง (แนะนำลดลงถ้าเป็นไปได้)`);
    } else if (currentWaist >= 35) {
      insights.push(`รอบเอว ${currentWaist.toFixed(1)} นิ้ว เริ่มเข้าใกล้เกณฑ์ที่ควรระวัง โดยเฉพาะในผู้หญิง`);
    } else {
      insights.push(`รอบเอว ${currentWaist.toFixed(1)} นิ้ว อยู่ในเกณฑ์ที่ดี`);
    }

    if (waistDiff < -0.5) {
      insights.push(`รอบเอวลดลง <strong>${Math.abs(waistDiff).toFixed(1)} นิ้ว</strong> — สัญญาณดีต่อสุขภาพหัวใจและเมตาบอลิซึม`);
    } else if (waistDiff > 0.5) {
      insights.push(`รอบเอวเพิ่มขึ้น <strong>${waistDiff.toFixed(1)} นิ้ว</strong> — ควรให้ความสำคัญกับการลดไขมันหน้าท้อง`);
    }
  }

  if (entries.length >= 7) {
    insights.push(`คุณบันทึกข้อมูลสม่ำเสมอดีมาก การติดตามต่อเนื่องช่วยให้เห็นแนวโน้มที่แท้จริง`);
  } else if (entries.length >= 3) {
    insights.push(`ลองบันทึกอย่างน้อยสัปดาห์ละ 3-4 ครั้ง จะช่วยวิเคราะห์แนวโน้มได้แม่นยำขึ้น`);
  }

  if (entries.length >= 14) {
    const daysDiff = (new Date(latest.date) - new Date(first.date)) / (1000 * 60 * 60 * 24);
    if (daysDiff > 0) {
      const weeklyRate = (weightDiff / daysDiff) * 7;
      if (Math.abs(weeklyRate) > 0.1) {
        insights.push(`อัตราการเปลี่ยนแปลงเฉลี่ยประมาณ <strong>${weeklyRate > 0 ? '+' : ''}${weeklyRate.toFixed(2)} kg/สัปดาห์</strong>`);
      }
    }
  }

  insightsEl.innerHTML = insights.map(s => `<p class="leading-relaxed">• ${s}</p>`).join('');
  renderCharts(entries);
}

function formatChange(diff, unit) {
  if (Math.abs(diff) < 0.05) return 'ไม่เปลี่ยนแปลงจากช่วงเริ่มต้น';
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff.toFixed(1)} ${unit} จากช่วงเริ่มต้น`;
}

function renderCharts(entries) {
  const labels = entries.map(e => formatDateShort(e.date));
  const weights = entries.map(e => Number(e.weight));
  const waists = entries.map(e => Number(e.waist));
  const dark = document.documentElement.classList.contains('dark');
  const gridColor = dark ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.2)';
  const textColor = dark ? '#94a3b8' : '#64748b';

  if (weightChart) weightChart.destroy();
  weightChart = new Chart(document.getElementById('weightChart').getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: weights,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2.5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, maxRotation: 45 } },
        y: { beginAtZero: false, grid: { color: gridColor }, ticks: { color: textColor, callback: v => v + ' kg' } }
      }
    }
  });

  if (waistChart) waistChart.destroy();
  waistChart = new Chart(document.getElementById('waistChart').getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: waists,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2.5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, maxRotation: 45 } },
        y: { beginAtZero: false, grid: { color: gridColor }, ticks: { color: textColor, callback: v => v + ' นิ้ว' } }
      }
    }
  });
}

// ========== Helpers ==========
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
}

// ========== Init ==========
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setToday();
  await initAuth();
  showPage('input');
});

// ========== PWA ==========
// Register from a relative URL so the app also works when hosted in a subfolder.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(error => {
      console.error('Service worker registration failed:', error);
    });
  });
}
