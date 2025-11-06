# 개인 여행앱

HTML, CSS, JavaScript로 제작된 웹 기반 여행 계획 애플리케이션입니다.

## 주요 기능

### 1. 메인 화면
- 구글 맵을 이용한 현재 위치 표시
- 실시간 위치 정보 제공
- '여행 탐색' 버튼으로 여행 계획 시작

### 2. 여행 계획 팝업
- **출발지**: 현재 위치 자동 입력
- **목적지**: 검색 및 지도 확인 기능
- **핀 포인트**: 지도 클릭으로 정확한 목적지 설정
- **출발 시간 및 여행 기간** 설정

### 3. 교통수단 선택 페이지
7개의 탭으로 다양한 이동 수단 제공:
- **버스**: 고속버스, 시외버스 정보
- **기차**: KTX, SRT, ITX-새마을 정보
- **비행기**: 국내선 항공편 정보
- **자동차**: 자가용 경로 및 예상 비용
- **자전거**: 장거리 자전거 여행 정보
- **최소시간**: 가장 빠른 이동 방법 추천
- **최소비용**: 가장 저렴한 이동 방법 추천

### 4. 여행 정보 페이지
- **맛집 정보**: 목적지 주변 추천 맛집
- **관광지 정보**: 인기 관광 명소
- **지도 시각화**: 출발지-목적지 경로 표시
- **네이버 지도 스타일**: 좌측 리스트 + 우측 지도

## 설치 및 실행

### 1. Google Maps API 키 발급

이 앱을 사용하려면 Google Maps API 키가 필요합니다.

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. "API 및 서비스" > "라이브러리"로 이동
4. 다음 API들을 활성화:
   - Maps JavaScript API
   - Places API
   - Geocoding API
   - Directions API
5. "API 및 서비스" > "사용자 인증 정보"로 이동
6. "사용자 인증 정보 만들기" > "API 키" 선택
7. API 키 복사

### 2. API 키 설정

`index.html` 파일을 열고, 다음 부분을 찾아 YOUR_API_KEY를 실제 API 키로 교체하세요:

```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places,geometry&callback=initMap" async defer></script>
```

예시:
```html
<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBxxxxxxxxxxxxxxxxxxxxxx&libraries=places,geometry&callback=initMap" async defer></script>
```

### 3. 로컬 서버 실행

보안상의 이유로 파일을 직접 열면 일부 기능이 작동하지 않을 수 있습니다.
로컬 서버를 실행하여 앱을 사용하세요.

#### Python 사용 (Python이 설치되어 있는 경우)

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

#### Node.js 사용 (http-server)

```bash
# http-server 설치
npm install -g http-server

# 서버 실행
http-server -p 8000
```

#### VS Code Live Server 사용

1. VS Code에서 "Live Server" 확장 설치
2. index.html 파일을 마우스 우클릭
3. "Open with Live Server" 선택

### 4. 브라우저에서 열기

브라우저에서 다음 주소로 접속:
```
http://localhost:8000
```

## 프로젝트 구조

```
personal-travel-app/
│
├── index.html          # 메인 HTML 파일
├── styles.css          # 스타일시트
├── app.js              # JavaScript 로직
└── README.md           # 프로젝트 설명
```

## 사용 방법

### 1단계: 여행 계획 시작
1. 메인 화면에서 "여행 탐색" 버튼 클릭
2. 출발지는 현재 위치가 자동으로 입력됩니다

### 2단계: 목적지 설정
1. 목적지 입력창에 원하는 장소 입력
2. "찾기" 버튼 클릭하여 지도에서 확인
3. 필요시 지도를 클릭하여 정확한 위치 설정
4. "위치 확인" 버튼으로 목적지 확정

### 3단계: 출발 정보 입력
1. 출발 시간 설정
2. 여행 기간 설정 (일 단위)
3. "교통수단 선택하기" 버튼 클릭

### 4단계: 교통수단 선택
1. 7개 탭 중 원하는 교통수단 선택
2. 리스트에서 구체적인 옵션 선택
3. "여행 정보 보기" 버튼 클릭

### 5단계: 여행 정보 확인
1. 맛집 또는 관광지 탭 선택
2. 좌측 리스트에서 관심 장소 확인
3. 우측 지도에서 경로 및 위치 확인

## 기술 스택

- **HTML5**: 시맨틱 마크업
- **CSS3**: 플렉스박스, 그리드, 애니메이션
- **JavaScript (ES6+)**: 비동기 처리, 이벤트 핸들링
- **Google Maps API**: 지도, 경로, 위치 검색 기능

## 브라우저 지원

- Chrome (권장)
- Firefox
- Safari
- Edge

## 향후 개선 사항

### 실시간 데이터 연동
현재는 샘플 데이터를 사용하고 있습니다. 다음 API 연동을 통해 실시간 정보 제공이 가능합니다:

1. **교통 정보**
   - 버스: 공공데이터포털 시외버스 API
   - 기차: 코레일 Open API
   - 비행기: 항공 스케줄 API

2. **맛집/관광지 정보**
   - Google Places API (이미 포함됨)
   - 카카오 로컬 API
   - 네이버 지역 검색 API

3. **추가 기능**
   - 사용자 계정 및 여행 이력 저장
   - 여행 일정 저장 및 공유
   - 날씨 정보 통합
   - 숙박 정보 추가
   - 예산 계산기

## 주의사항

1. **API 키 보안**: 프로덕션 환경에서는 API 키를 환경 변수로 관리하고, 도메인 제한을 설정하세요.
2. **위치 권한**: 브라우저에서 위치 정보 접근 권한을 허용해야 현재 위치가 표시됩니다.
3. **HTTPS**: 위치 정보 기능은 HTTPS 환경에서만 작동합니다. (localhost는 예외)

## 라이선스

이 프로젝트는 개인 학습 및 비상업적 용도로 사용할 수 있습니다.

## 문의

프로젝트에 대한 문의나 개선 제안은 이슈를 통해 남겨주세요.
