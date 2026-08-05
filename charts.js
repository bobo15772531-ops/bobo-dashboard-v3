/**
 * BOBO Dashboard V4 Final
 * 차트 및 실적표 전체 완성본
 */

let monthlySalesChart = null;
let categorySalesChart = null;
let topModelChart = null;
let marketShareChart = null;

let dailySalesChart = null;
let weekdaySalesChart = null;
let weeklySalesChart = null;

let monthlyPerformanceChart = null;
let modelSalesRankingChart = null;

let marketSalesChart = null;
let marketShareDetailChart = null;


/**
 * 전체 차트 렌더링
 */
function renderDashboardCharts(
  rows
) {
  if (
    !Array.isArray(rows) ||
    rows.length < 1
  ) {
    throw new Error(
      '차트를 생성할 데이터가 없습니다.'
    );
  }

  const headers =
    rows[0].map(
      cleanChartCell
    );

  const indexes = {
    date:
      headers.indexOf(
        DASHBOARD_CONFIG
          .columns.date
      ),

    market:
      headers.indexOf(
        DASHBOARD_CONFIG
          .columns.market
      ),

    category:
      headers.indexOf(
        DASHBOARD_CONFIG
          .columns.category
      ),

    model:
      headers.indexOf(
        DASHBOARD_CONFIG
          .columns.model
      ),

    quantity:
      headers.indexOf(
        DASHBOARD_CONFIG
          .columns.quantity
      ),

    settlement:
      headers.indexOf(
        DASHBOARD_CONFIG
          .columns.settlement
      )
  };

  const requiredColumns = [
    [
      DASHBOARD_CONFIG
        .columns.date,
      indexes.date
    ],
    [
      DASHBOARD_CONFIG
        .columns.market,
      indexes.market
    ],
    [
      DASHBOARD_CONFIG
        .columns.category,
      indexes.category
    ],
    [
      DASHBOARD_CONFIG
        .columns.model,
      indexes.model
    ],
    [
      DASHBOARD_CONFIG
        .columns.quantity,
      indexes.quantity
    ],
    [
      DASHBOARD_CONFIG
        .columns.settlement,
      indexes.settlement
    ]
  ];

  const missingColumns =
    requiredColumns
      .filter(
        ([, index]) =>
          index === -1
      )
      .map(
        ([name]) =>
          name
      );

  if (
    missingColumns.length >
    0
  ) {
    throw new Error(
      '다음 열을 찾지 못했습니다: ' +
      missingColumns.join(', ')
    );
  }

  const dataRows =
    rows
      .slice(1)
      .filter(row =>
        Array.isArray(row) &&
        row.some(
          cell =>
            cleanChartCell(
              cell
            ) !== ''
        )
      );

  const monthlyPerformance =
    aggregateMonthlyPerformance(
      dataRows,
      indexes.date,
      indexes.quantity,
      indexes.settlement
    );

  const categorySales =
    aggregateCategorySales(
      dataRows,
      indexes.category,
      indexes.settlement
    );

  const models =
    aggregateModels(
      dataRows,
      indexes.model,
      indexes.category,
      indexes.quantity,
      indexes.settlement
    );

  const marketSales =
    aggregateMarketSales(
      dataRows,
      indexes.market,
      indexes.quantity,
      indexes.settlement
    );

  const dailySales =
    aggregateDailySales(
      dataRows,
      indexes.date,
      indexes.quantity,
      indexes.settlement
    );

  const weekdaySales =
    aggregateWeekdaySales(
      dataRows,
      indexes.date,
      indexes.quantity,
      indexes.settlement
    );

  const weeklySales =
    aggregateWeeklySales(
      dataRows,
      indexes.date,
      indexes.quantity,
      indexes.settlement
    );

  renderMonthlySalesGrowthChart(
    'monthlySalesChart',
    monthlyPerformance
  );

  renderMonthlySalesGrowthChart(
    'monthlyPerformanceChart',
    monthlyPerformance
  );

  renderCategorySalesChart(
    categorySales
  );

  const topModelCount =
    DASHBOARD_CONFIG.display &&
    DASHBOARD_CONFIG.display
      .topModelCount
      ? DASHBOARD_CONFIG.display
          .topModelCount
      : 10;

  const topQuantityModels =
    [...models]
      .sort(
        (a, b) =>
          b.quantity -
            a.quantity ||
          b.sales -
            a.sales
      )
      .slice(
        0,
        topModelCount
      );

  const topSalesModels =
    [...models]
      .sort(
        (a, b) =>
          b.sales -
            a.sales ||
          b.quantity -
            a.quantity
      )
      .slice(
        0,
        topModelCount
      );

  renderTopModelQuantityChart(
    topQuantityModels
  );

  renderModelSalesRankingChart(
    topSalesModels
  );

  renderTopModelTable(
    topSalesModels
  );

  renderMarketSalesChart(
    marketSales
  );

  renderMarketShareChart(
    'marketShareChart',
    marketSales
  );

  renderMarketShareChart(
    'marketShareDetailChart',
    marketSales
  );

  renderMarketSalesTable(
    marketSales
  );

  renderDailySalesChart(
    dailySales
  );

  renderWeekdaySalesChart(
    weekdaySales
  );

  renderWeeklySalesChart(
    weeklySales
  );

  renderMonthlyPerformanceTable(
    monthlyPerformance
  );
}


