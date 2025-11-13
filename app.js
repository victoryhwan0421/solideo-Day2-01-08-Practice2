// 전역 변수
let map;
let routeMap;
let currentLocation;
let destinationLocation;
let destinationMarker;
let originMarker;
let currentPin;
let routingControl;

// ========== API 키 설정 ==========
// ODsay API 키 (https://lab.odsay.com/ 에서 발급)
const ODSAY_API_KEY = 'YOUR_ODSAY_API_KEY';

// 공공데이터포털 API 키 (https://www.data.go.kr/ 에서 발급)
// TAGO 고속버스정보 API: https://www.data.go.kr/data/15098522/openapi.do
const TAGO_BUS_API_KEY = 'YOUR_TAGO_BUS_API_KEY';

// TAGO 열차정보 API: https://www.data.go.kr/data/15098552/openapi.do
const TAGO_TRAIN_API_KEY = 'YOUR_TAGO_TRAIN_API_KEY';

// 카카오 모빌리티 API 키 (https://developers.kakaomobility.com/ 에서 발급)
const KAKAO_MOBILITY_API_KEY = 'YOUR_KAKAO_MOBILITY_API_KEY';

// 한국도로공사 고속도로 휴게소 정보 API
const EXPRESSWAY_REST_AREA_API_KEY = 'YOUR_REST_AREA_API_KEY';

// 앱 상태
const appState = {
    departure: null,
    destination: null,
    departureTime: null,
    travelDuration: 1,
    selectedTransport: null,
    hasSeenHomePage: false // 홈페이지를 본 적이 있는지 추적
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    initEventListeners();
});

// Leaflet 지도 초기화
function initMap() {
    // 기본 위치 (서울시청)
    const defaultLocation = [37.5665, 126.9780];

    // 메인 지도 초기화
    map = L.map('map', {
        zoomControl: true,
        attributionControl: true
    }).setView(defaultLocation, 13);

    // OpenStreetMap 타일 레이어 추가
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // 여행 정보 페이지의 지도 초기화
    routeMap = L.map('routeMap').setView(defaultLocation, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(routeMap);

    // 현재 위치 가져오기
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentLocation = [position.coords.latitude, position.coords.longitude];
                map.setView(currentLocation, 15);

                // 현재 위치 마커 생성
                originMarker = L.circleMarker(currentLocation, {
                    color: '#4285f4',
                    fillColor: '#4285f4',
                    fillOpacity: 1,
                    radius: 10,
                    weight: 3
                }).addTo(map);

                originMarker.bindPopup('현재 위치').openPopup();

                // 출발지 입력창에 현재 위치 좌표로 역지오코딩
                reverseGeocode(currentLocation);
            },
            (error) => {
                console.log('위치 정보를 가져올 수 없습니다. 기본 위치를 사용합니다.');
                currentLocation = defaultLocation;

                originMarker = L.circleMarker(currentLocation, {
                    color: '#4285f4',
                    fillColor: '#4285f4',
                    fillOpacity: 1,
                    radius: 10,
                    weight: 3
                }).addTo(map);

                reverseGeocode(currentLocation);
            }
        );
    } else {
        currentLocation = defaultLocation;

        originMarker = L.circleMarker(currentLocation, {
            color: '#4285f4',
            fillColor: '#4285f4',
            fillOpacity: 1,
            radius: 10,
            weight: 3
        }).addTo(map);

        reverseGeocode(currentLocation);
    }

    // 지도 클릭 이벤트 (핀 설정용)
    map.on('click', function(e) {
        if (document.getElementById('pinControls').style.display === 'block') {
            setDestinationPin([e.latlng.lat, e.latlng.lng]);
        }
    });
}

