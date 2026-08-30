// Mood analysis for Me Sati ?

const MOOD_LEVELS = {
  1: { emoji: '😣', label: 'แย่มาก', desc: 'รู้สึกแย่หนัก อารมณ์ตกต่ำมาก หดหู่ หมดแรง หรือทุกข์ใจตลอดวัน' },
  2: { emoji: '😟', label: 'ไม่ดี', desc: 'รู้สึกแย่ อารมณ์หงุดหงิด เศร้า หรือหนักใจค่อนข้างชัด แต่ยังพอทนได้' },
  3: { emoji: '😐', label: 'เฉย ๆ', desc: 'ไม่ได้รู้สึกดีเป็นพิเศษ และก็ไม่ได้แย่มาก วันธรรมดาทั่วไป' },
  4: { emoji: '🙂', label: 'ดี', desc: 'รู้สึกดี มีพลังบวก อารมณ์แจ่มใส หรือพอใจกับวันที่ผ่านมา' },
  5: { emoji: '😄', label: 'ดีมาก', desc: 'รู้สึกดีมาก มีความสุข ภูมิใจ มีพลัง หรือวันนั้นพิเศษในทางบวก' }
};

function describeAvgMood(avg) {
  if (avg >= 4.2) return { text: 'ช่วงนี้ Mood ดีมาก', emoji: '😄', tone: 'good' };
  if (avg >= 3.5) return { text: 'ช่วงนี้ Mood ค่อนข้างดี', emoji: '🙂', tone: 'good' };
  if (avg >= 2.8) return { text: 'ช่วงนี้ Mood ปกติ', emoji: '😐', tone: 'neutral' };
  if (avg >= 2.0) return { text: 'ช่วงนี้ Mood ค่อนข้างต่ำ', emoji: '😟', tone: 'warn' };
  return { text: 'ช่วงนี้ Mood ต่ำมาก ควรใส่ใจตัวเอง', emoji: '😣', tone: 'warn' };
}

/** Date helpers for period ranges (calendar-based, LOCAL timezone) */
function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatRangeLabel(startStr, endStr) {
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const s = new Date(startStr + 'T00:00:00');
  const e = new Date(endStr + 'T00:00:00');
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  const sameYear = s.getFullYear() === e.getFullYear();
  if (sameMonth) {
    return `${s.getDate()}–${e.getDate()} ${months[s.getMonth()]} ${s.getFullYear() + 543}`;
  }
  if (sameYear) {
    return `${s.getDate()} ${months[s.getMonth()]} – ${e.getDate()} ${months[e.getMonth()]} ${s.getFullYear() + 543}`;
  }
  return `${s.getDate()} ${months[s.getMonth()]} ${s.getFullYear() + 543} – ${e.getDate()} ${months[e.getMonth()]} ${e.getFullYear() + 543}`;
}

