/**
 * 보보 판매 Dashboard V2
 * charts.js 정리 완성본
 */

let monthlySalesChart = null;
let categorySalesChart = null;
let topModelChart = null;
let marketSalesChart = null;
let dailySalesChart = null;
let weekdaySalesChart = null;
let weeklySalesChart = null;

function renderDashboardCharts(rows) {
  if (!Array.isArray(rows) || rows.length < 1) {
    throw new Error('차트를 생성할 데이터가 없습니다.');
  }

  const headers = rows[0].map(cleanChartCell);

  const indexes = {
    date: headers.indexOf('주문일자'),
    market: headers.indexOf('마켓'),
    category: headers.indexOf('카테고리'),
    model: headers.indexOf('모델'),
    quantity: headers.indexOf('수량'),
    settlement: headers.indexOf('정산가')
  };

  const requiredColumns = [
    ['주문일자', indexes.date],
    ['마켓', indexes.market],
    ['카테고리', indexes.category],
    ['모델', indexes.model],
    ['수량', indexes.quantity],
    ['정산가', indexes.settlement]
  ];

  const missingColumns = requiredColumns
    .filter(([, index]) => index === -1)
    .map(([name]) => name);

  if (missingColumns.length > 0) {
    throw new Error('다음 열을 찾지 못했습니다: ' + missingColumns.join(', '));
  }

  const dataRows = rows.slice(1).filter(row =>
    Array.isArray(row) &&
    row.some(cell => cleanChartCell(cell) !== '')
  );

  const monthlySales = aggregateMonthlySales(
    dataRows, indexes.date, indexes.settlement
  );

  const categorySales = aggregateCategorySales(
    dataRows, indexes.category, indexes.settlement
  );

  const topModels = aggregateTopModels(
    dataRows, indexes.model, indexes.quantity, indexes.settlement
  );

  const marketSales = aggregateMarketSales(
    dataRows, indexes.market, indexes.quantity, indexes.settlement
  );

  const dailySales = aggregateDailySales(
    dataRows, indexes.date, indexes.quantity, indexes.settlement
  );

  const weekdaySales = aggregateWeekdaySales(
    dataRows, indexes.date, indexes.quantity, indexes.settlement
  );

  const weeklySales = aggregateWeeklySales(
    dataRows, indexes.date, indexes.quantity, indexes.settlement
  );

  renderMonthlySalesChart(monthlySales);
  renderCategorySalesChart(categorySales);
  renderTopModelChart(topModels);
  renderTopModelTable(topModels);
  renderMarketSalesChart(marketSales);
  renderMarketSalesTable(marketSales);
  renderDailySalesChart(dailySales);
  renderWeekdaySalesChart(weekdaySales);
  renderWeeklySalesChart(weeklySales);
}


function aggregateWeeklySales(rows, dateIndex, quantityIndex, settlementIndex) {
  const result = {};

  rows.forEach(row => {
    const dateKey = extractDateKey(row[dateIndex]);
    if (!dateKey) return;

    const weekStart = getWeekStartDate(dateKey);
    if (!weekStart) return;

    if (!result[weekStart]) {
      result[weekStart] = {
        week: weekStart,
        orders: 0,
        quantity: 0,
        sales: 0
      };
    }

    result[weekStart].orders += 1;
    result[weekStart].quantity += chartToNumber(row[quantityIndex]);
    result[weekStart].sales += chartToNumber(row[settlementIndex]);
  });

  return Object.values(result).sort(
    (a, b) => a.week.localeCompare(b.week)
  );
}

function aggregateMonthlySales(rows, dateIndex, settlementIndex) {
  const result = {};

  rows.forEach(row => {
    const monthKey = extractMonthKey(row[dateIndex]);
    if (!monthKey) return;

    result[monthKey] =
      (result[monthKey] || 0) +
      chartToNumber(row[settlementIndex]);
  });

  return Object.fromEntries(
    Object.entries(result).sort(([a], [b]) => a.localeCompare(b))
  );
}

function aggregateCategorySales(rows, categoryIndex, settlementIndex) {
  const result = {};

  rows.forEach(row => {
    const category = cleanChartCell(row[categoryIndex]) || '미분류';
    result[category] =
      (result[category] || 0) +
      chartToNumber(row[settlementIndex]);
  });

  return Object.fromEntries(
    Object.entries(result).sort(([, a], [, b]) => b - a)
  );
}

function aggregateTopModels(rows, modelIndex, quantityIndex, settlementIndex) {
  const result = {};

  rows.forEach(row => {
    const model = cleanChartCell(row[modelIndex]) || '미분류';

    if (!result[model]) {
      result[model] = { model, quantity: 0, sales: 0 };
    }

    result[model].quantity += chartToNumber(row[quantityIndex]);
    result[model].sales += chartToNumber(row[settlementIndex]);
  });

  return Object.values(result)
    .sort((a, b) =>
      b.quantity !== a.quantity
        ? b.quantity - a.quantity
        : b.sales - a.sales
    )
    .slice(0, 10);
}

