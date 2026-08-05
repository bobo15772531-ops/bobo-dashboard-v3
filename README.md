BOBO Dashboard V4 Final
========================

구성 파일
- index.html
- styles.css
- config.js
- sheet.js
- charts.js
- app.js

최종 KPI
1. 총 정산가
2. 총 주문수
3. 총 판매수량
4. 오늘 주문수
5. 1위 모델
6. 1위 마켓

적용 방법
1. 기존 GitHub 대시보드 파일을 백업합니다.
2. 이 폴더의 6개 파일로 교체합니다.
3. GitHub Pages 배포 후 강력 새로고침(Ctrl+F5)합니다.
4. 필터, 탭, KPI, 차트, 리더보드, CSV 다운로드를 확인합니다.

주의
- config.js의 Apps Script API URL은 현재 사용 중인 주소를 유지했습니다.
- DashboardData 헤더는 주문일자, 마켓, 카테고리, 모델, 수량, 정산가여야 합니다.
