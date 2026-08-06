/**
 * BOBO Dashboard V4 Final
 * 전체 제어, 필터, KPI, 탭, 리더보드
 */

let dashboardRows = [];
let filteredDashboardRows = [];
let dashboardEventsBound = false;

const selectedMonths = new Set();

const leaderboardState = {
  sortKey: 'sales',
  sortDirection: 'desc',
  search: '',
  limit: '50'
};


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

  if (
    Array.isArray(
      loadedData[0]
    )
  ) {
    return loadedData;
  }

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

  const defaultLimit =
    DASHBOARD_CONFIG.display &&
    DASHBOARD_CONFIG.display
      .leaderboardDefaultCount
      ? String(
          DASHBOARD_CONFIG.display
            .leaderboardDefaultCount
        )
      : '50';

  leaderboardState.limit =
    defaultLimit;

  setElementValue(
    'leaderboardLimit',
    defaultLimit
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

        if (
          selectedMonths.size > 0
        ) {
          const rowMonth =
            rowDate
              ? Number(
                  rowDate.slice(5, 7)
                )
              : 0;

          if (
            !selectedMonths.has(
              rowMonth
            )
          ) {
            return false;
          }
        }

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

  renderModelLeaderboard(
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

  const indexes = {
    date: headers.indexOf(
      DASHBOARD_CONFIG.columns.date
    ),

    market: headers.indexOf(
      DASHBOARD_CONFIG.columns.market
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

  const dataRows = rows.slice(1);

let totalSales = 0;
let totalQuantity = 0;
let yesterdayQuantity = 0;
let dayBeforeYesterdayQuantity = 0;

const modelSales = {};
const marketSales = {};

const yesterdayDateObject =
  new Date();

yesterdayDateObject.setDate(
  yesterdayDateObject.getDate() - 1
);

const yesterdayDate =
  formatDateInputValue(
    yesterdayDateObject
  );
  const dayBeforeYesterdayDateObject =
  new Date();

dayBeforeYesterdayDateObject.setDate(
  dayBeforeYesterdayDateObject.getDate() - 2
);

const dayBeforeYesterdayDate =
  formatDateInputValue(
    dayBeforeYesterdayDateObject
  );
  dataRows.forEach(row => {
    const quantity =
      appToNumber(
        row[indexes.quantity]
      );

    const sales =
      appToNumber(
        row[indexes.settlement]
      );

    const rowDate =
      normalizeAppDate(
        row[indexes.date]
      );

    const model =
      cleanAppCell(
        row[indexes.model]
      ) || '미분류';

    const market =
      cleanAppCell(
        row[indexes.market]
      ) || '미분류';

    totalQuantity += quantity;
    totalSales += sales;

if (rowDate === yesterdayDate) {
  yesterdayQuantity += quantity;
}
if (
  rowDate ===
  dayBeforeYesterdayDate
) {
  dayBeforeYesterdayQuantity +=
    quantity;
}
    modelSales[model] =
      (modelSales[model] || 0) +
      sales;

    marketSales[market] =
      (marketSales[market] || 0) +
      sales;
  });
const yesterdayQuantityChange =
  yesterdayQuantity -
  dayBeforeYesterdayQuantity;

const yesterdayQuantityChangeRate =
  dayBeforeYesterdayQuantity !== 0
    ? (
        yesterdayQuantityChange /
        dayBeforeYesterdayQuantity *
        100
      )
    : 0;
  const totalOrders = dataRows.length;

  const topModel =
    Object.entries(modelSales)
      .sort(
        (a, b) =>
          b[1] - a[1]
      )[0];

  const topMarket =
    Object.entries(marketSales)
      .sort(
        (a, b) =>
          b[1] - a[1]
      )[0];

  const topModelShare =
    topModel && totalSales !== 0
      ? topModel[1] / totalSales * 100
      : 0;

  const topMarketShare =
  topMarket && totalSales !== 0
    ? topMarket[1] / totalSales * 100
    : 0;

setText(
  'totalSales',
  formatCompactCurrency(
    totalSales
  )
);

setText(
  'totalSalesSub',
  formatAppCurrency(
    totalSales
  ) +
  ' · 총 ' +
  formatAppNumber(
    totalOrders
  ) +
  '건'
);

setText(
  'totalOrders',
  formatAppNumber(
    totalOrders
  ) +
  '건'
);

setText(
  'totalOrdersSub',
  '현재 필터 기준'
);

  setText(
    'totalQuantity',
    formatAppNumber(totalQuantity) +
      '개'
  );

  setText(
    'totalQuantitySub',
    '현재 필터 기준'
  );

  setText(
  'yesterdayOrders',
  formatAppNumber(
    yesterdayQuantity
  ) + '개'
);

const quantityChangeSymbol =
  yesterdayQuantityChange > 0
    ? '▲'
    : yesterdayQuantityChange < 0
      ? '▼'
      : '－';

setText(
  'yesterdayOrdersSub',
  '그저께 대비 ' +
  quantityChangeSymbol +
  ' ' +
  formatAppNumber(
    Math.abs(
      yesterdayQuantityChange
    )
  ) +
  '개 · ' +
  Math.abs(
    yesterdayQuantityChangeRate
  ).toFixed(1) +
  '%'
);
  setText(
    'topModel',
    topModel
      ? topModel[0]
      : '-'
  );

  setText(
    'topModelSub',
    topModel
      ? formatAppCurrency(topModel[1]) +
        ' · ' +
        topModelShare.toFixed(1) +
        '%'
      : '매출 기준'
  );

  setText(
    'topMarket',
    topMarket
      ? topMarket[0]
      : '-'
  );

  setText(
    'topMarketSub',
    topMarket
      ? formatAppCurrency(topMarket[1]) +
        ' · ' +
        topMarketShare.toFixed(1) +
        '%'
      : '매출 기준'
  );
}

/**
 * 전체 모델 리더보드
 */
function renderModelLeaderboard(
  rows
) {
  const body =
    document.getElementById(
      'modelLeaderboardBody'
    );

  if (!body) {
    return;
  }

  const headers =
    rows[0].map(
      cleanAppCell
    );

  const indexes = {
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

  const result = {};
  let totalSales = 0;

  rows
    .slice(1)
    .forEach(row => {
      const model =
        cleanAppCell(
          row[indexes.model]
        ) || '미분류';

      const category =
        cleanAppCell(
          row[indexes.category]
        ) || '미분류';

      const market =
        cleanAppCell(
          row[indexes.market]
        ) || '미분류';

      const quantity =
        appToNumber(
          row[indexes.quantity]
        );

      const sales =
        appToNumber(
          row[indexes.settlement]
        );

      totalSales += sales;

      if (!result[model]) {
        result[model] = {
          model,
          category,
          quantity: 0,
          sales: 0,
          markets: {}
        };
      }

      result[model].quantity +=
        quantity;

      result[model].sales +=
        sales;

      result[model]
        .markets[market] =
        (
          result[model]
            .markets[market] ||
          0
        ) +
        sales;
    });

  let items =
    Object.values(
      result
    ).map(item => {
      const topMarketEntry =
        Object.entries(
          item.markets
        ).sort(
          (a, b) =>
            b[1] - a[1]
        )[0];

      return {
        ...item,

        share:
          totalSales !== 0
            ? (
                item.sales /
                totalSales *
                100
              )
            : 0,

        averagePrice:
          item.quantity !== 0
            ? Math.round(
                item.sales /
                item.quantity
              )
            : 0,

        topMarket:
          topMarketEntry
            ? topMarketEntry[0]
            : '-'
      };
    });

  items.sort(
    (a, b) =>
      b.sales - a.sales
  );

  items.forEach(
    (item, index) => {
      item.rank =
        index + 1;
    }
  );

  const search =
    leaderboardState.search
      .trim()
      .toUpperCase();

  if (search) {
    items =
      items.filter(item =>
        item.model
          .toUpperCase()
          .includes(search)
      );
  }

  const direction =
    leaderboardState
      .sortDirection === 'asc'
      ? 1
      : -1;

  const key =
    leaderboardState.sortKey;

  items.sort((a, b) => {
    if (
      key === 'model' ||
      key === 'category' ||
      key === 'topMarket'
    ) {
      return (
        String(a[key] || '')
          .localeCompare(
            String(b[key] || ''),
            'ko'
          ) *
        direction
      );
    }

    return (
      (
        appToNumber(
          a[key]
        ) -
        appToNumber(
          b[key]
        )
      ) *
      direction
    );
  });

  const totalModelCount =
    Object.keys(
      result
    ).length;

  setText(
    'leaderboardCount',
    '총 ' +
    formatAppNumber(
      totalModelCount
    ) +
    '개 모델'
  );

  const limit =
    leaderboardState.limit ===
    'all'
      ? items.length
      : Number(
          leaderboardState.limit
        );

  const visibleItems =
    items.slice(
      0,
      limit
    );

  body.innerHTML = '';

  visibleItems.forEach(item => {
    const row =
      document.createElement(
        'tr'
      );

    const rankClass =
      item.rank <= 3
        ? ' rank-' +
          item.rank
        : '';

    row.innerHTML = `
      <td>
        <span class="rank-badge${rankClass}">
          ${item.rank}
        </span>
      </td>

      <td>
        <strong>
          ${escapeAppHtml(item.model)}
        </strong>
      </td>

      <td>
        <span class="category-badge">
          ${escapeAppHtml(item.category)}
        </span>
      </td>

      <td>
        <strong>
          ${formatAppCurrency(item.sales)}
        </strong>
      </td>

      <td>
        <span class="share-value">
          ${item.share.toFixed(1)}%
        </span>
      </td>

      <td>
        ${formatAppNumber(item.quantity)}개
      </td>

      <td>
        ${formatAppCurrency(item.averagePrice)}
      </td>

      <td>
        ${escapeAppHtml(item.topMarket)}
      </td>
    `;

    body.appendChild(
      row
    );
  });

  window
    .__BOBO_LEADERBOARD_DATA__ =
    items;
}


/**
 * 리더보드 CSV 다운로드
 */
function downloadLeaderboardCsv() {
  const items =
    window
      .__BOBO_LEADERBOARD_DATA__ ||
    [];

  if (
    items.length === 0
  ) {
    alert(
      '다운로드할 리더보드 데이터가 없습니다.'
    );

    return;
  }

  const csvRows = [
    [
      '순위',
      '모델명',
      '카테고리',
      '정산가 총매출',
      '매출 점유율',
      '판매수량',
      '평균 정산단가',
      '주력마켓'
    ],

    ...items.map(item => [
      item.rank,
      item.model,
      item.category,
      item.sales,
      item.share.toFixed(2) +
        '%',
      item.quantity,
      item.averagePrice,
      item.topMarket
    ])
  ];

  const csv =
    '\ufeff' +
    csvRows
      .map(row =>
        row
          .map(value => {
            const text =
              String(
                value ?? ''
              );

            return (
              '"' +
              text.replace(
                /"/g,
                '""'
              ) +
              '"'
            );
          })
          .join(',')
      )
      .join('\r\n');

  const blob =
    new Blob(
      [csv],
      {
        type:
          'text/csv;charset=utf-8;'
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      'a'
    );

  link.href = url;

  link.download =
    'BOBO_모델별_판매실적_' +
    new Date()
      .toISOString()
      .slice(0, 10) +
    '.csv';

  document.body.appendChild(
    link
  );

  link.click();
  link.remove();

  URL.revokeObjectURL(
    url
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

  selectedMonths.clear();
  restoreDefaultDates();

  document
    .querySelectorAll(
      '.month-button'
    )
    .forEach(button => {
      button.classList.remove(
        'active'
      );
    });

  const allButton =
    document.querySelector(
      '.month-button[data-month=""]'
    );

  if (allButton) {
    allButton.classList.add(
      'active'
    );
  }

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
      document.getElementById(
        id
      );

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

  document
    .querySelectorAll(
      '.month-button'
    )
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          applyMonthQuickFilter(
            button.dataset.month
          );
        }
      );
    });

  document
    .querySelectorAll(
      '.tab-button'
    )
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          activateDashboardTab(
            button.dataset.tab
          );
        }
      );
    });

  const leaderboardSearch =
    document.getElementById(
      'leaderboardSearch'
    );

  if (leaderboardSearch) {
    leaderboardSearch.addEventListener(
      'input',
      debounce(
        () => {
          leaderboardState.search =
            leaderboardSearch.value ||
            '';

          renderModelLeaderboard(
            filteredDashboardRows
          );
        },
        200
      )
    );
  }

  const leaderboardLimit =
    document.getElementById(
      'leaderboardLimit'
    );

  if (leaderboardLimit) {
    leaderboardLimit.addEventListener(
      'change',
      () => {
        leaderboardState.limit =
          leaderboardLimit.value;

        renderModelLeaderboard(
          filteredDashboardRows
        );
      }
    );
  }

  document
    .querySelectorAll(
      '.leaderboard-table th[data-sort-key]'
    )
    .forEach(header => {
      header.addEventListener(
        'click',
        () => {
          const key =
            header.dataset.sortKey;

          if (
            leaderboardState
              .sortKey === key
          ) {
            leaderboardState
              .sortDirection =
              leaderboardState
                .sortDirection ===
              'asc'
                ? 'desc'
                : 'asc';
          } else {
            leaderboardState
              .sortKey =
              key;

            leaderboardState
              .sortDirection =
              (
                key === 'model' ||
                key === 'category' ||
                key === 'topMarket'
              )
                ? 'asc'
                : 'desc';
          }

          renderModelLeaderboard(
            filteredDashboardRows
          );
        }
      );
    });

  const csvButton =
    document.getElementById(
      'downloadLeaderboardCsv'
    );

  if (csvButton) {
    csvButton.addEventListener(
      'click',
      downloadLeaderboardCsv
    );
  }