function aggregateMarketSales(rows, marketIndex, quantityIndex, settlementIndex) {
  const result = {};

  rows.forEach(row => {
    const market = cleanChartCell(row[marketIndex]) || '미분류';

    if (!result[market]) {
      result[market] = { market, orders: 0, quantity: 0, sales: 0 };
    }

    result[market].orders += 1;
    result[market].quantity += chartToNumber(row[quantityIndex]);
    result[market].sales += chartToNumber(row[settlementIndex]);
  });

  return Object.values(result).sort((a, b) => b.sales - a.sales);
}

function aggregateDailySales(rows, dateIndex, quantityIndex, settlementIndex) {
  const result = {};

  rows.forEach(row => {
    const dateKey = extractDateKey(row[dateIndex]);
    if (!dateKey) return;

    if (!result[dateKey]) {
      result[dateKey] = { date: dateKey, orders: 0, quantity: 0, sales: 0 };
    }

    result[dateKey].orders += 1;
    result[dateKey].quantity += chartToNumber(row[quantityIndex]);
    result[dateKey].sales += chartToNumber(row[settlementIndex]);
  });

  return Object.values(result).sort((a, b) => a.date.localeCompare(b.date));
}

function aggregateWeekdaySales(rows, dateIndex, quantityIndex, settlementIndex) {
  const names = ['일', '월', '화', '수', '목', '금', '토'];

  const result = names.map((weekday, weekdayIndex) => ({
    weekday,
    weekdayIndex,
    orders: 0,
    quantity: 0,
    sales: 0
  }));

  rows.forEach(row => {
    const dateKey = extractDateKey(row[dateIndex]);
    if (!dateKey) return;

    const date = new Date(dateKey + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return;

    const index = date.getDay();
    result[index].orders += 1;
    result[index].quantity += chartToNumber(row[quantityIndex]);
    result[index].sales += chartToNumber(row[settlementIndex]);
  });

  return [result[1], result[2], result[3], result[4], result[5], result[6], result[0]];
}

function renderMonthlySalesChart(monthlySales) {
  const canvas = document.getElementById('monthlySalesChart');
  if (!canvas) return;

  destroyChart(monthlySalesChart);

  monthlySalesChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: Object.keys(monthlySales),
      datasets: [{
        label: '월별 매출',
        data: Object.values(monthlySales),
        borderWidth: 1,
        borderRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              return formatChartCurrency(context.raw);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback(value) {
              return formatChartAxis(value);
            }
          }
        }
      }
    }
  });
}

function renderCategorySalesChart(categorySales) {
  const canvas = document.getElementById('categorySalesChart');
  if (!canvas) return;

  destroyChart(categorySalesChart);

  categorySalesChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: Object.keys(categorySales),
      datasets: [{
        label: '카테고리별 매출',
        data: Object.values(categorySales),
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' },
        tooltip: {
          callbacks: {
            label(context) {
              return (context.label || '') + ': ' + formatChartCurrency(context.raw);
            }
          }
        }
      }
    }
  });
}

function renderTopModelChart(topModels) {
  const canvas = document.getElementById('topModelChart');
  if (!canvas) return;

  destroyChart(topModelChart);

  topModelChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: topModels.map(item => item.model),
      datasets: [{
        label: '판매수량',
        data: topModels.map(item => item.quantity),
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              const item = topModels[context.dataIndex];
              return [
                '판매수량: ' + formatChartNumber(item.quantity) + '개',
                '매출: ' + formatChartCurrency(item.sales)
              ];
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback(value) {
              return formatChartNumber(value);
            }
          }
        }
      }
    }
  });
}

function renderTopModelTable(topModels) {
  const body = document.getElementById('topModelBody');
  if (!body) return;

  body.innerHTML = '';

  topModels.forEach((item, index) => {
    const averagePrice =
      item.quantity > 0 ? Math.round(item.sales / item.quantity) : 0;

    appendTableRow(body, [
      index + 1,
      item.model,
      formatChartNumber(item.quantity),
      formatChartCurrency(item.sales),
      formatChartCurrency(averagePrice)
    ]);
  });
}

function renderMarketSalesChart(marketSales) {
  const canvas = document.getElementById('marketSalesChart');
  if (!canvas) return;

  destroyChart(marketSalesChart);

  const items = marketSales.slice(0, 15);

  marketSalesChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: items.map(item => item.market),
      datasets: [{
        label: '매출',
        data: items.map(item => item.sales),
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              const item = items[context.dataIndex];
              return [
                '매출: ' + formatChartCurrency(item.sales),
                '주문수: ' + formatChartNumber(item.orders) + '건',
                '판매수량: ' + formatChartNumber(item.quantity) + '개'
              ];
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback(value) {
              return formatChartAxis(value);
            }
          }
        }
      }
    }
  });
}

function renderMarketSalesTable(marketSales) {
  const body = document.getElementById('marketSalesBody');
  if (!body) return;

  body.innerHTML = '';

  marketSales.slice(0, 15).forEach((item, index) => {
    const averageOrderValue =
      item.orders > 0 ? Math.round(item.sales / item.orders) : 0;

    appendTableRow(body, [
      index + 1,
      item.market,
      formatChartNumber(item.orders),
      formatChartNumber(item.quantity),
      formatChartCurrency(item.sales),
      formatChartCurrency(averageOrderValue)
    ]);
  });
}