function startOfWeek(d) {
  // Sunday start (matches calendar UI)
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function getPeriodBounds(range, offset = 0) {
  // offset 0 = current, -1 = previous
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (range === 'weekly') {
    const start = startOfWeek(today);
    start.setDate(start.getDate() + offset * 7);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    return { start: toDateStr(start), end: toDateStr(end) };
  }
  if (range === 'monthly') {
    const base = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return { start: toDateStr(start), end: toDateStr(end) };
  }
  if (range === 'yearly') {
    const y = today.getFullYear() + offset;
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }
  return { start: '1970-01-01', end: toDateStr(today) };
}

function filterEntriesByBounds(entries, bounds) {
  return entries.filter(e => e.date >= bounds.start && e.date <= bounds.end);
}

function comparePeriods(currentEntries, prevEntries) {
  const cur = getStats(currentEntries);
  const prev = getStats(prevEntries);
  if (!cur.totalDays || !prev.totalDays) {
    return {
      hasCompare: false,
      delta: 0,
      direction: 'none',
      label: !prev.totalDays ? 'ยังไม่มีข้อมูลช่วงก่อนหน้าให้เทียบ' : 'ยังไม่มีข้อมูลช่วงนี้พอเทียบ',
      symbol: '–',
      curAvg: cur.avgMood,
      prevAvg: prev.avgMood
    };
  }
  const delta = Math.round((cur.avgMood - prev.avgMood) * 10) / 10;
  let direction = 'same';
  let symbol = '→';
  let label = 'ใกล้เคียงช่วงก่อนหน้า';
  if (delta >= 0.3) {
    direction = 'up';
    symbol = '↑';
    label = 'ดีขึ้นจากช่วงก่อนหน้า';
  } else if (delta <= -0.3) {
    direction = 'down';
    symbol = '↓';
    label = 'แย่ลงจากช่วงก่อนหน้า';
  }
  return {
    hasCompare: true,
    delta,
    direction,
    label,
    symbol,
    curAvg: cur.avgMood,
    prevAvg: prev.avgMood
  };
}

const RANGE_LABELS = {
  weekly: { short: 'Weekly', prev: 'สัปดาห์ก่อน', unit: 'สัปดาห์นี้' },
  monthly: { short: 'Monthly', prev: 'เดือนก่อน', unit: 'เดือนนี้' },
  yearly: { short: 'Yearly', prev: 'ปีก่อน', unit: 'ปีนี้' }
};

/** Technical insights → human language */
function getMoodSeries(entries) {
  return [...entries]
    .filter(e => e.finalMood != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => ({ date: e.date, mood: e.finalMood || 3, isPeriod: !!e.isPeriod, items: e.items || [] }));
}

function calcStdev(values) {
  if (!values.length) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const v = values.reduce((s, x) => s + (x - mean) ** 2, 0) / values.length;
  return Math.sqrt(v);
}

function describeVolatility(series) {
  if (series.length < 3) {
    return { text: 'ข้อมูลยังน้อยไปที่จะบอกว่าอารมณ์นิ่งหรือผันผวน', icon: 'ℹ️', tone: 'info' };
  }
  const sd = calcStdev(series.map(s => s.mood));
  if (sd < 0.5) {
    return { text: 'อารมณ์ช่วงนี้ค่อนข้างคงที่ ไม่ขึ้นลงแรง', icon: '🌊', tone: 'good' };
  }
  if (sd < 1.0) {
    return { text: 'อารมณ์มีการขึ้นลงบ้างในระดับปกติ', icon: '〰️', tone: 'neutral' };
  }
  return { text: 'อารมณ์ผันผวนค่อนข้างมาก มีวันดีและวันแย่สลับกันชัด', icon: '⚡', tone: 'warn' };
}

function describeTrendMA(series) {
  if (series.length < 4) {
    return { text: 'บันทึกเพิ่มอีกหน่อยจะเห็นทิศทางอารมณ์ชัดขึ้น', icon: '📈', tone: 'info' };
  }
  const moods = series.map(s => s.mood);
  const n = moods.length;
  // short window vs longer window
  const shortN = Math.min(3, Math.floor(n / 2) || 1);
  const longN = Math.min(7, n);
  const sma = (arr, k) => {
    const slice = arr.slice(-k);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  };
  // EMA helper
  const ema = (arr, k) => {
    const alpha = 2 / (k + 1);
    let e = arr[0];
    for (let i = 1; i < arr.length; i++) e = alpha * arr[i] + (1 - alpha) * e;
    return e;
  };
  const shortAvg = sma(moods, shortN);
  const longAvg = sma(moods, longN);
  const recentEma = ema(moods, Math.min(5, n));
  const early = moods.slice(0, Math.max(1, Math.floor(n / 3)));
  const earlyAvg = early.reduce((a, b) => a + b, 0) / early.length;

  const delta = shortAvg - longAvg;
  const vsStart = recentEma - earlyAvg;

  if (delta >= 0.35 || vsStart >= 0.4) {
    return { text: 'แนวโน้มอารมณ์กำลังดีขึ้น เมื่อเทียบกับช่วงต้นของข้อมูล', icon: '📈', tone: 'good' };
  }
  if (delta <= -0.35 || vsStart <= -0.4) {
    return { text: 'แนวโน้มอารมณ์กำลังแย่ลง ควรสังเกตว่ามีอะไรกระทบต่อเนื่อง', icon: '📉', tone: 'warn' };
  }
  return { text: 'แนวโน้มอารมณ์ค่อนข้างทรงตัว ยังไม่มีทิศทางชัดเจนขึ้นหรือลง', icon: '➡️', tone: 'neutral' };
}

function describeCorrelations(series) {
  const results = [];
  if (series.length < 3) {
    return [{ text: 'ข้อมูลยังน้อยไปที่จะหาความสัมพันธ์ของปัจจัย', icon: '🔗', tone: 'info' }];
  }

  // Period correlation
  const periodDays = series.filter(s => s.isPeriod);
  if (periodDays.length >= 2) {
    const avgP = periodDays.reduce((a, s) => a + s.mood, 0) / periodDays.length;
    const nonP = series.filter(s => !s.isPeriod);
    if (nonP.length >= 1) {
      const avgNP = nonP.reduce((a, s) => a + s.mood, 0) / nonP.length;
      if (avgP <= avgNP - 0.4) {
        results.push({ text: 'วันที่เป็นประจำเดือน มักมี Mood ต่ำกว่าวันปกติ', icon: '🩸', tone: 'warn' });
      } else if (avgP >= avgNP + 0.4) {
        results.push({ text: 'วันที่เป็นประจำเดือน Mood ไม่ได้ต่ำลงเป็นพิเศษ', icon: '🩸', tone: 'good' });
      }
    }
  }

  // Contexts that appear on low-mood days (from negative items only)
  // Rank by how often they show up on bad days (count), not ratio — more intuitive
  const ctxOnLow = {};
  let lowDayCount = 0;
  series.forEach(s => {
    if ((s.mood || 3) > 2) return;
    lowDayCount++;
    const seen = new Set();
    (s.items || []).forEach(item => {
      if (item.type !== 'negative') return;
      (item.contextTags || []).forEach(c => {
        if (seen.has(c)) return;
        seen.add(c);
        ctxOnLow[c] = (ctxOnLow[c] || 0) + 1;
      });
    });
  });
  const ctxHits = Object.entries(ctxOnLow)
    .map(([c, n]) => ({ c, n }))
    .filter(x => x.n >= 1)
    .sort((a, b) => b.n - a.n);

  if (ctxHits[0] && lowDayCount >= 1) {
    results.push({
      text: `ในวันที่ Mood ไม่ดี บริบทที่เจอบ่อยสุดคือ「${ctxHits[0].c}」(${ctxHits[0].n}/${lowDayCount} วัน)`,
      icon: '🏷️',
      tone: 'warn'
    });
  }

  // Feelings on low-mood days (negative items only)
  const feelOnLow = {};
  series.forEach(s => {
    if ((s.mood || 3) > 2) return;
    const seen = new Set();
    (s.items || []).forEach(item => {
      if (item.type !== 'negative') return;
      (item.feelingTags || []).forEach(f => {
        if (seen.has(f)) return;
        seen.add(f);
        feelOnLow[f] = (feelOnLow[f] || 0) + 1;
      });
    });
  });
  const feelHits = Object.entries(feelOnLow)
    .map(([f, n]) => ({ f, n }))
    .sort((a, b) => b.n - a.n);

  if (feelHits[0] && lowDayCount >= 1) {
    results.push({
      text: `ในวันที่ Mood ไม่ดี อารมณ์ที่เจอบ่อยสุดคือ「${feelHits[0].f}」(${feelHits[0].n}/${lowDayCount} วัน)`,
      icon: '💭',
      tone: 'warn'
    });
  }

  if (!results.length) {
    results.push({ text: 'ยังไม่พบปัจจัยที่เด่นชัดว่าผูกกับ Mood ต่ำเป็นพิเศษ', icon: '🔗', tone: 'info' });
  }
  return results.slice(0, 3);
}

function describeChangePoints(series) {
  if (series.length < 6) {
    return { text: 'ข้อมูลยังน้อยไปที่จะชี้จุดเปลี่ยนอารมณ์', icon: '🔀', tone: 'info' };
  }
  const moods = series.map(s => s.mood);
  const n = moods.length;
  // Simple change-point: maximize difference between left and right means
  let bestIdx = -1;
  let bestScore = 0;
  const minSeg = 2;
  for (let i = minSeg; i <= n - minSeg; i++) {
    const left = moods.slice(0, i);
    const right = moods.slice(i);
    const lAvg = left.reduce((a, b) => a + b, 0) / left.length;
    const rAvg = right.reduce((a, b) => a + b, 0) / right.length;
    const score = Math.abs(rAvg - lAvg);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  if (bestIdx < 0 || bestScore < 0.6) {
    return { text: 'ไม่พบจุดที่อารมณ์เปลี่ยนชัดเจน ช่วงนี้ค่อนข้างต่อเนื่อง', icon: '🔀', tone: 'neutral' };
  }
  const leftAvg = moods.slice(0, bestIdx).reduce((a, b) => a + b, 0) / bestIdx;
  const rightAvg = moods.slice(bestIdx).reduce((a, b) => a + b, 0) / (n - bestIdx);
  const changeDate = series[bestIdx].date;
  const d = new Date(changeDate + 'T00:00:00');
  const dateLabel = `${d.getDate()}/${d.getMonth() + 1}`;
  if (rightAvg > leftAvg) {
    return {
      text: `ประมาณวันที่ ${dateLabel} อารมณ์เริ่มดีขึ้นจากช่วงก่อนหน้า`,
      icon: '🔀',
      tone: 'good'
    };
  }
  return {
    text: `ประมาณวันที่ ${dateLabel} อารมณ์เริ่มแย่ลงจากช่วงก่อนหน้า`,
    icon: '🔀',
    tone: 'warn'
  };
}

function getTechnicalInsights(entries) {
  const series = getMoodSeries(entries);
  return {
    trend: describeTrendMA(series),
    volatility: describeVolatility(series),
    correlations: describeCorrelations(series),
    changePoint: describeChangePoints(series)
  };
}

const INTENSITY_LABELS = {
  1: { label: 'นิดหน่อย', short: 'เล็ก' },
  2: { label: 'ปานกลาง', short: 'กลาง' },
  3: { label: 'มาก', short: 'มาก' }
};

const FEELING_PRESETS = {
  negative: ['โกรธ', 'หงุดหงิด', 'เศร้า', 'วิตก', 'เครียด', 'เหนื่อย', 'น้อยใจ', 'กลัว', 'หดหู่', 'หมดแรง'],
  positive: ['ดีใจ', 'ภูมิใจ', 'สงบ', 'ขอบคุณ', 'สนุก', 'มีแรง', 'อบอุ่น', 'มั่นใจ', 'ผ่อนคลาย', 'มีความสุข']
};

const CONTEXT_PRESETS = ['คน', 'งาน', 'การเงิน', 'สุขภาพ', 'ครอบครัว', 'ตัวเอง', 'การจราจร', 'สังคม', 'อื่น ๆ'];

/**
 * Analyze mood from items with intensity
 * Returns detailed breakdown for transparency
 */
function analyzeMood(entry) {
  if (!entry) {
    return {
      mood: 3,
      reason: 'ไม่มีข้อมูล',
      confidence: 'low',
      negCount: 0,
      posCount: 0,
      negScore: 0,
      posScore: 0,
      details: []
    };
  }

  const items = entry.items || [];
  const neg = items.filter(i => i.type === 'negative');
  const pos = items.filter(i => i.type === 'positive');

  // Weighted score: intensity 1=0.4, 2=1.0, 3=1.6
  const intensityWeight = (lv) => ({ 1: 0.4, 2: 1.0, 3: 1.6 }[lv] || 1.0);

  let negScore = 0;
  neg.forEach(i => { negScore += intensityWeight(i.intensity || 2); });

  let posScore = 0;
  pos.forEach(i => { posScore += intensityWeight(i.intensity || 2); });

  let score = 3;
  const details = [];

  if (negScore > 0) {
    const deduct = Math.min(2.2, negScore * 0.55);
    score -= deduct;
    details.push(`เรื่องแย่ ${neg.length} รายการ (น้ำหนัก ${negScore.toFixed(1)}) → ลด ${deduct.toFixed(1)}`);
  }
  if (posScore > 0) {
    const add = Math.min(2.0, posScore * 0.5);
    score += add;
    details.push(`เรื่องดี ${pos.length} รายการ (น้ำหนัก ${posScore.toFixed(1)}) → เพิ่ม ${add.toFixed(1)}`);
  }

  // Feeling tags influence
  const allFeelings = items.flatMap(i => i.feelingTags || []);
  const heavyNeg = ['โกรธ', 'เศร้า', 'เครียด', 'หดหู่', 'กลัว'];
  const heavyPos = ['ภูมิใจ', 'ขอบคุณ', 'สงบ', 'มีความสุข'];
  const negFeel = allFeelings.filter(t => heavyNeg.includes(t)).length;
  const posFeel = allFeelings.filter(t => heavyPos.includes(t)).length;
  if (negFeel > posFeel + 1) {
    score -= 0.35;
    details.push(`แท็กอารมณ์เชิงลบเด่น (${negFeel}) → ลด 0.35`);
  } else if (posFeel > negFeel + 1) {
    score += 0.3;
    details.push(`แท็กอารมณ์เชิงบวกเด่น (${posFeel}) → เพิ่ม 0.3`);
  }

  // Diary keywords
  const diary = (entry.freeDiary || '').toLowerCase();
  const negWords = ['แย่', 'ห่วย', 'เหนื่อย', 'เครียด', 'โกรธ', 'เศร้า', 'ทุกข์', 'ไม่ไหว', 'หมดแรง', 'หงุดหงิด'];
  const posWords = ['ดี', 'สุข', 'ขอบคุณ', 'ภูมิใจ', 'สนุก', 'สบาย', 'ผ่อนคลาย', 'มีความสุข', 'เยี่ยม'];
  let negHits = 0, posHits = 0;
  negWords.forEach(w => { if (diary.includes(w)) negHits++; });
  posWords.forEach(w => { if (diary.includes(w)) posHits++; });
  if (negHits > posHits + 1) {
    score -= 0.3;
    details.push('ข้อความไดอารี่มีคำเชิงลบ → ลด 0.3');
  } else if (posHits > negHits + 1) {
    score += 0.25;
    details.push('ข้อความไดอารี่มีคำเชิงบวก → เพิ่ม 0.25');
  }

  if (details.length === 0) details.push('ข้อมูลยังน้อย จึงเริ่มจากจุดกลาง (3)');

  let finalMood = Math.round(Math.max(1, Math.min(5, score)));

  // Confidence
  let confidence = 'low';
  const signalStrength = negScore + posScore + (allFeelings.length * 0.3);
  if (signalStrength >= 3 || items.length >= 3) confidence = 'high';
  else if (signalStrength >= 1 || items.length >= 1) confidence = 'medium';

  const confLabel = { low: 'ต่ำ', medium: 'ปานกลาง', high: 'สูง' }[confidence];

  return {
    mood: finalMood,
    reason: details.join(' • '),
    confidence,
    confLabel,
    negCount: neg.length,
    posCount: pos.length,
    negScore: Math.round(negScore * 10) / 10,
    posScore: Math.round(posScore * 10) / 10,
    details,
    rawScore: Math.round(score * 10) / 10
  };
}

function generateAlerts(entries) {
  if (!entries || entries.length < 3) {
    return [{ type: 'info', text: 'บันทึกต่อไปอีกสักพัก ระบบจะเริ่มวิเคราะห์แนวโน้มและเตือนสติให้ได้นะ' }];
  }

  const alerts = [];
  const last7 = entries.filter(e => {
    const diff = (Date.now() - new Date(e.date + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });

  const moods = last7.map(e => e.finalMood || 3);
  const avgMood = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : 3;

  let consecutiveLow = 0;
  for (const e of last7) {
    if ((e.finalMood || 3) <= 2) consecutiveLow++;
    else break;
  }

  let totalNeg = 0, totalPos = 0, heavyNegCount = 0;
  const feelingMap = {}, contextMap = {};
  last7.forEach(e => {
    (e.items || []).forEach(item => {
      if (item.type === 'negative') {
        totalNeg++;
        if ((item.intensity || 2) >= 3) heavyNegCount++;
      } else totalPos++;
      (item.feelingTags || []).forEach(t => { feelingMap[t] = (feelingMap[t] || 0) + 1; });
      (item.contextTags || []).forEach(t => { contextMap[t] = (contextMap[t] || 0) + 1; });
    });
  });

  const topFeelings = Object.entries(feelingMap).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const topContexts = Object.entries(contextMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

  if (consecutiveLow >= 3) {
    alerts.push({ type: 'warning', text: `ช่วงนี้ Mood ต่ำติดต่อกัน ${consecutiveLow} วันแล้ว ลองพักผ่อนหรือทำสิ่งที่เคยทำให้รู้สึกดีดูนะ` });
  } else if (avgMood < 2.5 && last7.length >= 5) {
    alerts.push({ type: 'warning', text: `Mood เฉลี่ยสัปดาห์นี้ค่อนข้างต่ำ อาจถึงเวลาที่ควรดูแลตัวเองมากขึ้น` });
  }

  if (heavyNegCount >= 3) {
    alerts.push({ type: 'warning', text: `มีเรื่องที่รู้สึกแย่ระดับ “มาก” ถึง ${heavyNegCount} ครั้งในช่วงนี้ ลองดูว่ามีอะไรซ้ำ ๆ ที่กระทบหนัก` });
  }

  if (totalNeg >= 8 && last7.length >= 5) {
    alerts.push({ type: 'warning', text: `สัปดาห์นี้มีเรื่องที่รู้สึกแย่รวม ${totalNeg} รายการ บ่อยกว่าปกติ` });
  }

  if (topFeelings.length && topFeelings[0][1] >= 3) {
    alerts.push({ type: 'warning', text: `อารมณ์ที่เจอบ่อยสุดช่วงนี้คือ “${topFeelings[0][0]}” (${topFeelings[0][1]} ครั้ง)` });
  }

  if (topContexts.length && topContexts[0][1] >= 3) {
    alerts.push({ type: 'info', text: `บริบทที่เกี่ยวโยงบ่อยสุดคือ “${topContexts[0][0]}” (${topContexts[0][1]} ครั้ง) — อาจเป็นจุดที่ควรใส่ใจ` });
  }

  const goodDays = last7.filter(e => (e.finalMood || 3) >= 4).length;
  if (goodDays >= 5 && last7.length >= 6) {
    alerts.push({ type: 'positive', text: `สัปดาห์นี้มีวันที่ Mood ดีถึง ${goodDays} วันเลย เก่งมาก รักษาโมเมนตัมนี้ไว้!` });
  }
  if (totalPos >= 8) {
    alerts.push({ type: 'positive', text: `บันทึกเรื่องที่ทำได้ดีไว้ ${totalPos} รายการในช่วงนี้ การมองเห็นจุดแข็งเป็นเรื่องดีมาก` });
  }

  let streak = 0;
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  let checkDate = new Date();
  for (const e of sorted) {
    const expected = toDateStr(checkDate);
    if (e.date === expected) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else break;
  }
  if (streak >= 7) {
    alerts.push({ type: 'positive', text: `บันทึกต่อเนื่องมาแล้ว ${streak} วัน! ความสม่ำเสมอช่วยให้รู้ทันตัวเองได้ดีขึ้น` });
  } else if (streak >= 3) {
    alerts.push({ type: 'info', text: `บันทึกต่อเนื่อง ${streak} วันแล้ว ต่อไปอีกนิดจะเห็นแพทเทิร์นชัดขึ้น` });
  }

  if (alerts.length === 0) {
    alerts.push({ type: 'info', text: 'ช่วงนี้ Mood ค่อนข้างสมดุล ดีแล้วที่ยังคงสังเกตตัวเองอยู่' });
  }

  return alerts.slice(0, 5);
}

function getStats(entries) {
  if (!entries.length) {
    return { totalDays: 0, avgMood: 0, totalNeg: 0, totalPos: 0, goodDays: 0, badDays: 0, heavyNeg: 0 };
  }
  const moods = entries.map(e => e.finalMood || 3);
  const avgMood = moods.reduce((a, b) => a + b, 0) / moods.length;
  let totalNeg = 0, totalPos = 0, heavyNeg = 0;
  entries.forEach(e => {
    (e.items || []).forEach(i => {
      if (i.type === 'negative') {
        totalNeg++;
        if ((i.intensity || 2) >= 3) heavyNeg++;
      } else totalPos++;
    });
  });
  return {
    totalDays: entries.length,
    avgMood: Math.round(avgMood * 10) / 10,
    totalNeg,
    totalPos,
    goodDays: moods.filter(m => m >= 4).length,
    badDays: moods.filter(m => m <= 2).length,
    heavyNeg
  };
}

/** Aggregate for insights — feelings with associated contexts */
function getInsightData(entries) {
  // feeling -> { count, contexts: { ctx: count } }
  const feelingNeg = {}, feelingPos = {};
  // overall context counts (per item, not multiplied by feelings)
  const ctxNegAll = {}, ctxPosAll = {};
  const intensityDist = { neg: {1:0,2:0,3:0}, pos: {1:0,2:0,3:0} };
  let periodDays = 0, periodLowMood = 0;

  entries.forEach(e => {
    if (e.isPeriod) {
      periodDays++;
      if ((e.finalMood || 3) <= 2) periodLowMood++;
    }
    (e.items || []).forEach(item => {
      const side = item.type === 'negative' ? 'neg' : 'pos';
      const lv = item.intensity || 2;
      intensityDist[side][lv] = (intensityDist[side][lv] || 0) + 1;

      const map = item.type === 'negative' ? feelingNeg : feelingPos;
      const ctxAll = item.type === 'negative' ? ctxNegAll : ctxPosAll;
      const feelings = item.feelingTags || [];
      const contexts = item.contextTags || [];

      // overall context count once per item
      contexts.forEach(c => { ctxAll[c] = (ctxAll[c] || 0) + 1; });

      if (feelings.length === 0 && contexts.length) {
        const key = 'อื่น ๆ';
        if (!map[key]) map[key] = { count: 0, contexts: {} };
        map[key].count++;
        contexts.forEach(c => { map[key].contexts[c] = (map[key].contexts[c] || 0) + 1; });
      } else {
        feelings.forEach(t => {
          if (!map[t]) map[t] = { count: 0, contexts: {} };
          map[t].count++;
          contexts.forEach(c => { map[t].contexts[c] = (map[t].contexts[c] || 0) + 1; });
        });
      }
    });
  });

  const sortFeelings = (obj, n = 8) =>
    Object.entries(obj)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, n)
      .map(([name, data]) => {
        const topCtx = Object.entries(data.contexts).sort((a, b) => b[1] - a[1]).slice(0, 4);
        return { name, count: data.count, contexts: topCtx };
      });

  const topOverallCtx = (obj) => {
    const sorted = Object.entries(obj).sort((a, b) => b[1] - a[1]);
    return sorted[0] || null; // [name, count] or null
  };

  const totalNegFeel = Object.values(feelingNeg).reduce((s, d) => s + d.count, 0);
  const totalPosFeel = Object.values(feelingPos).reduce((s, d) => s + d.count, 0);

  // Combined context factors (neg + pos) for ranked visual bars
  const allCtxNames = new Set([...Object.keys(ctxNegAll), ...Object.keys(ctxPosAll)]);
  const contextFactors = [...allCtxNames].map(name => {
    const neg = ctxNegAll[name] || 0;
    const pos = ctxPosAll[name] || 0;
    return { name, neg, pos, total: neg + pos };
  }).sort((a, b) => b.total - a.total);
  const contextTotal = contextFactors.reduce((s, c) => s + c.total, 0);

  return {
    topFeelingsNeg: sortFeelings(feelingNeg),
    topFeelingsPos: sortFeelings(feelingPos),
    topCtxNeg: topOverallCtx(ctxNegAll),
    topCtxPos: topOverallCtx(ctxPosAll),
    totalNegFeel,
    totalPosFeel,
    contextFactors,
    contextTotal,
    intensityDist,
    periodDays,
    periodLowMood
  };
}