document
  .querySelectorAll(
    '.kpi-card-clickable[data-target-tab]'
  )
  .forEach(card => {
    const openTargetTab = () => {
      const targetTab =
        card.dataset.targetTab;

      if (!targetTab) {
        return;
      }

      activateDashboardTab(
        targetTab
      );

      const tabs =
        document.querySelector(
          '.dashboard-tabs'
        );

      if (tabs) {
        tabs.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    };

    card.addEventListener(
      'click',
      openTargetTab
    );

    card.addEventListener(
      'keydown',
      event => {
        if (
          event.key === 'Enter' ||
          event.key === ' '
        ) {
          event.preventDefault();
          openTargetTab();
        }
      }
    );
  });
  dashboardEventsBound = true;
}


/**
 * 탭 활성화
 */
function activateDashboardTab(
  tabName
) {
  document
    .querySelectorAll(
      '.tab-button'
    )
    .forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.tab ===
        tabName
      );
    });

  document
    .querySelectorAll(
      '.tab-panel'
    )
    .forEach(panel => {
      panel.classList.toggle(
        'active',
        panel.dataset
          .tabPanel ===
        tabName
      );
    });

  window.setTimeout(
    () => {
      if (
        typeof resizeDashboardCharts ===
        'function'
      ) {
        resizeDashboardCharts();
      }
    },
    50
  );
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

    option.value =
      value;

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
        .defaultValue ||
      '';
  }

  if (endDate) {
    endDate.value =
      endDate.dataset
        .defaultValue ||
      '';
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
  if (
    value instanceof Date &&
    !Number.isNaN(
      value.getTime()
    )
  ) {
    return formatDateInputValue(
      value
    );
  }

  const text =
    cleanAppCell(
      value
    );

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
      String(
        value ?? ''
      )
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
  return String(
    value ?? ''
  )
    .replace(
      /^"|"$/g,
      ''
    )
    .trim();
}