function renderDailySalesChart(dailySales) {
  const canvas = document.getElementById('dailySalesChart');
  if (!canvas) return;

  destroyChart(dailySalesChart);

  dailySalesChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: dailySales.map(item => item.date),
      datasets: [
        {
          label: '일별 매출',
          data: dailySales.map(item => item.sales),
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 5,
          fill: false,
          yAxisID: 'salesAxis'
        },
        {
          label: '판매수량',
          data: dailySales.map(item => item.quantity),
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 5,
          fill: false,
          yAxisID: 'quantityAxis'
        }
      ]
    },
    options: dualAxisOptions(dailySales)
  });
}

function renderWeekdaySalesChart(weekdaySales) {
  const canvas = document.getElementById('weekdaySalesChart');
  if (!canvas) return;

  destroyChart(weekdaySalesChart);

  weekdaySalesChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: weekdaySales.map(item => item.weekday + '요일'),
      datasets: [
        {
          label: '매출',
          data: weekdaySales.map(item => item.sales),
          borderWidth: 1,
          borderRadius: 7,
          yAxisID: 'salesAxis'
        },
        {
          label: '판매수량',
          data: weekdaySales.map(item => item.quantity),
          type: 'line',
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'quantityAxis'
        }
      ]
    },
    options: dualAxisOptions(weekdaySales)
  });
}


function renderWeeklySalesChart(weeklySales) {
  const canvas = document.getElementById('weeklySalesChart');
  if (!canvas) return;

  destroyChart(weeklySalesChart);

  weeklySalesChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: weeklySales.map(item => item.week),
      datasets: [
        {
          label: '주차별 매출',
          data: weeklySales.map(item => item.sales),
          borderWidth: 1,
          borderRadius: 7,
          yAxisID: 'salesAxis'
        },
        {
          label: '판매수량',
          data: weeklySales.map(item => item.quantity),
          type: 'line',
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 3,
          pointHoverRadius: 5,
          yAxisID: 'quantityAxis'
        }
      ]
    },
    options: dualAxisOptions(weeklySales)
  });
}

function dualAxisOptions(sourceItems) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          afterBody(context) {
            if (!context || context.length === 0) return [];

            const item = sourceItems[context[0].dataIndex];

            return [
              '주문수: ' + formatChartNumber(item.orders) + '건',
              '판매수량: ' + formatChartNumber(item.quantity) + '개',
              '매출: ' + formatChartCurrency(item.sales)
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
          callback(value) {
            return formatChartAxis(value);
          }
        }
      },
      quantityAxis: {
        type: 'linear',
        position: 'right',
        beginAtZero: true,
        grid: {
          drawOnChartArea: false
        },
        ticks: {
          callback(value) {
            return formatChartNumber(value) + '개';
          }
        }
      }
    }
  };
}

function appendTableRow(tableBody, values) {
  const row = document.createElement('tr');

  values.forEach(value => {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.appendChild(cell);
  });

  tableBody.appendChild(row);
}

function destroyChart(chartInstance) {
  if (chartInstance && typeof chartInstance.destroy === 'function') {
    chartInstance.destroy();
  }
}


function getWeekStartDate(dateKey) {
  const date = new Date(dateKey + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return '';

  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + diffToMonday);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(date.getDate()).padStart(2, '0');

  return year + '-' + month + '-' + dayOfMonth;
}

function extractMonthKey(value) {
  const match = cleanChartCell(value).match(/^(\d{4})[-./](\d{1,2})/);
  if (!match) return '';

  return match[1] + '-' + String(match[2]).padStart(2, '0');
}

function extractDateKey(value) {
  const match = cleanChartCell(value).match(
    /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/
  );

  if (!match) return '';

  return (
    match[1] +
    '-' +
    String(match[2]).padStart(2, '0') +
    '-' +
    String(match[3]).padStart(2, '0')
  );
}

function chartToNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const number = Number(
    String(value || '')
      .replace(/"/g, '')
      .replace(/,/g, '')
      .replace(/원/g, '')
      .replace(/₩/g, '')
      .replace(/\s/g, '')
      .trim()
  );

  return Number.isFinite(number) ? number : 0;
}

function cleanChartCell(value) {
  return String(value || '').replace(/^"|"$/g, '').trim();
}

function formatChartNumber(value) {
  return new Intl.NumberFormat('ko-KR').format(chartToNumber(value));
}

function formatChartCurrency(value) {
  return formatChartNumber(value) + '원';
}

function formatChartAxis(value) {
  const number = chartToNumber(value);

  if (Math.abs(number) >= 100000000) {
    return (
      (number / 100000000).toLocaleString('ko-KR', {
        maximumFractionDigits: 1
      }) + '억'
    );
  }

  if (Math.abs(number) >= 10000) {
    return Math.round(number / 10000).toLocaleString('ko-KR') + '만';
  }

  return formatChartNumber(number);
}
