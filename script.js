const START_DATE = '2026-09-15'; // 1번 글귀가 표시될 한국 날짜

// ================================
// 테스트할 글귀 번호
// ================================
// 10번을 보고 싶으면 10
// 5번을 보고 싶으면 5
// 실제 날짜대로 자동 표시하려면 null
const TEST_ID = 8;

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function kstDayNumber(date = new Date()) {
  return Math.floor((date.getTime() + KST_OFFSET_MS) / 86400000);
}

function dateStringToKstDayNumber(s) {
  const [y, m, d] = s.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') quoted = true;
      else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n') {
        row.push(field.replace(/\r$/, ''));
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += c;
      }
    }
  }

  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }

  return rows;
}

async function init() {
  const el = document.getElementById('message');

  try {
    const res = await fetch('./message.csv', { cache: 'no-store' });
    if (!res.ok) throw new Error('CSV load failed');

    const rows = parseCSV(await res.text());
    const header = rows.shift().map(v => v.trim().toUpperCase());

    const idIndex = header.indexOf('ID');
    const msgIndex = header.indexOf('MESSAGE');

    const messages = rows
      .map(r => ({
        id: Number(r[idIndex]),
        message: (r[msgIndex] || '').trim()
      }))
      .filter(x => Number.isFinite(x.id) && x.message)
      .sort((a, b) => a.id - b.id);

    const dayIndex =
      kstDayNumber() - dateStringToKstDayNumber(START_DATE);

    if (dayIndex < 0 && TEST_ID === null) {
      el.textContent = '아직 첫 번째 글을 기다리고 있어요.';
      return;
    }

    // TEST_ID에 숫자가 있으면 그 번호를 표시하고,
    // null이면 날짜에 맞는 번호를 자동 표시
    const targetId = TEST_ID ?? (dayIndex + 1);
    const item = messages.find(x => x.id === targetId);

    el.textContent = item
      ? item.message
      : '새로운 글을 준비하고 있어요.';

  } catch (e) {
    el.textContent =
      '글을 불러오지 못했어요. 잠시 후 다시 열어 주세요.';
    console.error(e);
  }
}

init();