/**
 * 월별 집계 및 증감률
 */
function aggregateMonthlyPerformance(
  rows,
  dateIndex,
  quantityIndex,
  settlementIndex
) {
  const result = {};

  rows.forEach(row => {
    const monthKey =
      extractMonthKey(
        row[dateIndex]
      );

    if (!monthKey) {
      return;
    }

    if (!result[monthKey]) {
      result[monthKey] = {
        month: monthKey,
        orders: 0,
        quantity: 0,
        sales: 0,
        averagePrice: 0,
        growth: null
      };
    }

    result[monthKey].orders +=
      1;

    result[monthKey].quantity +=
      chartToNumber(
        row[quantityIndex]
      );

    result[monthKey].sales +=
      chartToNumber(
        row[settlementIndex]
      );
  });

  const items =
    Object.values(
      result
    ).sort(
      (a, b) =>
        a.month.localeCompare(
          b.month
        )
    );

  items.forEach(
    (item, index) => {
      item.averagePrice =
        item.quantity !== 0
          ? Math.round(
              item.sales /
              item.quantity
            )
          : 0;

      if (
        index === 0 ||
        items[index - 1]
          .sales === 0
      ) {
        item.growth =
          null;
      } else {
        item.growth =
          (
            (
              item.sales -
              items[index - 1]
                .sales
            ) /
            items[index - 1]
              .sales
          ) *
          100;
      }
    }
  );

  return items;
}


/**
 * 카테고리 매출
 */
function aggregateCategorySales(
  rows,
  categoryIndex,
  settlementIndex
) {
  const result = {};

  rows.forEach(row => {
    const category =
      cleanChartCell(
        row[categoryIndex]
      ) || '미분류';

    result[category] =
      (result[category] || 0) +
      chartToNumber(
        row[settlementIndex]
      );
  });

  return Object.entries(
    result
  )
    .map(
      ([
        category,
        sales
      ]) => ({
        category,
        sales
      })
    )
    .sort(
      (a, b) =>
        b.sales - a.sales
    );
}


/**
 * 모델 집계
 */
function aggregateModels(
  rows,
  modelIndex,
  categoryIndex,
  quantityIndex,
  settlementIndex
) {
  const result = {};

  rows.forEach(row => {
    const model =
      cleanChartCell(
        row[modelIndex]
      ) || '미분류';

    const category =
      cleanChartCell(
        row[categoryIndex]
      ) || '미분류';

    if (!result[model]) {
      result[model] = {
        model,
        category,
        quantity: 0,
        sales: 0
      };
    }

    result[model].quantity +=
      chartToNumber(
        row[quantityIndex]
      );

    result[model].sales +=
      chartToNumber(
        row[settlementIndex]
      );
  });

  return Object.values(
    result
  );
}


/**
 * 마켓 집계 및 매출비중
 */
