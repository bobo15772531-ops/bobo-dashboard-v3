/**
 * BOBO Dashboard V3
 * 전체 제어, 필터, KPI, 미리보기
 */

let dashboardRows = [];
let filteredDashboardRows = [];
let dashboardEventsBound = false;


/**
 * 대시보드 시작
 */
async function startDashboard() {
  setDashboardStatus(
    'loading',
    '데이터를 불러오는 중입니다.'
  );

  try {
    const loadedData =
      await loadDashboardData();

    dashboardRows =
      convertLoadedDataToRows(
        loadedData
      );

    validateDashboardRows(
      dashboardRows
    );

    initializeDashboardFilters(
      dashboardRows
    );

    applyDashboardFilters();

  } catch (error) {
    console.error(error);

    setDashboardStatus(
      'error',
      '데이터 연결 실패: ' +
      error.message
    );
  }
}


/**
 * Apps Script 응답을
 * [헤더, 행, 행...] 형태로 통일합니다.
 */
function convertLoadedDataToRows(
  loadedData
) {
  if (
    !Array.isArray(loadedData) ||
    loadedData.length === 0
  ) {
    throw new Error(
      '불러온 데이터가 없습니다.'
    );
  }

  /*
   * 이미 2차원 배열이면 그대로 사용
   */
  if (
    Array.isArray(
      loadedData[0]
    )
  ) {
    return loadedData;
  }

  /*
   * 객체 배열이면 Dashboard 설정 열 순서로 변환
   */
  if (
    typeof loadedData[0] ===
    'object'
  ) {
    const headers = [
      DASHBOARD_CONFIG.columns.date,
      DASHBOARD_CONFIG.columns.market,
      DASHBOARD_CONFIG.columns.category,
      DASHBOARD_CONFIG.columns.model,
      DASHBOARD_CONFIG.columns.quantity,
      DASHBOARD_CONFIG.columns.settlement
    ];

    const rows =
      loadedData.map(item =>
        headers.map(header =>
          item &&
          item[header] !== undefined
            ? item[header]
            : ''
        )
      );

    return [
      headers,
      ...rows
    ];
  }

  throw new Error(
    '데이터 형식을 확인할 수 없습니다.'
  );
}


/**
 * 필수 열 확인
 */
function validateDashboardRows(rows) {
  if (
    !Array.isArray(rows) ||
    rows.length < 2
  ) {
    throw new Error(
      '분석할 데이터가 없습니다.'
    );
  }

  const headers =
    rows[0].map(cleanAppCell);

  const requiredHeaders = [
    DASHBOARD_CONFIG.columns.date,
    DASHBOARD_CONFIG.columns.market,
    DASHBOARD_CONFIG.columns.category,
    DASHBOARD_CONFIG.columns.model,
    DASHBOARD_CONFIG.columns.quantity,
    DASHBOARD_CONFIG.columns.settlement
  ];

  const missingHeaders =
    requiredHeaders.filter(
      header =>
        !headers.includes(header)
    );

  if (
    missingHeaders.length > 0
  ) {
    throw new Error(
      '다음 열을 찾지 못했습니다: ' +
      missingHeaders.join(', ')
    );
  }
}


/**
 * 필터 선택값 구성
 */
function initializeDashboardFilters(
  rows
) {
  const headers =
    rows[0].map(cleanAppCell);

  const dateIndex =
    headers.indexOf(
      DASHBOARD_CONFIG.columns.date
    );

  const marketIndex =
    headers.indexOf(
      DASHBOARD_CONFIG.columns.market
    );

  const categoryIndex =
    headers.indexOf(
      DASHBOARD_CONFIG.columns.category
    );

  fillFilterSelect(
    'marketFilter',
    getUniqueSortedValues(
      rows.slice(1),
      marketIndex
    ),
    '전체 마켓'
  );

  fillFilterSelect(
    'categoryFilter',
    getUniqueSortedValues(
      rows.slice(1),
      categoryIndex
    ),
    '전체 카테고리'
  );

  setDateFilterRange(
    rows.slice(1),
    dateIndex
  );

  bindDashboardEvents();
}


/**
 * 현재 필터 적용
 */