// 역지오코딩 (좌표 -> 주소) - Nominatim API 사용
function reverseGeocode(location) {
    const [lat, lng] = location;

    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ko`)
        .then(response => response.json())
        .then(data => {
            const address = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            document.getElementById('departure').value = address;
            appState.departure = {
                address: address,
                location: location
            };
        })
        .catch(error => {
            console.error('역지오코딩 오류:', error);
            document.getElementById('departure').value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            appState.departure = {
                address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                location: location
            };
        });
}

// 이벤트 리스너 초기화
function initEventListeners() {
    // 여행 탐색 버튼 - 사이드바 열기
    document.getElementById('exploreTravelBtn').addEventListener('click', () => {
        openPlanSidebar();
    });

    // 여행 계획 사이드바 닫기
    document.getElementById('closePlanSidebar').addEventListener('click', () => {
        closePlanSidebar();
    });

    // Enter 키로 목적지 찾기
    document.getElementById('destination').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            findDestination();
        }
    });

    // 내 위치 버튼
    document.getElementById('myLocationBtn').addEventListener('click', () => {
        if (currentLocation) {
            map.setView(currentLocation, 15);
            if (originMarker) {
                originMarker.openPopup();
            }
        } else {
            alert('현재 위치를 가져올 수 없습니다.');
        }
    });

    // 핀 확인 버튼
    document.getElementById('confirmPinBtn').addEventListener('click', confirmPin);

    // 교통수단 선택 버튼 - 교통수단 사이드바로 전환
    document.getElementById('nextToTransportBtn').addEventListener('click', () => {
        if (!appState.destination) {
            alert('목적지를 설정해주세요.');
            return;
        }

        appState.departureTime = document.getElementById('departureTime').value;
        appState.travelDuration = document.getElementById('travelDuration').value;

        // 여행 계획 사이드바 닫고 교통수단 사이드바 열기
        closePlanSidebar();
        setTimeout(() => {
            openTransportSidebar();
            loadTransportInfo();
        }, 400);
    });

    // 교통수단 사이드바 닫기
    document.getElementById('closeTransportSidebar').addEventListener('click', () => {
        closeTransportSidebar();
    });

    // 교통수단에서 뒤로 가기
    document.getElementById('backToPlan').addEventListener('click', () => {
        closeTransportSidebar();
        setTimeout(() => {
            openPlanSidebar();
        }, 400);
    });

    // 여행 정보 보기 버튼
    document.getElementById('nextToTravelInfoBtn').addEventListener('click', () => {
        if (!appState.selectedTransport) {
            alert('교통수단을 선택해주세요.');
            return;
        }

        // 모든 사이드바 닫고 여행 정보 페이지 열기
        closeTransportSidebar();
        setTimeout(() => {
            showTravelInfoPage();
        }, 400);
    });

    // 여행 정보 페이지에서 뒤로 가기
    document.getElementById('backFromTravelInfo').addEventListener('click', () => {
        hideTravelInfoPage();
        setTimeout(() => {
            openTransportSidebar();
        }, 100);
    });

    // 교통수단 탭
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');

            loadTransportInfo(btn.dataset.tab);
        });
    });

    // 여행 정보 탭
    document.querySelectorAll('.info-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.info-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadTravelInfo(btn.dataset.info);
        });
    });
}

// 사이드바 제어 함수들
function openPlanSidebar() {
    // 홈페이지를 처음 보는 경우에만 숨기기
    if (!appState.hasSeenHomePage) {
        document.getElementById('homeContent').classList.add('hidden');
        appState.hasSeenHomePage = true;
    }
    document.getElementById('planSidebar').classList.add('active');
    setTimeout(() => map.invalidateSize(), 100);
}

function closePlanSidebar() {
    document.getElementById('planSidebar').classList.remove('active');
    setTimeout(() => {
        map.invalidateSize();
    }, 400);
}

function openTransportSidebar() {
    document.getElementById('transportSidebar').classList.add('active');
    setTimeout(() => map.invalidateSize(), 100);
}

function closeTransportSidebar() {
    document.getElementById('transportSidebar').classList.remove('active');
    setTimeout(() => {
        map.invalidateSize();
    }, 400);
}

function showTravelInfoPage() {
    document.getElementById('travelInfoPage').classList.add('active');
    setTimeout(() => {
        routeMap.invalidateSize();
        loadTravelInfo();
        displayRoute();
    }, 100);
}

function hideTravelInfoPage() {
    document.getElementById('travelInfoPage').classList.remove('active');
}

// 목적지 찾기 - Nominatim Geocoding API 사용
function findDestination() {
    const destination = document.getElementById('destination').value;
    if (!destination) {
        alert('목적지를 입력해주세요.');
        return;
    }

    // Nominatim API로 주소 검색
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&accept-language=ko&limit=1`)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const result = data[0];
                destinationLocation = [parseFloat(result.lat), parseFloat(result.lon)];

                // 지도 이동
                map.setView(destinationLocation, 16);

                // 기존 마커 제거
                if (destinationMarker) {
                    map.removeLayer(destinationMarker);
                }

                // 목적지 마커 생성
                destinationMarker = L.marker(destinationLocation, {
                    icon: L.icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    })
                }).addTo(map);

                destinationMarker.bindPopup('목적지').openPopup();

                // 핀 설정 컨트롤 표시
                document.getElementById('pinControls').style.display = 'block';
            } else {
                alert('목적지를 찾을 수 없습니다. 다시 시도해주세요.');
            }
        })
        .catch(error => {
            console.error('지오코딩 오류:', error);
            alert('목적지 검색 중 오류가 발생했습니다. 다시 시도해주세요.');
        });
}

// 목적지 핀 설정
function setDestinationPin(location) {
    destinationLocation = location;

    // 기존 핀 제거
    if (currentPin) {
        map.removeLayer(currentPin);
    }

    // 새 핀 생성
    currentPin = L.marker(location, {
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })
    }).addTo(map);

    currentPin.bindPopup('선택한 목적지').openPopup();
}