function aggregateMarketSales(
  rows,
  marketIndex,
  quantityIndex,
  settlementIndex
) {
  const result = {};
  let totalSales = 0;

  rows.forEach(row => {
    const market =
      cleanChartCell(
        row[marketIndex]
      ) || '미분류';

    const sales =
      chartToNumber(
        row[settlementIndex]
      );

    totalSales +=
      sales;

    if (!result[market]) {
      result[market] = {
        market,
        orders: 0,
        quantity: 0,
        sales: 0,
        share: 0
      };
    }

    result[market].orders +=
      1;

    result[market].quantity +=
      chartToNumber(
        row[quantityIndex]
      );

    result[market].sales +=
      sales;
  });

  return Object.values(
    result
  )
    .map(item => ({
      ...item,

      share:
        totalSales !== 0
          ? (
              item.sales /
              totalSales *
              100
            )
          : 0
    }))
    .sort(
      (a, b) =>
        b.sales - a.sales
    );
}


/**
 * 일별 집계
 */
function aggregateDailySales(
  rows,
  dateIndex,
  quantityIndex,
  settlementIndex
) {
  const result = {};

  rows.forEach(row => {
    const dateKey =
      extractDateKey(
        row[dateIndex]
      );

    if (!dateKey) {
      return;
    }

    if (!result[dateKey]) {
      result[dateKey] = {
        date: dateKey,
        orders: 0,
        quantity: 0,
        sales: 0
      };
    }

    result[dateKey].orders +=
      1;

    result[dateKey].quantity +=
      chartToNumber(
        row[quantityIndex]
      );

    result[dateKey].sales +=
      chartToNumber(
        row[settlementIndex]
      );
  });

  return Object.values(
    result
  ).sort(
    (a, b) =>
      a.date.localeCompare(
        b.date
      )
  );
}


/**
 * 요일별 집계
 */
function aggregateWeekdaySales(
  rows,
  dateIndex,
  quantityIndex,
  settlementIndex
) {
  const names = [
    '일',
    '월',
    '화',
    '수',
    '목',
    '금',
    '토'
  ];

  const result =
    names.map(
      (
        weekday,
        weekdayIndex
      ) => ({
        weekday,
        weekdayIndex,
        orders: 0,
        quantity: 0,
        sales: 0
      })
    );

  rows.forEach(row => {
    const dateKey =
      extractDateKey(
        row[dateIndex]
      );

    if (!dateKey) {
      return;
    }

    const date =
      new Date(
        dateKey +
        'T00:00:00'
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return;
    }

    const index =
      date.getDay();

    result[index].orders +=
      1;

    result[index].quantity +=
      chartToNumber(
        row[quantityIndex]
      );

    result[index].sales +=
      chartToNumber(
        row[settlementIndex]
      );
  });

  return [
    result[1],
    result[2],
    result[3],
    result[4],
    result[5],
    result[6],
    result[0]
  ];
}


/**
 * 주차별 집계
 */
function aggregateWeeklySales(
  rows,
  dateIndex,
  quantityIndex,
  settlementIndex
) {
  const result = {};

  rows.forEach(row => {
    const dateKey =
      extractDateKey(
        row[dateIndex]
      );

    if (!dateKey) {
      return;
    }

    const weekStart =
      getWeekStartDate(
        dateKey
      );

    if (!weekStart) {
      return;
    }

    if (!result[weekStart]) {
      result[weekStart] = {
        week: weekStart,
        orders: 0,
        quantity: 0,
        sales: 0
      };
    }

    result[weekStart].orders +=
      1;

    result[weekStart].quantity +=
      chartToNumber(
        row[quantityIndex]
      );

    result[weekStart].sales +=
      chartToNumber(
        row[settlementIndex]
      );
  });

  return Object.values(
    result
  ).sort(
    (a, b) =>
      a.week.localeCompare(
        b.week
      )
  );
}


/**
 * 월별 매출 + 증감률 차트
 */
