/* ========================================
   기본 설정
   ======================================== */

/*
  ★ 1번 글귀가 시작되는 날짜

  예:
  '2026-10-01'로 설정하면
  10월 1일 → 1번
  10월 2일 → 2번
  10월 3일 → 3번

  형식은 반드시 YYYY-MM-DD
*/
const START_DATE = '2026-09-15';


/*
  ★ 테스트할 글귀 번호

  숫자를 입력하면 날짜와 관계없이
  해당 ID의 글귀를 강제로 보여줌.

  예:
  const TEST_ID = 1;   → 1번 글귀
  const TEST_ID = 10;  → 10번 글귀

  실제 NFC 운영을 시작할 때는:
  const TEST_ID = null;
*/
const TEST_ID =null;


/*
  한국 시간(KST = UTC+9)을 계산하기 위한 값.
  수정할 필요 없음.
*/
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;


/* ========================================
   한국 날짜 관련 기능
   ======================================== */

/*
  한국시간 기준 현재 날짜의 연/월/일을 구함.
  수정할 필요 없음.
*/
function getKstDateParts(date = new Date()) {
  const kstDate = new Date(date.getTime() + KST_OFFSET_MS);

  return {
    year: kstDate.getUTCFullYear(),
    month: kstDate.getUTCMonth() + 1,
    day: kstDate.getUTCDate()
  };
}


/*
  ★ 화면 상단에 표시되는 날짜 형식

  현재:
  2026. 09. 15
*/
function formatKstDate(date = new Date()) {
  const { year, month, day } = getKstDateParts(date);

  return `${year}. ${String(month).padStart(2, '0')}. ${String(day).padStart(2, '0')}`;
}


/*
  ★ CSV 캐시 갱신용 날짜 문자열

  2026년 9월 15일 → 20260915
  2026년 9월 16일 → 20260916

  날짜가 바뀌면 자동으로 다른 값이 만들어짐.
*/
function getKstCacheDate(date = new Date()) {
  const { year, month, day } = getKstDateParts(date);

  return (
    String(year) +
    String(month).padStart(2, '0') +
    String(day).padStart(2, '0')
  );
}


/*
  오늘이 계산상 몇 번째 날인지 구함.
  날짜별 글귀 번호 계산에 사용.
*/
function kstDayNumber(date = new Date()) {
  return Math.floor(
    (date.getTime() + KST_OFFSET_MS) / 86400000
  );
}


/*
  START_DATE의 YYYY-MM-DD 값을
  계산 가능한 날짜 번호로 변환.
*/
function dateStringToKstDayNumber(dateString) {
  const [year, month, day] =
    dateString.split('-').map(Number);

  return Math.floor(
    Date.UTC(year, month - 1, day) / 86400000
  );
}


/* ========================================
   CSV 파일 읽기
   ======================================== */

/*
  message.csv를 읽을 수 있는 형태로 변환.

  CSV 셀 안의
  - 쉼표
  - 따옴표
  - 줄바꿈
  을 처리함.

  ★ 이 함수는 수정하지 않는 것을 권장.
*/
function parseCSV(text) {
  const rows = [];

  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        quoted = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\n') {
        row.push(field.replace(/\r$/, ''));
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += char;
      }
    }
  }

  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }

  return rows;
}


/* ========================================
   페이지 실행
   ======================================== */

async function init() {
  const dateElement =
    document.getElementById('date');

  const messageElement =
    document.getElementById('message');


  /*
    한국시간 기준 오늘 날짜를
    yyyy. mm. dd 형식으로 화면에 표시.
  */
  dateElement.textContent = formatKstDate();


  try {
    /*
      ========================================
      ★ 매일 CSV 캐시 자동 갱신
      ========================================

      한국시간 기준 오늘 날짜를
      message.csv 주소 뒤에 자동으로 붙임.

      예:
      2026-09-15 → message.csv?v=20260915
      2026-09-16 → message.csv?v=20260916

      날짜가 바뀌면 요청 주소도 자동으로 달라져
      브라우저가 전날의 CSV를 계속 재사용하는
      가능성을 줄임.

      cache: 'no-store'도 함께 사용해서
      최신 CSV를 요청하도록 함.

      ★ 사용자가 매일 숫자를 바꾸거나
        캐시를 삭제할 필요 없음.
    */
    const cacheDate = getKstCacheDate();

    const response =
      await fetch(
        `./message.csv?v=${cacheDate}`,
        { cache: 'no-store' }
      );

    if (!response.ok) {
      throw new Error('CSV load failed');
    }


    /* CSV 내용 읽기 */
    const csvText = await response.text();

    /* CSV를 행/열 구조로 변환 */
    const rows = parseCSV(csvText);


    /*
      CSV 첫 행의 ID / MESSAGE 위치 확인.
    */
    const header =
      rows
        .shift()
        .map(value =>
          value.trim().toUpperCase()
        );

    const idIndex =
      header.indexOf('ID');

    const messageIndex =
      header.indexOf('MESSAGE');


    /*
      실제 글귀 목록 생성.

      ID 또는 MESSAGE가 없는 빈 행은 제외.
    */
    const messages =
      rows
        .map(row => ({
          id: Number(row[idIndex]),
          message: (row[messageIndex] || '').trim()
        }))
        .filter(item =>
          Number.isFinite(item.id) &&
          item.message
        )
        .sort((a, b) => a.id - b.id);


    /*
      START_DATE를 기준으로
      오늘이 몇 번째 날인지 계산.

      START_DATE 당일 → 0
      다음 날 → 1
      그다음 날 → 2
    */
    const dayIndex =
      kstDayNumber() -
      dateStringToKstDayNumber(START_DATE);


    /*
      아직 시작일 전이고
      TEST_ID도 null이면 안내 문구 표시.
    */
    if (
      dayIndex < 0 &&
      TEST_ID === null
    ) {
      messageElement.textContent =
        '아직 첫 번째 글을 기다리고 있어요.';

      return;
    }


    /*
      ★ 표시할 글귀 번호 결정

      TEST_ID에 숫자가 있으면 → 해당 번호
      TEST_ID가 null이면 → 날짜에 따라 자동
    */
    const targetId =
      TEST_ID ?? (dayIndex + 1);


    /*
      CSV에서 해당 번호의 글귀 찾기.
    */
    const todayMessage =
      messages.find(
        item => item.id === targetId
      );


    /*
      글귀가 있으면 화면에 표시.

      해당 ID가 CSV에 없으면
      준비 중 안내 문구 표시.
    */
    messageElement.textContent =
      todayMessage
        ? todayMessage.message
        : '새로운 글을 준비하고 있어요.';


  } catch (error) {
    /*
      CSV를 불러오지 못했을 때 표시.
    */
    messageElement.textContent =
      '글을 불러오지 못했어요. 잠시 후 다시 열어 주세요.';

    console.error(error);
  }
}


/* ========================================
   페이지 시작
   ======================================== */

/*
  위 기능 실행.
  삭제하지 않기.
*/
init();