// 핀 확인
function confirmPin() {
    if (!destinationLocation) {
        alert('지도를 클릭하여 목적지를 설정해주세요.');
        return;
    }

    const [lat, lng] = destinationLocation;

    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ko`)
        .then(response => response.json())
        .then(data => {
            const address = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            document.getElementById('destination').value = address;
            appState.destination = {
                address: address,
                location: destinationLocation
            };

            document.getElementById('pinControls').style.display = 'none';
            alert('목적지가 설정되었습니다.');
        })
        .catch(error => {
            console.error('역지오코딩 오류:', error);
            const address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            document.getElementById('destination').value = address;
            appState.destination = {
                address: address,
                location: destinationLocation
            };
            document.getElementById('pinControls').style.display = 'none';
            alert('목적지가 설정되었습니다.');
        });
}

// ========== API 호출 함수들 ==========

// TAGO 고속버스 정보 API 호출
async function fetchBusInfo() {
    if (!appState.departure || !appState.destination) {
        return null;
    }

    if (TAGO_BUS_API_KEY === 'YOUR_TAGO_BUS_API_KEY') {
        console.warn('TAGO 버스 API 키가 설정되지 않았습니다. 샘플 데이터를 사용합니다.');
        return null;
    }

    const [startLat, startLng] = appState.departure.location;
    const [endLat, endLng] = appState.destination.location;

    try {
        // 출발지/도착지 터미널 찾기 (좌표 기반)
        // 실제로는 터미널 검색 API를 먼저 호출하여 terminalId를 얻어야 함
        const response = await fetch(
            `http://apis.data.go.kr/1613000/ExpBusInfoService/getStrtpntAlocFndExpbusInfo?` +
            `serviceKey=${TAGO_BUS_API_KEY}&` +
            `depTerminalId=&arrTerminalId=&` +
            `depPlandTime=${getFormattedDate()}&` +
            `_type=json`
        );

        if (!response.ok) {
            throw new Error('버스 API 요청 실패');
        }

        const data = await response.json();
        return data.response?.body?.items?.item || [];
    } catch (error) {
        console.error('버스 정보 가져오기 실패:', error);
        return null;
    }
}

// TAGO 열차 정보 API 호출
async function fetchTrainInfo() {
    if (!appState.departure || !appState.destination) {
        return null;
    }

    if (TAGO_TRAIN_API_KEY === 'YOUR_TAGO_TRAIN_API_KEY') {
        console.warn('TAGO 열차 API 키가 설정되지 않았습니다. 샘플 데이터를 사용합니다.');
        return null;
    }

    try {
        const response = await fetch(
            `http://apis.data.go.kr/1613000/TrainInfoService/getStrtpntAlocFndTrainInfo?` +
            `serviceKey=${TAGO_TRAIN_API_KEY}&` +
            `depPlaceId=&arrPlaceId=&` +
            `depPlandTime=${getFormattedDate()}&` +
            `_type=json`
        );

        if (!response.ok) {
            throw new Error('열차 API 요청 실패');
        }

        const data = await response.json();
        return data.response?.body?.items?.item || [];
    } catch (error) {
        console.error('열차 정보 가져오기 실패:', error);
        return null;
    }
}