function renderMonthlySalesGrowthChart(
  canvasId,
  items
) {
  const canvas =
    document.getElementById(
      canvasId
    );

  if (!canvas) {
    return;
  }

  if (
    canvasId ===
    'monthlySalesChart'
  ) {
    destroyChart(
      monthlySalesChart
    );
  } else {
    destroyChart(
      monthlyPerformanceChart
    );
  }

  const chart =
    new Chart(
      canvas,
      {
        data: {
          labels:
            items.map(
              item =>
                item.month
            ),

          datasets: [
            {
              type: 'bar',
              label: '월별 매출',
              data:
                items.map(
                  item =>
                    item.sales
                ),
              borderWidth: 1,
              borderRadius: 7,
              yAxisID:
                'salesAxis'
            },
            {
              type: 'line',
              label: '전월 대비',
              data:
                items.map(
                  item =>
                    item.growth
                ),
              borderWidth: 2,
              tension: 0.25,
              pointRadius: 4,
              pointHoverRadius: 6,
              spanGaps: true,
              yAxisID:
                'growthAxis'
            }
          ]
        },

        options: {
          responsive: true,
          maintainAspectRatio:
            false,

          interaction: {
            mode: 'index',
            intersect: false
          },

          plugins: {
            legend: {
              position:
                'top'
            },

            tooltip: {
              callbacks: {
                label(
                  context
                ) {
                  if (
                    context.dataset
                      .yAxisID ===
                    'growthAxis'
                  ) {
                    return (
                      context.dataset
                        .label +
                      ': ' +
                      (
                        context.raw ===
                        null
                          ? '-'
                          : formatGrowthPercent(
                              context.raw
                            )
                      )
                    );
                  }

                  return (
                    context.dataset
                      .label +
                    ': ' +
                    formatChartCurrency(
                      context.raw
                    )
                  );
                }
              }
            }
          },

          scales: {
            salesAxis: {
              type: 'linear',
              position: 'left',
              beginAtZero:
                true,

              ticks: {
                callback(
                  value
                ) {
                  return formatChartAxis(
                    value
                  );
                }
              }
            },

            growthAxis: {
              type: 'linear',
              position: 'right',

              grid: {
                drawOnChartArea:
                  false
              },

              ticks: {
                callback(
                  value
                ) {
                  return (
                    value +
                    '%'
                  );
                }
              }
            }
          }
        }
      }
    );

  if (
    canvasId ===
    'monthlySalesChart'
  ) {
    monthlySalesChart =
      chart;
  } else {
    monthlyPerformanceChart =
      chart;
  }
}


/**
 * 카테고리 도넛
 */
function renderCategorySalesChart(
  items
) {
  const canvas =
    document.getElementById(
      'categorySalesChart'
    );

  if (!canvas) {
    return;
  }

  destroyChart(
    categorySalesChart
  );

  categorySalesChart =
    new Chart(
      canvas,
      {
        type: 'doughnut',

        data: {
          labels:
            items.map(
              item =>
                item.category
            ),

          datasets: [
            {
              label:
                '카테고리별 매출',

              data:
                items.map(
                  item =>
                    item.sales
                ),

              borderWidth: 2
            }
          ]
        },

        options: {
          responsive: true,
          maintainAspectRatio:
            false,

          cutout: '52%',

          plugins: {
            legend: {
              position:
                'right'
            },

            tooltip: {
              callbacks: {
                label(
                  context
                ) {
                  return (
                    (
                      context.label ||
                      ''
                    ) +
                    ': ' +
                    formatChartCurrency(
                      context.raw
                    )
                  );
                }
              }
            }
          }
        }
      }
    );
}


/**
 * TOP 모델 판매수량
 */
function renderTopModelQuantityChart(
  items
) {
  const canvas =
    document.getElementById(
      'topModelChart'
    );

  if (!canvas) {
    return;
  }

  destroyChart(
    topModelChart
  );

  topModelChart =
    new Chart(
      canvas,
      {
        type: 'bar',

        data: {
          labels:
            items.map(
              item =>
                item.model
            ),

          datasets: [
            {
              label:
                '판매수량',

              data:
                items.map(
                  item =>
                    item.quantity
                ),

              borderWidth: 1,
              borderRadius: 6
            }
          ]
        },

        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio:
            false,

          plugins: {
            legend: {
              display: false
            },

            tooltip: {
              callbacks: {
                label(
                  context
                ) {
                  const item =
                    items[
                      context
                        .dataIndex
                    ];

                  return [
                    '판매수량: ' +
                    formatChartNumber(
                      item.quantity
                    ) +
                    '개',

                    '매출: ' +
                    formatChartCurrency(
                      item.sales
                    )
                  ];
                }
              }
            }
          },

          scales: {
            x: {
              beginAtZero:
                true,

              ticks: {
                callback(
                  value
                ) {
                  return formatChartNumber(
                    value
                  );
                }
              }
            }
          }
        }
      }
    );
}