function applyDashboardFilters() {
  if (
    !Array.isArray(
      dashboardRows
    ) ||
    dashboardRows.length < 2
  ) {
    return;
  }

  const headers =
    dashboardRows[0].map(
      cleanAppCell
    );

  const indexes = {
    date: headers.indexOf(
      DASHBOARD_CONFIG.columns.date
    ),

    market: headers.indexOf(
      DASHBOARD_CONFIG.columns.market
    ),

    category: headers.indexOf(
      DASHBOARD_CONFIG.columns.category
    ),

    model: headers.indexOf(
      DASHBOARD_CONFIG.columns.model
    )
  };

  const startDate =
    getElementValue(
      'startDate'
    );

  const endDate =
    getElementValue(
      'endDate'
    );

  const selectedMarket =
    getElementValue(
      'marketFilter'
    );

  const selectedCategory =
    getElementValue(
      'categoryFilter'
    );

  const modelKeyword =
    getElementValue(
      'modelSearch'
    )
      .trim()
      .toUpperCase();

  const filteredRows =
    dashboardRows
      .slice(1)
      .filter(row => {
        const rowDate =
          normalizeAppDate(
            row[indexes.date]
          );

        const rowMarket =
          cleanAppCell(
            row[indexes.market]
          );

        const rowCategory =
          cleanAppCell(
            row[indexes.category]
          );

        const rowModel =
          cleanAppCell(
            row[indexes.model]
          ).toUpperCase();

        if (
          startDate &&
          rowDate &&
          rowDate < startDate
        ) {
          return false;
        }

        if (
          endDate &&
          rowDate &&
          rowDate > endDate
        ) {
          return false;
        }

        if (
          selectedMarket &&
          rowMarket !==
          selectedMarket
        ) {
          return false;
        }

        if (
          selectedCategory &&
          rowCategory !==
          selectedCategory
        ) {
          return false;
        }

        if (
          modelKeyword &&
          !rowModel.includes(
            modelKeyword
          )
        ) {
          return false;
        }

        return true;
      });

  filteredDashboardRows = [
    dashboardRows[0],
    ...filteredRows
  ];

  updateDashboardKpis(
    filteredDashboardRows
  );

  renderDashboardCharts(
    filteredDashboardRows
  );

  renderDashboardPreview(
    filteredDashboardRows
  );

  setDashboardStatus(
    'success',
    '데이터 연결 완료 · 현재 조건 ' +
    formatAppNumber(
      filteredRows.length
    ) +
    '건'
  );
}


/**
 * KPI 계산
 */
function updateDashboardKpis(
  rows
) {
  const headers =
    rows[0].map(
      cleanAppCell
    );

  const quantityIndex =
    headers.indexOf(
      DASHBOARD_CONFIG.columns.quantity
    );

  const settlementIndex =
    headers.indexOf(
      DASHBOARD_CONFIG.columns.settlement
    );

  const dataRows =
    rows.slice(1);

  let totalSales = 0;
  let totalQuantity = 0;

  dataRows.forEach(row => {
    totalQuantity +=
      appToNumber(
        row[quantityIndex]
      );

    totalSales +=
      appToNumber(
        row[settlementIndex]
      );
  });

  const totalOrders =
    dataRows.length;

  const averageOrderValue =
    totalOrders > 0
      ? Math.round(
          totalSales /
          totalOrders
        )
      : 0;

  setText(
    'totalSales',
    formatAppNumber(
      totalSales
    ) +
    '원'
  );

  setText(
    'totalOrders',
    formatAppNumber(
      totalOrders
    ) +
    '건'
  );

  setText(
    'totalQuantity',
    formatAppNumber(
      totalQuantity
    ) +
    '개'
  );

  setText(
    'averageOrderValue',
    formatAppNumber(
      averageOrderValue
    ) +
    '원'
  );
}


/**
 * 미리보기 표
 */