// 카카오 모빌리티 경로 API 호출
async function fetchCarRoute(option = 'highway-time') {
    if (!appState.departure || !appState.destination) {
        return null;
    }

    if (KAKAO_MOBILITY_API_KEY === 'YOUR_KAKAO_MOBILITY_API_KEY') {
        console.warn('카카오 모빌리티 API 키가 설정되지 않았습니다. 샘플 데이터를 사용합니다.');
        return null;
    }

    const [startLat, startLng] = appState.departure.location;
    const [endLat, endLng] = appState.destination.location;

    try {
        // priority 옵션: RECOMMEND(추천), TIME(최단시간), DISTANCE(최단거리)
        // road_type: 1(고속도로 우선), 2(무료도로 우선), 3(최단거리)
        let priority = 'RECOMMEND';
        let avoidOptions = '';

        if (option === 'highway-time') {
            priority = 'TIME';
        } else if (option === 'highway-cost') {
            priority = 'DISTANCE';
        } else if (option === 'national') {
            avoidOptions = '&avoid=highway'; // 고속도로 회피
        }

        const response = await fetch(
            `https://apis-navi.kakaomobility.com/v1/directions?` +
            `origin=${startLng},${startLat}&` +
            `destination=${endLng},${endLat}&` +
            `priority=${priority}${avoidOptions}`,
            {
                headers: {
                    'Authorization': `KakaoAK ${KAKAO_MOBILITY_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error('경로 API 요청 실패');
        }

        const data = await response.json();
        return data.routes?.[0] || null;
    } catch (error) {
        console.error('경로 정보 가져오기 실패:', error);
        return null;
    }
}

// 고속도로 휴게소 정보 API 호출
async function fetchRestAreas(routeCoordinates) {
    if (EXPRESSWAY_REST_AREA_API_KEY === 'YOUR_REST_AREA_API_KEY') {
        console.warn('휴게소 API 키가 설정되지 않았습니다.');
        return [];
    }

    try {
        // 공공데이터포털의 한국도로공사 고속도로 휴게소 정보 API
        const response = await fetch(
            `http://data.ex.co.kr/openapi/restinfo/restBestfoodInfoAll?` +
            `key=${EXPRESSWAY_REST_AREA_API_KEY}&` +
            `type=json`
        );

        if (!response.ok) {
            throw new Error('휴게소 API 요청 실패');
        }

        const data = await response.json();
        // 경로상에 있는 휴게소만 필터링 (좌표 기반)
        return data.list || [];
    } catch (error) {
        console.error('휴게소 정보 가져오기 실패:', error);
        return [];
    }
}

// ODsay API로 대중교통 정보 가져오기 (도심 내 이동용)
async function fetchPublicTransportInfo() {
    if (!appState.departure || !appState.destination) {
        return null;
    }

    if (ODSAY_API_KEY === 'YOUR_ODSAY_API_KEY') {
        console.warn('ODsay API 키가 설정되지 않았습니다. 샘플 데이터를 사용합니다.');
        return null;
    }

    const [startLat, startLng] = appState.departure.location;
    const [endLat, endLng] = appState.destination.location;

    try {
        const response = await fetch(
            `https://api.odsay.com/v1/api/searchPubTransPath?` +
            `SX=${startLng}&SY=${startLat}&EX=${endLng}&EY=${endLat}&` +
            `apiKey=${ODSAY_API_KEY}`
        );

        if (!response.ok) {
            throw new Error('API 요청 실패');
        }

        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error('대중교통 정보 가져오기 실패:', error);
        return null;
    }
}

// 날짜 포맷 함수 (YYYYMMDD)
function getFormattedDate() {
    const departureTime = document.getElementById('departureTime').value;
    if (departureTime) {
        const date = new Date(departureTime);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// 교통수단 정보 로드
async function loadTransportInfo(type = 'bus') {
    const listId = type + 'List';
    const listElement = document.getElementById(listId);

    // 로딩 표시
    listElement.innerHTML = '<div class="loading">정보를 불러오는 중...</div>';

    // 정렬 옵션 가져오기
    let sortOption = 'default';
    let carRouteOption = 'highway-time';

    if (type === 'bus' || type === 'train') {
        const sortSelect = document.getElementById(`${type}SortSelect`);
        if (sortSelect) {
            sortOption = sortSelect.value;
        }
    } else if (type === 'car') {
        const routeSelect = document.getElementById('carRouteSelect');
        if (routeSelect) {
            carRouteOption = routeSelect.value;
        }
    }

    // 실제 API 데이터 가져오기 시도
    let apiData = null;

    if (type === 'bus') {
        apiData = await fetchBusInfo();
    } else if (type === 'train') {
        apiData = await fetchTrainInfo();
    } else if (type === 'car') {
        apiData = await fetchCarRoute(carRouteOption);
        if (apiData) {
            renderCarRoute(apiData, carRouteOption, listElement);
            return;
        }
    }

    // API 데이터가 있고 유효한 경우 사용
    if (apiData && Array.isArray(apiData) && apiData.length > 0) {
        renderRealBusTrainData(apiData, type, sortOption, listElement);
        return;
    }

    // API 데이터가 없으면 샘플 데이터 사용
    let transportData = [];

    switch(type) {
        case 'bus':
            transportData = [
                {
                    type: '고속버스',
                    price: '15,000원',
                    time: '4시간 30분',
                    departureTime: '09:00',
                    arrivalTime: '13:30',
                    route: [
                        { location: '현재 위치', type: 'start' },
                        { location: '서울 고속버스터미널 (경유)', type: 'via', walkTime: '15분' },
                        { location: '부산 종합버스터미널 (경유)', type: 'via', transitTime: '4시간' },
                        { location: '목적지', type: 'end', walkTime: '10분' }
                    ]
                },
                {
                    type: '시외버스',
                    price: '12,000원',
                    time: '5시간',
                    departureTime: '10:00',
                    arrivalTime: '15:00',
                    route: [
                        { location: '현재 위치', type: 'start' },
                        { location: '동서울 터미널 (경유)', type: 'via', walkTime: '20분' },
                        { location: '부산 서부터미널 (경유)', type: 'via', transitTime: '4시간 30분' },
                        { location: '목적지', type: 'end', walkTime: '15분' }
                    ]
                },
                {
                    type: '남부터미널 고속버스',
                    price: '14,500원',
                    time: '4시간 40분',
                    departureTime: '08:00',
                    arrivalTime: '12:40',
                    route: [
                        { location: '현재 위치', type: 'start' },
                        { location: '남부 터미널 (경유)', type: 'via', walkTime: '25분' },
                        { location: '부산 종합버스터미널 (경유)', type: 'via', transitTime: '4시간' },
                        { location: '목적지', type: 'end', walkTime: '10분' }
                    ]
                }
            ];
            break;
        case 'train':
            transportData = [
                {
                    type: 'KTX',
                    price: '59,800원',
                    time: '2시간 40분',
                    departureTime: '09:00',
                    arrivalTime: '11:40',
                    route: [
                        { location: '현재 위치', type: 'start' },
                        { location: '서울역 (경유)', type: 'via', walkTime: '15분' },
                        { location: '부산역 (경유)', type: 'via', transitTime: '2시간 30분' },
                        { location: '목적지', type: 'end', walkTime: '12분' }
                    ]
                },
                {
                    type: 'SRT',
                    price: '52,300원',
                    time: '2시간 50분',
                    departureTime: '10:00',
                    arrivalTime: '12:50',
                    route: [
                        { location: '현재 위치', type: 'start' },
                        { location: '수서역 (경유)', type: 'via', walkTime: '20분' },
                        { location: '부산역 (경유)', type: 'via', transitTime: '2시간 20분' },
                        { location: '목적지', type: 'end', walkTime: '12분' }
                    ]
                },
                {
                    type: 'ITX-새마을',
                    price: '42,100원',
                    time: '4시간 20분',
                    departureTime: '08:30',
                    arrivalTime: '12:50',
                    route: [
                        { location: '현재 위치', type: 'start' },
                        { location: '용산역 (경유)', type: 'via', walkTime: '18분' },
                        { location: '부산역 (경유)', type: 'via', transitTime: '4시간' },
                        { location: '목적지', type: 'end', walkTime: '12분' }
                    ]
                }
            ];
            break;
        case 'car':
            transportData = [
                {
                    type: '자가용 (경부고속도로)',
                    price: '통행료 약 45,000원 + 유류비',
                    time: '약 4시간 30분',
                    distance: '약 400km',
                    route: [
                        { location: '현재 위치', type: 'start' },
                        { location: '목적지 (직행)', type: 'end', transitTime: '4시간 30분' }
                    ]
                }
            ];
            break;
        case 'bike':
            transportData = [
                {
                    type: '자전거 (국토종주 코스)',
                    price: '0원 (무료)',
                    time: '약 2-3일',
                    distance: '약 400km',
                    note: '숙박 및 식사 비용 별도',
                    route: [
                        { location: '현재 위치', type: 'start' },
                        { location: '목적지 (국토종주 경로)', type: 'end', transitTime: '2-3일' }
                    ]
                }
            ];
            break;
    }

    // 정렬 적용 (버스, 기차만)
    if ((type === 'bus' || type === 'train') && transportData.length > 0) {
        if (sortOption === 'time') {
            transportData.sort((a, b) => {
                const timeA = parseTimeString(a.time);
                const timeB = parseTimeString(b.time);
                return timeA - timeB;
            });
        } else if (sortOption === 'cost') {
            transportData.sort((a, b) => {
                const priceA = parseInt(a.price.replace(/[^0-9]/g, ''));
                const priceB = parseInt(b.price.replace(/[^0-9]/g, ''));
                return priceA - priceB;
            });
        }
    }

    // 리스트 렌더링
    listElement.innerHTML = transportData.map((item, index) => {
        // 경로 단계별 표시 생성
        let routeSteps = '';
        if (item.route && item.route.length > 0) {
            routeSteps = item.route.map((step, stepIndex) => {
                let icon = '';
                let timeInfo = '';

                if (step.type === 'start') {
                    icon = '🚶';
                } else if (step.type === 'via') {
                    // 교통수단에 따라 아이콘 선택
                    if (type === 'bus' || item.type.includes('버스')) icon = '🚌';
                    else if (type === 'train' || item.type.includes('KTX') || item.type.includes('SRT') || item.type.includes('새마을')) icon = '🚄';
                    else if (type === 'car' || item.type.includes('자가용')) icon = '🚗';
                    else if (type === 'bike' || item.type.includes('자전거')) icon = '🚴';
                    else icon = '🚶';

                    // 시간 정보 표시
                    if (step.walkTime) timeInfo = ` (도보 ${step.walkTime})`;
                    else if (step.transitTime) timeInfo = ` (${step.transitTime})`;
                } else if (step.type === 'end') {
                    icon = '🏁';
                    if (step.walkTime) timeInfo = ` (도보 ${step.walkTime})`;
                }

                const arrow = stepIndex < item.route.length - 1 ? '<div style="text-align: center; color: #999; margin: 2px 0;">↓</div>' : '';
                return `<div style="font-size: 13px; margin: 3px 0;">${icon} ${step.location}${timeInfo}</div>${arrow}`;
            }).join('');
        }

        return `
            <div class="transport-item" onclick="selectTransport('${type}', ${index})">
                <div class="transport-header">
                    <span class="transport-type">${item.type}</span>
                    <span class="transport-price">${item.price}</span>
                </div>
                <div class="transport-details">
                    ${item.rank ? `<div style="color: #ea4335; font-weight: 600; margin-bottom: 8px;">${item.rank}</div>` : ''}
                    ${routeSteps ? `<div class="transport-route" style="background: #f8f9fa; padding: 10px; border-radius: 8px; margin: 8px 0;">${routeSteps}</div>` : ''}
                    <div style="margin-top: 8px;">⏱️ 소요시간: ${item.time}</div>
                    ${item.departureTime ? `<div>🕐 출발: ${item.departureTime} | 도착: ${item.arrivalTime}</div>` : ''}
                    ${item.distance ? `<div>📏 거리: ${item.distance}</div>` : ''}
                    ${item.note ? `<div style="color: #ea4335; font-size: 12px; margin-top: 4px;">⚠️ ${item.note}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// 시간 문자열 파싱 (분 단위로 반환)
function parseTimeString(timeStr) {
    const hourMatch = timeStr.match(/(\d+)시간/);
    const minMatch = timeStr.match(/(\d+)분/);
    let totalMinutes = 0;
    if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
    if (minMatch) totalMinutes += parseInt(minMatch[1]);
    return totalMinutes;
}

// 실제 버스/기차 API 데이터 렌더링
function renderRealBusTrainData(apiData, type, sortOption, listElement) {
    if (!Array.isArray(apiData) || apiData.length === 0) {
        listElement.innerHTML = '<div class="loading">해당 교통수단 정보를 찾을 수 없습니다.</div>';
        return;
    }

    // 정렬 적용
    let sortedData = [...apiData];
    if (sortOption === 'time') {
        sortedData.sort((a, b) => {
            const timeA = parseInt(a.depPlandTime || 0);
            const timeB = parseInt(b.depPlandTime || 0);
            return timeA - timeB;
        });
    } else if (sortOption === 'cost') {
        sortedData.sort((a, b) => {
            const priceA = parseInt(a.charge || 0);
            const priceB = parseInt(b.charge || 0);
            return priceA - priceB;
        });
    }

    // HTML 렌더링
    listElement.innerHTML = sortedData.map((item, index) => {
        const price = item.charge ? `${parseInt(item.charge).toLocaleString()}원` : '정보 없음';
        const depTime = item.depPlandTime ? `${item.depPlandTime.slice(0, 2)}:${item.depPlandTime.slice(2, 4)}` : '-';
        const arrTime = item.arrPlandTime ? `${item.arrPlandTime.slice(0, 2)}:${item.arrPlandTime.slice(2, 4)}` : '-';
        const gradeNm = item.gradeNm || item.trainGradeNm || '일반';

        return `
            <div class="transport-item" onclick="selectTransport('${type}', ${index})">
                <div class="transport-header">
                    <span class="transport-type">${gradeNm}</span>
                    <span class="transport-price">${price}</span>
                </div>
                <div class="transport-details">
                    <div class="transport-route" style="background: #f8f9fa; padding: 10px; border-radius: 8px; margin: 8px 0;">
                        <div style="font-size: 13px; margin: 3px 0;">🚶 현재 위치</div>
                        <div style="text-align: center; color: #999; margin: 2px 0;">↓</div>
                        <div style="font-size: 13px; margin: 3px 0;">${type === 'bus' ? '🚌' : '🚄'} ${item.depPlaceNm || '출발지'} → ${item.arrPlaceNm || '도착지'}</div>
                        <div style="text-align: center; color: #999; margin: 2px 0;">↓</div>
                        <div style="font-size: 13px; margin: 3px 0;">🏁 목적지</div>
                    </div>
                    <div style="margin-top: 8px;">🕐 출발: ${depTime} | 도착: ${arrTime}</div>
                </div>
            </div>
        `;
    }).join('');
}

// 자동차 경로 렌더링
function renderCarRoute(routeData, routeOption, listElement) {
    if (!routeData || !routeData.sections) {
        listElement.innerHTML = '<div class="loading">경로 정보를 찾을 수 없습니다. 샘플 데이터를 표시합니다.</div>';
        // 샘플 데이터로 폴백
        setTimeout(() => loadTransportInfo('car'), 100);
        return;
    }

    const summary = routeData.summary;
    const duration = Math.floor(summary.duration / 60); // 분 단위
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    const timeStr = hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
    const distance = (summary.distance / 1000).toFixed(1); // km
    const tollFare = summary.fare?.toll || 0;
    const taxiFare = summary.fare?.taxi || 0;

    let routeOptionText = '추천 경로';
    if (routeOption === 'highway-time') routeOptionText = '고속도로 (최단시간)';
    else if (routeOption === 'highway-cost') routeOptionText = '고속도로 (최소비용)';
    else if (routeOption === 'national') routeOptionText = '국도';

    // 경유지 정보 (휴게소 포함)
    let routeSteps = '<div style="font-size: 13px; margin: 3px 0;">🚗 현재 위치</div>';
    routeSteps += '<div style="text-align: center; color: #999; margin: 2px 0;">↓</div>';
    routeSteps += `<div style="font-size: 13px; margin: 3px 0;">🛣️ ${routeOptionText} 경로 (${distance}km)</div>`;

    // 휴게소 정보 표시 (고속도로 이용 시)
    if (routeOption !== 'national' && summary.distance > 100000) { // 100km 이상
        routeSteps += '<div style="text-align: center; color: #999; margin: 2px 0;">↓</div>';
        routeSteps += '<div style="font-size: 12px; margin: 3px 0; color: #666;">⛽ 휴게소 정보는 지도에 표시됩니다</div>';
    }

    routeSteps += '<div style="text-align: center; color: #999; margin: 2px 0;">↓</div>';
    routeSteps += '<div style="font-size: 13px; margin: 3px 0;">🏁 목적지</div>';

    listElement.innerHTML = `
        <div class="transport-item selected">
            <div class="transport-header">
                <span class="transport-type">${routeOptionText}</span>
                <span class="transport-price">통행료 ${tollFare.toLocaleString()}원</span>
            </div>
            <div class="transport-details">
                <div class="transport-route" style="background: #f8f9fa; padding: 10px; border-radius: 8px; margin: 8px 0;">
                    ${routeSteps}
                </div>
                <div style="margin-top: 8px;">⏱️ 소요시간: ${timeStr}</div>
                <div>📏 거리: ${distance}km</div>
                <div>💰 예상 택시 요금: ${taxiFare.toLocaleString()}원</div>
            </div>
        </div>
    `;

    // 지도에 경로와 휴게소 표시
    if (routeOption !== 'national') {
        displayRestAreasOnMap(routeData);
    }
}

// 지도에 휴게소 표시
async function displayRestAreasOnMap(routeData) {
    // 휴게소 API 호출
    const restAreas = await fetchRestAreas(routeData.sections);

    // 지도에 마커 추가
    restAreas.forEach(rest => {
        if (rest.latitude && rest.longitude) {
            L.marker([rest.latitude, rest.longitude], {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).addTo(map).bindPopup(`⛽ ${rest.serviceName || rest.unitName || '휴게소'}`);
        }
    });
}

// 실제 API 데이터 렌더링 (ODsay - 도심 내 이동용)
function renderRealTransportData(apiData, type, listElement) {
    const paths = apiData.path;

    // 타입에 따라 필터링
    let filteredPaths = paths;

    if (type === 'bus') {
        // 버스가 포함된 경로만 필터링
        filteredPaths = paths.filter(path =>
            path.subPath.some(sub => sub.trafficType === 2) // 2 = 버스
        );
    } else if (type === 'train') {
        // 지하철/기차가 포함된 경로만 필터링
        filteredPaths = paths.filter(path =>
            path.subPath.some(sub => sub.trafficType === 1) // 1 = 지하철
        );
    } else if (type === 'minTime') {
        // 시간 순으로 정렬
        filteredPaths = paths.sort((a, b) => a.info.totalTime - b.info.totalTime);
    } else if (type === 'minCost') {
        // 비용 순으로 정렬
        filteredPaths = paths.sort((a, b) => a.info.payment - b.info.payment);
    }

    // 상위 5개만 표시
    filteredPaths = filteredPaths.slice(0, 5);

    if (filteredPaths.length === 0) {
        listElement.innerHTML = '<div class="loading">해당 교통수단으로는 경로를 찾을 수 없습니다.</div>';
        return;
    }

    // HTML 렌더링
    listElement.innerHTML = filteredPaths.map((path, index) => {
        const info = path.info;
        const hours = Math.floor(info.totalTime / 60);
        const minutes = info.totalTime % 60;
        const timeStr = hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;

        // 경로 설명 생성
        let routeDesc = [];
        path.subPath.forEach(sub => {
            if (sub.trafficType === 1) { // 지하철
                routeDesc.push(`${sub.lane[0].name}`);
            } else if (sub.trafficType === 2) { // 버스
                routeDesc.push(`${sub.lane[0].busNo}번 버스`);
            }
        });

        const routeText = routeDesc.length > 0 ? routeDesc.join(' → ') : '도보 이동';

        // 순위 표시
        let rank = '';
        if (type === 'minTime' && index === 0) rank = '1위 - 최단시간';
        else if (type === 'minCost' && index === 0) rank = '1위 - 최저비용';
        else if (index === 1) rank = '2위';
        else if (index === 2) rank = '3위';

        return `
            <div class="transport-item" onclick="selectTransport('${type}', ${index})">
                <div class="transport-header">
                    <span class="transport-type">${routeText}</span>
                    <span class="transport-price">${info.payment.toLocaleString()}원</span>
                </div>
                <div class="transport-details">
                    ${rank ? `<div style="color: #ea4335; font-weight: 600;">${rank}</div>` : ''}
                    <div>소요시간: ${timeStr}</div>
                    <div>환승: ${info.busTransitCount + info.subwayTransitCount}회</div>
                    <div>거리: ${(info.totalDistance / 1000).toFixed(1)}km</div>
                    <div>도보: ${info.totalWalk}m</div>
                </div>
            </div>
        `;
    }).join('');
}

// 교통수단 선택
function selectTransport(type, index) {
    // 이전 선택 해제
    document.querySelectorAll('.transport-item').forEach(item => {
        item.classList.remove('selected');
    });

    // 현재 선택
    event.target.closest('.transport-item').classList.add('selected');
    appState.selectedTransport = { type, index };
}

// 여행 정보 로드
function loadTravelInfo(category = 'restaurants') {
    const infoList = document.getElementById('infoList');

    let infoData = [];

    if (category === 'restaurants') {
        infoData = [
            {
                title: '해운대 할매국밥',
                description: '부산의 전통 돼지국밥 맛집. 진한 육수와 부드러운 고기가 일품',
                rating: '4.5',
                distance: '목적지에서 1.2km'
            },
            {
                title: '광안리 횟집거리',
                description: '신선한 회와 함께 광안대교 야경을 즐길 수 있는 곳',
                rating: '4.7',
                distance: '목적지에서 2.5km'
            },
            {
                title: '밀면의 진수',
                description: '부산 대표 음식 밀면 전문점. 시원하고 쫄깃한 면발',
                rating: '4.6',
                distance: '목적지에서 800m'
            },
            {
                title: '자갈치 시장 곰장어거리',
                description: '신선한 해산물과 곰장어 구이를 맛볼 수 있는 전통시장',
                rating: '4.4',
                distance: '목적지에서 3.2km'
            },
            {
                title: '송정 베이커리',
                description: '바다를 보며 즐기는 수제 빵과 커피. 인스타 감성 카페',
                rating: '4.8',
                distance: '목적지에서 15km'
            }
        ];
    } else {
        infoData = [
            {
                title: '해운대 해수욕장',
                description: '한국에서 가장 유명한 해수욕장. 여름 휴가의 성지',
                rating: '4.6',
                distance: '목적지에서 1.5km'
            },
            {
                title: '감천문화마을',
                description: '알록달록한 집들이 모여있는 산동네. 포토존이 많음',
                rating: '4.7',
                distance: '목적지에서 8km'
            },
            {
                title: '해동 용궁사',
                description: '바다와 함께하는 사찰. 일출 명소로도 유명',
                rating: '4.8',
                distance: '목적지에서 20km'
            },
            {
                title: '태종대',
                description: '부산의 대표 자연 관광지. 절벽과 등대가 아름다움',
                rating: '4.7',
                distance: '목적지에서 12km'
            },
            {
                title: '광안대교',
                description: '부산의 랜드마크. 야경이 특히 아름다운 다리',
                rating: '4.5',
                distance: '목적지에서 2.8km'
            },
            {
                title: '송도 스카이워크',
                description: '바다 위를 걷는 듯한 투명 유리 전망대',
                rating: '4.4',
                distance: '목적지에서 6km'
            }
        ];
    }

    // 리스트 렌더링
    infoList.innerHTML = infoData.map(item => `
        <div class="info-item">
            <div class="info-item-title">${item.title}</div>
            <div class="info-item-description">${item.description}</div>
            <div class="info-item-meta">
                <span>⭐ ${item.rating}</span>
                <span>📍 ${item.distance}</span>
            </div>
        </div>
    `).join('');
}

// 경로 표시
function displayRoute() {
    if (!appState.departure || !appState.destination) {
        return;
    }

    // 기존 라우팅 컨트롤 제거
    if (routingControl) {
        routeMap.removeControl(routingControl);
    }

    // Leaflet Routing Machine으로 경로 표시
    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(appState.departure.location[0], appState.departure.location[1]),
            L.latLng(appState.destination.location[0], appState.destination.location[1])
        ],
        routeWhileDragging: false,
        showAlternatives: false,
        lineOptions: {
            styles: [{ color: '#4285f4', opacity: 0.8, weight: 6 }]
        },
        createMarker: function(i, waypoint, n) {
            const marker = L.marker(waypoint.latLng, {
                icon: L.icon({
                    iconUrl: i === 0
                        ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png'
                        : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            });

            marker.bindPopup(i === 0 ? '출발지' : '목적지');
            return marker;
        }
    }).addTo(routeMap);

    // 라우팅 오류 처리
    routingControl.on('routingerror', function(e) {
        console.error('경로를 찾을 수 없습니다:', e);
        alert('경로를 표시할 수 없습니다. 출발지와 목적지를 확인해주세요.');
    });
}

// 전역 함수 등록
window.selectTransport = selectTransport;
