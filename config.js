/**
 * BOBO Dashboard V4 Final
 * 공통 설정 파일
 */

const DASHBOARD_CONFIG = {
  title: '보보 판매 Dashboard V4 Final',

  dataSource: {
    type: 'google-apps-script',

    apiUrl:
      'https://script.google.com/macros/s/AKfycbyVu6rTa3CZyWJVAQjAVBvC_ZS1pZ_sDmppmA-gXHEej1m9KnpF1VEeNtBx4N37TFuf/exec'
  },

  columns: {
    date: '주문일자',
    market: '마켓',
    category: '카테고리',
    model: '모델',
    quantity: '수량',
    settlement: '정산가'
  },

  display: {
    topModelCount: 10,
    topMarketCount: 15,
    leaderboardDefaultCount: 50
  },

  refresh: {
    cacheMinutes: 30
  }
};