function renderDashboardPreview(
  rows
) {
  const previewBody =
    document.getElementById(
      'previewBody'
    );

  if (!previewBody) {
    return;
  }

  previewBody.innerHTML = '';

  const headers =
    rows[0].map(
      cleanAppCell
    );

  const indexes = {
    date: headers.indexOf(
      DASHBOARD_CONFIG.columns.date
    ),

    market: headers.indexOf(
      DASHBOARD_CONFIG.columns.market
    ),

    category: headers.indexOf(
      DASHBOARD_CONFIG.columns.category
    ),

    model: headers.indexOf(
      DASHBOARD_CONFIG.columns.model
    ),

    quantity: headers.indexOf(
      DASHBOARD_CONFIG.columns.quantity
    ),

    settlement: headers.indexOf(
      DASHBOARD_CONFIG.columns.settlement
    )
  };

  const previewRows =
    DASHBOARD_CONFIG.display
      .previewRows || 20;

  rows
    .slice(
      1,
      previewRows + 1
    )
    .forEach(row => {
      appendPreviewRow(
        previewBody,
        [
          cleanAppCell(
            row[indexes.date]
          ),

          cleanAppCell(
            row[indexes.market]
          ),

          cleanAppCell(
            row[indexes.category]
          ),

          cleanAppCell(
            row[indexes.model]
          ),

          formatAppNumber(
            appToNumber(
              row[indexes.quantity]
            )
          ),

          formatAppNumber(
            appToNumber(
              row[indexes.settlement]
            )
          )
        ]
      );
    });

  setText(
    'previewCount',
    '현재 조건 ' +
    formatAppNumber(
      rows.length - 1
    ) +
    '건 중 상위 ' +
    Math.min(
      previewRows,
      Math.max(
        rows.length - 1,
        0
      )
    ) +
    '건'
  );
}


/**
 * 필터 초기화
 */
function resetDashboardFilters() {
  setElementValue(
    'marketFilter',
    ''
  );

  setElementValue(
    'categoryFilter',
    ''
  );

  setElementValue(
    'modelSearch',
    ''
  );

  restoreDefaultDates();

  applyDashboardFilters();
}


/**
 * 이벤트 한 번만 연결
 */
function bindDashboardEvents() {
  if (
    dashboardEventsBound
  ) {
    return;
  }

  [
    'startDate',
    'endDate',
    'marketFilter',
    'categoryFilter'
  ].forEach(id => {
    const element =
      document.getElementById(id);

    if (element) {
      element.addEventListener(
        'change',
        applyDashboardFilters
      );
    }
  });

  const modelSearch =
    document.getElementById(
      'modelSearch'
    );

  if (modelSearch) {
    modelSearch.addEventListener(
      'input',
      debounce(
        applyDashboardFilters,
        300
      )
    );
  }

  const resetButton =
    document.getElementById(
      'resetFilters'
    );

  if (resetButton) {
    resetButton.addEventListener(
      'click',
      resetDashboardFilters
    );
  }

  dashboardEventsBound = true;
}


/**
 * select 옵션 구성
 */
function fillFilterSelect(
  elementId,
  values,
  defaultLabel
) {
  const select =
    document.getElementById(
      elementId
    );

  if (!select) {
    return;
  }

  select.innerHTML = '';

  const defaultOption =
    document.createElement(
      'option'
    );

  defaultOption.value = '';
  defaultOption.textContent =
    defaultLabel;

  select.appendChild(
    defaultOption
  );

  values.forEach(value => {
    const option =
      document.createElement(
        'option'
      );

    option.value = value;
    option.textContent =
      value;

    select.appendChild(
      option
    );
  });
}


/**
 * 날짜 필터 범위 지정
 */
function setDateFilterRange(
  rows,
  dateIndex
) {
  const dates =
    rows
      .map(row =>
        normalizeAppDate(
          row[dateIndex]
        )
      )
      .filter(Boolean)
      .sort();

  if (
    dates.length === 0
  ) {
    return;
  }

  const minimumDate =
    dates[0];

  const maximumDate =
    dates[
      dates.length - 1
    ];

  const startDate =
    document.getElementById(
      'startDate'
    );

  const endDate =
    document.getElementById(
      'endDate'
    );

  if (startDate) {
    startDate.min =
      minimumDate;

    startDate.max =
      maximumDate;

    startDate.dataset
      .defaultValue =
      minimumDate;

    startDate.value =
      minimumDate;
  }

  if (endDate) {
    endDate.min =
      minimumDate;

    endDate.max =
      maximumDate;

    endDate.dataset
      .defaultValue =
      maximumDate;

    endDate.value =
      maximumDate;
  }
}


