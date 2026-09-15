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
  const TEST_ID = 5;   → 5번 글귀
  const TEST_ID = 10;  → 10번 글귀

  ★ 실제 NFC 운영을 시작할 때는 반드시 null

  const TEST_ID = null;

  로 변경하면 START_DATE를 기준으로
  날짜에 따라 글귀가 자동으로 바뀜.
*/
const TEST_ID = 10;


/*
  한국 시간(KST = UTC+9)을 계산하기 위한 값

  이 부분은 수정할 필요 없음.
*/
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;



/* ========================================
   오늘 날짜 표시
   ======================================== */


/*
  ★ 화면 상단에 표시할 날짜를 만드는 함수

  현재 표시 형식:

  2026. 09. 15

  월과 일이 한 자리여도
  자동으로 01, 02처럼 두 자리로 표시됨.
*/
function formatKstDate(date = new Date()) {

  const kstDate =
    new Date(date.getTime() + KST_OFFSET_MS);

  const year =
    kstDate.getUTCFullYear();

  const month =
    String(kstDate.getUTCMonth() + 1)
      .padStart(2, '0');

  const day =
    String(kstDate.getUTCDate())
      .padStart(2, '0');


  /*
    ★ 날짜 표시 모양을 바꾸고 싶다면
    이 부분을 수정하면 됨.

    현재:
    2026. 09. 15
  */
  return `${year}. ${month}. ${day}`;
}



/* ========================================
   날짜 → 글귀 번호 계산
   ======================================== */


/*
  현재 시간을 한국 날짜 기준의
  '몇 번째 날'인지 계산.

  날짜가 바뀌었는지 판단하기 위해 사용.

  수정할 필요 없음.
*/
function kstDayNumber(date = new Date()) {

  return Math.floor(
    (date.getTime() + KST_OFFSET_MS)
    / 86400000
  );
}


/*
  START_DATE에 입력한

  2026-09-15

  같은 날짜를 계산용 숫자로 변환.

  수정할 필요 없음.
*/
function dateStringToKstDayNumber(dateString) {

  const [year, month, day] =
    dateString.split('-').map(Number);

  return Math.floor(
    Date.UTC(year, month - 1, day)
    / 86400000
  );
}



/* ========================================
   CSV 파일 읽기
   ======================================== */


/*
  message.csv의 내용을 읽어서
  JavaScript가 사용할 수 있는 형태로 변환.

  CSV 셀 안에

  - 쉼표
  - 따옴표
  - 줄바꿈

  이 있어도 처리할 수 있도록 만들어져 있음.

  ★ 이 함수는 수정하지 않는 것을 권장.
*/
function parseCSV(text) {

  const rows = [];

  let row = [];
  let field = '';
  let quoted = false;


  for (let i = 0; i < text.length; i++) {

    const char = text[i];


    /* 따옴표 안에 있는 내용 처리 */
    if (quoted) {

      if (
        char === '"' &&
        text[i + 1] === '"'
      ) {

        field += '"';
        i++;

      } else if (char === '"') {

        quoted = false;

      } else {

        field += char;

      }

    }


    /* 일반 CSV 내용 처리 */
    else {

      if (char === '"') {

        quoted = true;

      }

      else if (char === ',') {

        row.push(field);
        field = '';

      }

      else if (char === '\n') {

        row.push(
          field.replace(/\r$/, '')
        );

        rows.push(row);

        row = [];
        field = '';

      }

      else {

        field += char;

      }
    }
  }


  /* CSV의 마지막 행 처리 */
  if (field.length || row.length) {

    row.push(
      field.replace(/\r$/, '')
    );

    rows.push(row);
  }


  return rows;
}



/* ========================================
   페이지 실행
   ======================================== */

async function init() {

  /*
    index.html에서

    #date    → 날짜가 들어갈 자리
    #message → 글귀가 들어갈 자리

    를 찾아옴.
  */
  const dateElement =
    document.getElementById('date');

  const messageElement =
    document.getElementById('message');


  /*
    한국시간 기준 오늘 날짜를 표시.

    예:
    2026. 09. 15
  */
  dateElement.textContent =
    formatKstDate();


  try {

    /*
      message.csv 파일 불러오기

      cache: 'no-store'
      → 가능한 이전 CSV를 재사용하지 않고
        최신 CSV를 불러오도록 요청
    */
    const response =
      await fetch(
        './message.csv',
        { cache: 'no-store' }
      );


    if (!response.ok) {

      throw new Error(
        'CSV load failed'
      );
    }



    /* CSV 내용을 텍스트로 읽기 */
    const csvText =
      await response.text();


    /* CSV를 행/열 형태로 변환 */
    const rows =
      parseCSV(csvText);



    /*
      첫 번째 행(ID, MESSAGE)을 읽음.

      CSV는 현재:

      ID | MESSAGE

      구조를 사용하고 있음.
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
      CSV에서 실제 글귀 목록 생성.

      ID가 없거나
      MESSAGE가 비어 있는 행은 제외.

      따라서 CSV 아래에 빈 행이 있어도
      화면에는 영향을 주지 않음.
    */
    const messages =
      rows

        .map(row => ({

          id:
            Number(
              row[idIndex]
            ),

          message:
            (
              row[messageIndex] || ''
            ).trim()

        }))

        .filter(item =>
          Number.isFinite(item.id) &&
          item.message
        )

        .sort(
          (a, b) =>
            a.id - b.id
        );



    /*
      START_DATE로부터
      오늘이 며칠째인지 계산.

      예:

      START_DATE = 2026-09-15

      9/15 → 0
      9/16 → 1
      9/17 → 2
    */
    const dayIndex =
      kstDayNumber()
      -
      dateStringToKstDayNumber(
        START_DATE
      );



    /*
      아직 시작 날짜가 되지 않았고
      테스트 모드도 아니라면
      아래 문구 표시.
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
      ★ 어떤 글귀를 보여줄지 결정

      TEST_ID에 숫자가 있으면
      → 그 번호를 보여줌.

      TEST_ID가 null이면
      → 날짜에 맞는 번호를 자동 계산.

      실제 운영에서는
      TEST_ID = null
    */
    const targetId =
      TEST_ID ??
      (dayIndex + 1);



    /*
      CSV에서 해당 ID 찾기
    */
    const todayMessage =
      messages.find(
        item =>
          item.id === targetId
      );



    /*
      글귀가 있으면 표시.

      해당 번호가 아직 CSV에 없다면
      준비 중 문구 표시.
    */
    messageElement.textContent =
      todayMessage

        ? todayMessage.message

        : '새로운 글을 준비하고 있어요.';


  }


  /*
    CSV 파일을 불러오지 못하는 등
    오류가 발생했을 때 표시할 문구.
  */
  catch (error) {

    messageElement.textContent =
      '글을 불러오지 못했어요. 잠시 후 다시 열어 주세요.';

    console.error(error);
  }
}



/* ========================================
   페이지 시작
   ======================================== */

/*
  위에서 만든 기능을 실제로 실행.

  이 줄은 삭제하지 않기.
*/
init();