/**
 * TOP 모델 매출
 */
function renderModelSalesRankingChart(
  items
) {
  const canvas =
    document.getElementById(
      'modelSalesRankingChart'
    );

  if (!canvas) {
    return;
  }

  destroyChart(
    modelSalesRankingChart
  );

  modelSalesRankingChart =
    new Chart(
      canvas,
      {
        type: 'bar',

        data: {
          labels:
            items.map(
              item =>
                item.model
            ),

          datasets: [
            {
              label:
                '정산가 매출',

              data:
                items.map(
                  item =>
                    item.sales
                ),

              borderWidth: 1,
              borderRadius: 6
            }
          ]
        },

        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio:
            false,

          plugins: {
            legend: {
              display: false
            },

            tooltip: {
              callbacks: {
                label(
                  context
                ) {
                  return formatChartCurrency(
                    context.raw
                  );
                }
              }
            }
          },

          scales: {
            x: {
              beginAtZero:
                true,

              ticks: {
                callback(
                  value
                ) {
                  return formatChartAxis(
                    value
                  );
                }
              }
            }
          }
        }
      }
    );
}


/**
 * TOP 모델 표
 */
function renderTopModelTable(
  items
) {
  const body =
    document.getElementById(
      'topModelBody'
    );

  if (!body) {
    return;
  }

  body.innerHTML = '';

  items.forEach(
    (item, index) => {
      const averagePrice =
        item.quantity !== 0
          ? Math.round(
              item.sales /
              item.quantity
            )
          : 0;

      const row =
        document.createElement(
          'tr'
        );

      const rankClass =
        index < 3
          ? ' rank-' +
            (index + 1)
          : '';

      row.innerHTML = `
        <td>
          <span class="rank-badge${rankClass}">
            ${index + 1}
          </span>
        </td>

        <td>
          <strong>
            ${escapeChartHtml(item.model)}
          </strong>
        </td>

        <td>
          <span class="category-badge">
            ${escapeChartHtml(item.category)}
          </span>
        </td>

        <td>
          ${formatChartNumber(item.quantity)}개
        </td>

        <td>
          <strong>
            ${formatChartCurrency(item.sales)}
          </strong>
        </td>

        <td>
          ${formatChartCurrency(averagePrice)}
        </td>
      `;

      body.appendChild(
        row
      );
    }
  );
}


/**
 * 마켓 매출 막대
 */
function renderMarketSalesChart(
  items
) {
  const canvas =
    document.getElementById(
      'marketSalesChart'
    );

  if (!canvas) {
    return;
  }

  destroyChart(
    marketSalesChart
  );

  const topMarketCount =
    DASHBOARD_CONFIG.display &&
    DASHBOARD_CONFIG.display
      .topMarketCount
      ? DASHBOARD_CONFIG.display
          .topMarketCount
      : 15;

  const topItems =
    items.slice(
      0,
      topMarketCount
    );

  marketSalesChart =
    new Chart(
      canvas,
      {
        type: 'bar',

        data: {
          labels:
            topItems.map(
              item =>
                item.market
            ),

          datasets: [
            {
              label:
                '매출',

              data:
                topItems.map(
                  item =>
                    item.sales
                ),

              borderWidth: 1,
              borderRadius: 6
            }
          ]
        },

        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio:
            false,

          plugins: {
            legend: {
              display: false
            },

            tooltip: {
              callbacks: {
                label(
                  context
                ) {
                  const item =
                    topItems[
                      context
                        .dataIndex
                    ];

                  return [
                    '매출: ' +
                    formatChartCurrency(
                      item.sales
                    ),

                    '매출비중: ' +
                    item.share
                      .toFixed(1) +
                    '%',

                    '주문수: ' +
                    formatChartNumber(
                      item.orders
                    ) +
                    '건',

                    '판매수량: ' +
                    formatChartNumber(
                      item.quantity
                    ) +
                    '개'
                  ];
                }
              }
            }
          },

          scales: {
            x: {
              beginAtZero:
                true,

              ticks: {
                callback(
                  value
                ) {
                  return formatChartAxis(
                    value
                  );
                }
              }
            }
          }
        }
      }
    );
}


