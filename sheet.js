/**
 * BOBO Dashboard V4 Final
 * Google Apps Script 데이터 연결
 */

async function loadDashboardData() {
  const apiUrl =
    DASHBOARD_CONFIG.dataSource.apiUrl;

  if (!apiUrl) {
    throw new Error(
      'config.js에 API 주소가 없습니다.'
    );
  }

  const requestUrl =
  apiUrl +
  (
    apiUrl.includes('?')
      ? '&'
      : '?'
  ) +
  'timestamp=' +
  Date.now();

const response = await fetch(
  requestUrl,
  {
    method: 'GET',
    cache: 'no-store'
  }
);


  if (!response.ok) {
    throw new Error(
      '데이터 응답 오류: ' +
      response.status
    );
  }

  let result;

  try {
    result = await response.json();
  } catch (error) {
    throw new Error(
      'Apps Script 응답을 JSON으로 읽지 못했습니다.'
    );
  }

  const rows =
    normalizeDashboardResponse(result);

  if (
    !Array.isArray(rows) ||
    rows.length < 2
  ) {
    throw new Error(
      '분석할 데이터가 없습니다.'
    );
  }

  return rows;
}


/**
 * Apps Script 응답 형식 통일
 */
function normalizeDashboardResponse(
  result
) {
  if (
    result &&
    result.success === false
  ) {
    throw new Error(
      result.message ||
      result.error ||
      'Apps Script에서 오류가 발생했습니다.'
    );
  }

  if (Array.isArray(result)) {
    return result;
  }

  if (
    result &&
    Array.isArray(result.data)
  ) {
    return result.data;
  }

  if (
    result &&
    Array.isArray(result.rows)
  ) {
    return result.rows;
  }

  throw new Error(
    'Apps Script 응답 형식을 확인할 수 없습니다.'
  );
}