/**
 * 숫자 표시
 */
function formatAppNumber(value) {
  return new Intl
    .NumberFormat(
      'ko-KR'
    )
    .format(
      appToNumber(
        value
      )
    );
}


/**
 * 금액 표시
 */
function formatAppCurrency(value) {
  return (
    formatAppNumber(
      value
    ) +
    '원'
  );
}

/**
 * KPI용 축약 금액 표시
 */
function formatCompactCurrency(value) {
  const number = appToNumber(value);
  const absolute = Math.abs(number);

  if (absolute >= 100000000) {
    return (
      (number / 100000000).toLocaleString(
        'ko-KR',
        {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        }
      ) +
      '억원'
    );
  }

  if (absolute >= 10000) {
    return (
      Math.round(
        number / 10000
      ).toLocaleString('ko-KR') +
      '만원'
    );
  }

  return (
    formatAppNumber(number) +
    '원'
  );
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
    ? element.value ||
      ''
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
 * 월 다중 선택
 */
function applyMonthQuickFilter(
  selectedMonth
) {
  const allButton =
    document.querySelector(
      '.month-button[data-month=""]'
    );

  if (!selectedMonth) {
    selectedMonths.clear();

    document
      .querySelectorAll(
        '.month-button'
      )
      .forEach(button => {
        button.classList.remove(
          'active'
        );
      });

    if (allButton) {
      allButton.classList.add(
        'active'
      );
    }

    restoreDefaultDates();
    applyDashboardFilters();

    return;
  }

  const month =
    Number(
      selectedMonth
    );

  if (
    selectedMonths.has(
      month
    )
  ) {
    selectedMonths.delete(
      month
    );
  } else {
    selectedMonths.add(
      month
    );
  }

  const clickedButton =
    document.querySelector(
      `.month-button[data-month="${month}"]`
    );

  if (clickedButton) {
    clickedButton.classList.toggle(
      'active',
      selectedMonths.has(
        month
      )
    );
  }

  if (allButton) {
    allButton.classList.remove(
      'active'
    );
  }

  if (
    selectedMonths.size ===
    0
  ) {
    if (allButton) {
      allButton.classList.add(
        'active'
      );
    }

    restoreDefaultDates();
    applyDashboardFilters();

    return;
  }

  const sortedMonths =
    Array.from(
      selectedMonths
    ).sort(
      (a, b) =>
        a - b
    );

  const firstMonth =
    sortedMonths[0];

  const lastMonth =
    sortedMonths[
      sortedMonths.length - 1
    ];

  const endDateElement =
    document.getElementById(
      'endDate'
    );

  const referenceDate =
    endDateElement?.max ||
    endDateElement
      ?.dataset
      .defaultValue ||
    endDateElement?.value;

  const year =
    referenceDate
      ? Number(
          referenceDate.slice(
            0,
            4
          )
        )
      : new Date()
          .getFullYear();

  setElementValue(
    'startDate',
    formatDateInputValue(
      new Date(
        year,
        firstMonth - 1,
        1
      )
    )
  );

  setElementValue(
    'endDate',
    formatDateInputValue(
      new Date(
        year,
        lastMonth,
        0
      )
    )
  );

  applyDashboardFilters();
}


/**
 * 날짜 입력 형식
 */
function formatDateInputValue(
  date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
      1
    ).padStart(
      2,
      '0'
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    );

  return (
    year +
    '-' +
    month +
    '-' +
    day
  );
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
    clearTimeout(
      timerId
    );

    timerId =
      setTimeout(
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
 * HTML 안전 처리
 */
function escapeAppHtml(value) {
  return String(
    value ?? ''
  )
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );
}


/**
 * HTML과 외부 파일 로드 완료 후 시작
 */
document.addEventListener(
  'DOMContentLoaded',
  startDashboard
);