/**
 * 마켓 매출 비중 도넛
 */
function renderMarketShareChart(
  canvasId,
  items
) {
  const canvas =
    document.getElementById(
      canvasId
    );

  if (!canvas) {
    return;
  }

  if (
    canvasId ===
    'marketShareChart'
  ) {
    destroyChart(
      marketShareChart
    );
  } else {
    destroyChart(
      marketShareDetailChart
    );
  }

  const topItems =
    items.slice(
      0,
      10
    );

  const chart =
    new Chart(
      canvas,
      {
        type: 'doughnut',

        data: {
          labels:
            topItems.map(
              item =>
                item.market
            ),

          datasets: [
            {
              label:
                '마켓 매출비중',

              data:
                topItems.map(
                  item =>
                    item.sales
                ),

              borderWidth: 2
            }
          ]
        },

        options: {
          responsive: true,
          maintainAspectRatio:
            false,

          cutout: '52%',

          plugins: {
            legend: {
              position:
                'right'
            },

            tooltip: {
              callbacks: {
                label(
                  context
                ) {
                  const item =
                    topItems[
                      context
                        .dataIndex
                    ];

                  return (
                    item.market +
                    ': ' +
                    formatChartCurrency(
                      item.sales
                    ) +
                    ' (' +
                    item.share
                      .toFixed(1) +
                    '%)'
                  );
                }
              }
            }
          }
        }
      }
    );

  if (
    canvasId ===
    'marketShareChart'
  ) {
    marketShareChart =
      chart;
  } else {
    marketShareDetailChart =
      chart;
  }
}


/**
 * 마켓 실적표
 */
function renderMarketSalesTable(
  items
) {
  const body =
    document.getElementById(
      'marketSalesBody'
    );

  if (!body) {
    return;
  }

  body.innerHTML = '';

  const topMarketCount =
    DASHBOARD_CONFIG.display &&
    DASHBOARD_CONFIG.display
      .topMarketCount
      ? DASHBOARD_CONFIG.display
          .topMarketCount
      : 15;

  items
    .slice(
      0,
      topMarketCount
    )
    .forEach(
      (item, index) => {
        const averageOrderValue =
          item.orders !== 0
            ? Math.round(
                item.sales /
                item.orders
              )
            : 0;

        const row =
          document.createElement(
            'tr'
          );

        const rankClass =
          index < 3
            ? ' rank-' +
              (index + 1)
            : '';

        row.innerHTML = `
          <td>
            <span class="rank-badge${rankClass}">
              ${index + 1}
            </span>
          </td>

          <td>
            <strong>
              ${escapeChartHtml(item.market)}
            </strong>
          </td>

          <td>
            ${formatChartNumber(item.orders)}건
          </td>

          <td>
            ${formatChartNumber(item.quantity)}개
          </td>

          <td>
            <strong>
              ${formatChartCurrency(item.sales)}
            </strong>
          </td>

          <td>
            <span class="share-value">
              ${item.share.toFixed(1)}%
            </span>
          </td>

          <td>
            ${formatChartCurrency(averageOrderValue)}
          </td>
        `;

        body.appendChild(
          row
        );
      }
    );
}


/**
 * 월별 실적표
 */
function renderMonthlyPerformanceTable(
  items
) {
  const body =
    document.getElementById(
      'monthlyPerformanceBody'
    );

  if (!body) {
    return;
  }

  body.innerHTML = '';

  items.forEach(item => {
    const row =
      document.createElement(
        'tr'
      );

    let growthText = '-';
    let growthClass =
      'growth-flat';

    if (
      item.growth !== null
    ) {
      growthText =
        formatGrowthPercent(
          item.growth
        );

      growthClass =
        item.growth > 0
          ? 'growth-up'
          : item.growth < 0
            ? 'growth-down'
            : 'growth-flat';
    }

    row.innerHTML = `
      <td>
        <strong>
          ${item.month}
        </strong>
      </td>

      <td>
        ${formatChartNumber(item.orders)}건
      </td>

      <td>
        ${formatChartNumber(item.quantity)}개
      </td>

      <td>
        <strong>
          ${formatChartCurrency(item.sales)}
        </strong>
      </td>

      <td>
        ${formatChartCurrency(item.averagePrice)}
      </td>

      <td>
        <span class="${growthClass}">
          ${growthText}
        </span>
      </td>
    `;

    body.appendChild(
      row
    );
  });

  const count =
    document.getElementById(
      'monthlyPerformanceCount'
    );

  if (count) {
    count.textContent =
      formatChartNumber(
        items.length
      ) +
      '개월';
  }
}