/**
 * 날짜 기본값 복원
 */
function restoreDefaultDates() {
  const startDate =
    document.getElementById(
      'startDate'
    );

  const endDate =
    document.getElementById(
      'endDate'
    );

  if (startDate) {
    startDate.value =
      startDate.dataset
        .defaultValue || '';
  }

  if (endDate) {
    endDate.value =
      endDate.dataset
        .defaultValue || '';
  }
}


/**
 * 상태 표시
 */
function setDashboardStatus(
  status,
  message
) {
  const statusBox =
    document.getElementById(
      'statusBox'
    );

  if (!statusBox) {
    return;
  }

  statusBox.className =
    'status-box ' +
    status;

  statusBox.textContent =
    message;
}


/**
 * 미리보기 행 생성
 */
function appendPreviewRow(
  tableBody,
  values
) {
  const row =
    document.createElement(
      'tr'
    );

  values.forEach(value => {
    const cell =
      document.createElement(
        'td'
      );

    cell.textContent =
      value;

    row.appendChild(
      cell
    );
  });

  tableBody.appendChild(
    row
  );
}


/**
 * 중복 제거 후 정렬
 */
function getUniqueSortedValues(
  rows,
  columnIndex
) {
  if (
    columnIndex === -1
  ) {
    return [];
  }

  return [
    ...new Set(
      rows
        .map(row =>
          cleanAppCell(
            row[columnIndex]
          )
        )
        .filter(Boolean)
    )
  ].sort(
    (valueA, valueB) =>
      valueA.localeCompare(
        valueB,
        'ko'
      )
  );
}


/**
 * 날짜를 yyyy-mm-dd로 통일
 */
function normalizeAppDate(value) {
  const text =
    cleanAppCell(value);

  const match =
    text.match(
      /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/
    );

  if (!match) {
    return '';
  }

  return (
    match[1] +
    '-' +
    String(
      match[2]
    ).padStart(
      2,
      '0'
    ) +
    '-' +
    String(
      match[3]
    ).padStart(
      2,
      '0'
    )
  );
}


/**
 * 숫자 변환
 */
function appToNumber(value) {
  if (
    typeof value ===
      'number' &&
    Number.isFinite(value)
  ) {
    return value;
  }

  const number =
    Number(
      String(value || '')
        .replace(/"/g, '')
        .replace(/,/g, '')
        .replace(/원/g, '')
        .replace(/₩/g, '')
        .replace(/\s/g, '')
        .trim()
    );

  return Number.isFinite(
    number
  )
    ? number
    : 0;
}


/**
 * 문자 정리
 */
function cleanAppCell(value) {
  return String(value || '')
    .replace(/^"|"$/g, '')
    .trim();
}


/**
 * 숫자 표시
 */
function formatAppNumber(value) {
  return new Intl.NumberFormat(
    'ko-KR'
  ).format(value);
}


/**
 * 텍스트 설정
 */
function setText(
  elementId,
  value
) {
  const element =
    document.getElementById(
      elementId
    );

  if (element) {
    element.textContent =
      value;
  }
}


/**
 * 입력값 읽기
 */
function getElementValue(
  elementId
) {
  const element =
    document.getElementById(
      elementId
    );

  return element
    ? element.value || ''
    : '';
}


/**
 * 입력값 설정
 */
function setElementValue(
  elementId,
  value
) {
  const element =
    document.getElementById(
      elementId
    );

  if (element) {
    element.value =
      value;
  }
}


/**
 * 입력 지연 처리
 */
function debounce(
  callback,
  waitMilliseconds
) {
  let timerId;

  return function(...args) {
    clearTimeout(timerId);

    timerId = setTimeout(
      () =>
        callback.apply(
          this,
          args
        ),
      waitMilliseconds
    );
  };
}


/**
 * HTML과 외부 파일 로드 완료 후 시작
 */
document.addEventListener(
  'DOMContentLoaded',
  startDashboard
);