/**
 * 일별 차트
 */
function renderDailySalesChart(
  items
) {
  const canvas =
    document.getElementById(
      'dailySalesChart'
    );

  if (!canvas) {
    return;
  }

  destroyChart(
    dailySalesChart
  );

  dailySalesChart =
    new Chart(
      canvas,
      {
        type: 'line',

        data: {
          labels:
            items.map(
              item =>
                item.date
            ),

          datasets: [
            {
              label:
                '일별 매출',

              data:
                items.map(
                  item =>
                    item.sales
                ),

              borderWidth: 2,
              tension: 0.25,
              pointRadius: 2,
              pointHoverRadius: 5,
              fill: false,
              yAxisID:
                'salesAxis'
            },
            {
              label:
                '판매수량',

              data:
                items.map(
                  item =>
                    item.quantity
                ),

              borderWidth: 2,
              tension: 0.25,
              pointRadius: 2,
              pointHoverRadius: 5,
              fill: false,
              yAxisID:
                'quantityAxis'
            }
          ]
        },

        options:
          dualAxisOptions(
            items
          )
      }
    );
}


/**
 * 요일별 차트
 */
function renderWeekdaySalesChart(
  items
) {
  const canvas =
    document.getElementById(
      'weekdaySalesChart'
    );

  if (!canvas) {
    return;
  }

  destroyChart(
    weekdaySalesChart
  );

  weekdaySalesChart =
    new Chart(
      canvas,
      {
        type: 'bar',

        data: {
          labels:
            items.map(
              item =>
                item.weekday +
                '요일'
            ),

          datasets: [
            {
              label:
                '매출',

              data:
                items.map(
                  item =>
                    item.sales
                ),

              borderWidth: 1,
              borderRadius: 7,
              yAxisID:
                'salesAxis'
            },
            {
              label:
                '판매수량',

              data:
                items.map(
                  item =>
                    item.quantity
                ),

              type: 'line',
              borderWidth: 2,
              tension: 0.25,
              pointRadius: 4,
              pointHoverRadius: 6,
              yAxisID:
                'quantityAxis'
            }
          ]
        },

        options:
          dualAxisOptions(
            items
          )
      }
    );
}


/**
 * 주차별 차트
 */
function renderWeeklySalesChart(
  items
) {
  const canvas =
    document.getElementById(
      'weeklySalesChart'
    );

  if (!canvas) {
    return;
  }

  destroyChart(
    weeklySalesChart
  );

  weeklySalesChart =
    new Chart(
      canvas,
      {
        type: 'bar',

        data: {
          labels:
            items.map(
              item =>
                item.week
            ),

          datasets: [
            {
              label:
                '주차별 매출',

              data:
                items.map(
                  item =>
                    item.sales
                ),

              borderWidth: 1,
              borderRadius: 7,
              yAxisID:
                'salesAxis'
            },
            {
              label:
                '판매수량',

              data:
                items.map(
                  item =>
                    item.quantity
                ),

              type: 'line',
              borderWidth: 2,
              tension: 0.25,
              pointRadius: 3,
              pointHoverRadius: 5,
              yAxisID:
                'quantityAxis'
            }
          ]
        },

        options:
          dualAxisOptions(
            items
          )
      }
    );
}


/**
 * 이중축 공통 옵션
 */
function dualAxisOptions(
  sourceItems
) {
  return {
    responsive: true,
    maintainAspectRatio:
      false,

    interaction: {
      mode: 'index',
      intersect: false
    },

    plugins: {
      legend: {
        position: 'top'
      },

      tooltip: {
        callbacks: {
          afterBody(
            context
          ) {
            if (
              !context ||
              context.length === 0
            ) {
              return [];
            }

            const item =
              sourceItems[
                context[0]
                  .dataIndex
              ];

            return [
              '주문수: ' +
              formatChartNumber(
                item.orders
              ) +
              '건',

              '판매수량: ' +
              formatChartNumber(
                item.quantity
              ) +
              '개',

              '매출: ' +
              formatChartCurrency(
                item.sales
              )
            ];
          }
        }
      }
    },

    scales: {
      salesAxis: {
        type: 'linear',
        position: 'left',
        beginAtZero: true,

        ticks: {
          callback(
            value
          ) {
            return formatChartAxis(
              value
            );
          }
        }
      },

      quantityAxis: {
        type: 'linear',
        position: 'right',
        beginAtZero: true,

        grid: {
          drawOnChartArea:
            false
        },

        ticks: {
          callback(
            value
          ) {
            return (
              formatChartNumber(
                value
              ) +
              '개'
            );
          }
        }
      }
    }
  };
}


/**
 * 숨겨진 탭 차트 크기 재계산
 */
function resizeDashboardCharts() {
  [
    monthlySalesChart,
    categorySalesChart,
    topModelChart,
    marketShareChart,

    dailySalesChart,
    weekdaySalesChart,
    weeklySalesChart,

    monthlyPerformanceChart,
    modelSalesRankingChart,

    marketSalesChart,
    marketShareDetailChart
  ].forEach(chart => {
    if (
      chart &&
      typeof chart.resize ===
        'function'
    ) {
      chart.resize();
    }
  });
}


/**
 * 기존 차트 제거
 */
function destroyChart(
  chartInstance
) {
  if (
    chartInstance &&
    typeof chartInstance
      .destroy ===
      'function'
  ) {
    chartInstance.destroy();
  }
}


/**
 * 주 시작일
 */
function getWeekStartDate(
  dateKey
) {
  const date =
    new Date(
      dateKey +
      'T00:00:00'
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  const day =
    date.getDay();

  const diffToMonday =
    day === 0
      ? -6
      : 1 - day;

  date.setDate(
    date.getDate() +
    diffToMonday
  );

  return (
    date.getFullYear() +
    '-' +
    String(
      date.getMonth() +
      1
    ).padStart(
      2,
      '0'
    ) +
    '-' +
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    )
  );
}


/**
 * 월 추출
 */
function extractMonthKey(
  value
) {
  const match =
    cleanChartCell(
      value
    ).match(
      /^(\d{4})[-./](\d{1,2})/
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
    )
  );
}


/**
 * 날짜 추출
 */
function extractDateKey(
  value
) {
  const match =
    cleanChartCell(
      value
    ).match(
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
function chartToNumber(
  value
) {
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
function cleanChartCell(
  value
) {
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
function formatChartNumber(
  value
) {
  return new Intl
    .NumberFormat(
      'ko-KR'
    )
    .format(
      chartToNumber(
        value
      )
    );
}


/**
 * 금액 표시
 */
function formatChartCurrency(
  value
) {
  return (
    formatChartNumber(
      value
    ) +
    '원'
  );
}


/**
 * 차트 축 금액 단위
 */
function formatChartAxis(
  value
) {
  const number =
    chartToNumber(
      value
    );

  if (
    Math.abs(number) >=
    100000000
  ) {
    return (
      (
        number /
        100000000
      ).toLocaleString(
        'ko-KR',
        {
          maximumFractionDigits:
            1
        }
      ) +
      '억'
    );
  }

  if (
    Math.abs(number) >=
    10000
  ) {
    return (
      Math.round(
        number /
        10000
      ).toLocaleString(
        'ko-KR'
      ) +
      '만'
    );
  }

  return formatChartNumber(
    number
  );
}


/**
 * 증감률 표시
 */
function formatGrowthPercent(
  value
) {
  const number =
    Number(
      value
    );

  if (
    !Number.isFinite(
      number
    )
  ) {
    return '-';
  }

  if (number > 0) {
    return (
      '▲ ' +
      Math.abs(number)
        .toFixed(1) +
      '%'
    );
  }

  if (number < 0) {
    return (
      '▼ ' +
      Math.abs(number)
        .toFixed(1) +
      '%'
    );
  }

  return '0.0%';
}


/**
 * HTML 안전 처리
 */
function escapeChartHtml(
  value
) {
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
