// 전역 변수
let map;
let routeMap;
let currentLocation;
let destinationLocation;
let destinationMarker;
let originMarker;
let currentPin;
let directionsService;
let directionsRenderer;
let placesService;
let geocoder;

// 앱 상태
const appState = {
    departure: null,
    destination: null,
    departureTime: null,
    travelDuration: 1,
    selectedTransport: null
};

// 구글맵 초기화
function initMap() {
    // 기본 위치 (서울시청)
    const defaultLocation = { lat: 37.5665, lng: 126.9780 };

    // 메인 지도 초기화
    map = new google.maps.Map(document.getElementById('map'), {
        center: defaultLocation,
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: false
    });

    // 여행 정보 페이지의 지도 초기화
    routeMap = new google.maps.Map(document.getElementById('routeMap'), {
        center: defaultLocation,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
    });

    // Google Maps 서비스 초기화
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: routeMap,
        suppressMarkers: false
    });
    geocoder = new google.maps.Geocoder();
    placesService = new google.maps.places.PlacesService(map);

    // 현재 위치 가져오기
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                map.setCenter(currentLocation);

                // 현재 위치 마커 생성
                originMarker = new google.maps.Marker({
                    position: currentLocation,
                    map: map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: '#4285f4',
                        fillOpacity: 1,
                        strokeColor: 'white',
                        strokeWeight: 3
                    },
                    title: '현재 위치'
                });

                // 출발지 입력창에 현재 위치 좌표 표시
                reverseGeocode(currentLocation);
            },
            () => {
                console.log('위치 정보를 가져올 수 없습니다. 기본 위치를 사용합니다.');
                currentLocation = defaultLocation;
            }
        );
    } else {
        currentLocation = defaultLocation;
    }

    // 지도 클릭 이벤트 (핀 설정용)
    map.addListener('click', (e) => {
        if (document.getElementById('pinControls').style.display === 'block') {
            setDestinationPin(e.latLng);
        }
    });

    initEventListeners();
}

// 역지오코딩 (좌표 -> 주소)
function reverseGeocode(location) {
    geocoder.geocode({ location: location }, (results, status) => {
        if (status === 'OK' && results[0]) {
            document.getElementById('departure').value = results[0].formatted_address;
            appState.departure = {
                address: results[0].formatted_address,
                location: location
            };
        }
    });
}

// 이벤트 리스너 초기화
function initEventListeners() {
    // 여행 탐색 버튼
    document.getElementById('exploreTravelBtn').addEventListener('click', () => {
        document.getElementById('travelPopup').classList.add('active');
    });

    // 팝업 닫기 버튼
    document.querySelector('.close-btn').addEventListener('click', () => {
        document.getElementById('travelPopup').classList.remove('active');
    });

    // 목적지 찾기 버튼
    document.getElementById('findDestBtn').addEventListener('click', findDestination);

    // 핀 확인 버튼
    document.getElementById('confirmPinBtn').addEventListener('click', confirmPin);

    // 교통수단 선택 버튼
    document.getElementById('nextToTransportBtn').addEventListener('click', () => {
        if (!appState.destination) {
            alert('목적지를 설정해주세요.');
            return;
        }

        appState.departureTime = document.getElementById('departureTime').value;
        appState.travelDuration = document.getElementById('travelDuration').value;

        document.getElementById('travelPopup').classList.remove('active');
        showPage('transportPage');
        loadTransportInfo();
    });

    // 여행 정보 보기 버튼
    document.getElementById('nextToTravelInfoBtn').addEventListener('click', () => {
        if (!appState.selectedTransport) {
            alert('교통수단을 선택해주세요.');
            return;
        }
        showPage('travelInfoPage');
        loadTravelInfo();
        displayRoute();
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

// 목적지 찾기
function findDestination() {
    const destination = document.getElementById('destination').value;
    if (!destination) {
        alert('목적지를 입력해주세요.');
        return;
    }

    geocoder.geocode({ address: destination }, (results, status) => {
        if (status === 'OK' && results[0]) {
            destinationLocation = results[0].geometry.location;

            // 지도 이동
            map.setCenter(destinationLocation);
            map.setZoom(16);

            // 기존 마커 제거
            if (destinationMarker) {
                destinationMarker.setMap(null);
            }

            // 목적지 마커 생성
            destinationMarker = new google.maps.Marker({
                position: destinationLocation,
                map: map,
                animation: google.maps.Animation.DROP,
                title: '목적지'
            });

            // 핀 설정 컨트롤 표시
            document.getElementById('pinControls').style.display = 'block';
        } else {
            alert('목적지를 찾을 수 없습니다. 다시 시도해주세요.');
        }
    });
}

// 목적지 핀 설정
function setDestinationPin(location) {
    destinationLocation = location;

    // 기존 핀 제거
    if (currentPin) {
        currentPin.setMap(null);
    }

    // 새 핀 생성
    currentPin = new google.maps.Marker({
        position: location,
        map: map,
        icon: {
            url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
        },
        title: '선택한 목적지'
    });
}

// 핀 확인
function confirmPin() {
    if (!destinationLocation) {
        alert('지도를 클릭하여 목적지를 설정해주세요.');
        return;
    }

    geocoder.geocode({ location: destinationLocation }, (results, status) => {
        if (status === 'OK' && results[0]) {
            document.getElementById('destination').value = results[0].formatted_address;
            appState.destination = {
                address: results[0].formatted_address,
                location: destinationLocation
            };

            document.getElementById('pinControls').style.display = 'none';
            alert('목적지가 설정되었습니다.');
        }
    });
}

// 페이지 전환
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

// 교통수단 정보 로드
function loadTransportInfo(type = 'bus') {
    const listId = type + 'List';
    const listElement = document.getElementById(listId);

    // 샘플 데이터 생성
    let transportData = [];

    switch(type) {
        case 'bus':
            transportData = [
                {
                    type: '고속버스',
                    price: '15,000원',
                    departure: '서울고속버스터미널',
                    arrival: '부산종합버스터미널',
                    time: '4시간 30분',
                    departureTime: '09:00',
                    arrivalTime: '13:30'
                },
                {
                    type: '시외버스',
                    price: '12,000원',
                    departure: '동서울터미널',
                    arrival: '부산서부터미널',
                    time: '5시간',
                    departureTime: '10:00',
                    arrivalTime: '15:00'
                },
                {
                    type: '프리미엄 고속버스',
                    price: '25,000원',
                    departure: '서울고속버스터미널',
                    arrival: '부산종합버스터미널',
                    time: '4시간 15분',
                    departureTime: '08:30',
                    arrivalTime: '12:45'
                }
            ];
            break;
        case 'train':
            transportData = [
                {
                    type: 'KTX',
                    price: '59,800원',
                    departure: '서울역',
                    arrival: '부산역',
                    time: '2시간 40분',
                    departureTime: '09:00',
                    arrivalTime: '11:40'
                },
                {
                    type: 'SRT',
                    price: '52,300원',
                    departure: '수서역',
                    arrival: '부산역',
                    time: '2시간 50분',
                    departureTime: '10:00',
                    arrivalTime: '12:50'
                },
                {
                    type: 'ITX-새마을',
                    price: '42,100원',
                    departure: '서울역',
                    arrival: '부산역',
                    time: '4시간 20분',
                    departureTime: '08:30',
                    arrivalTime: '12:50'
                }
            ];
            break;
        case 'plane':
            transportData = [
                {
                    type: '대한항공',
                    price: '89,000원',
                    departure: '김포공항',
                    arrival: '김해공항',
                    time: '1시간 10분',
                    departureTime: '09:00',
                    arrivalTime: '10:10'
                },
                {
                    type: '아시아나항공',
                    price: '85,000원',
                    departure: '김포공항',
                    arrival: '김해공항',
                    time: '1시간 5분',
                    departureTime: '10:30',
                    arrivalTime: '11:35'
                },
                {
                    type: '제주항공',
                    price: '65,000원',
                    departure: '김포공항',
                    arrival: '김해공항',
                    time: '1시간 10분',
                    departureTime: '11:00',
                    arrivalTime: '12:10'
                }
            ];
            break;
        case 'car':
            transportData = [
                {
                    type: '자가용 (경부고속도로)',
                    price: '통행료 약 45,000원 + 유류비',
                    departure: '출발지',
                    arrival: '목적지',
                    time: '약 4시간 30분',
                    distance: '약 400km'
                }
            ];
            break;
        case 'bike':
            transportData = [
                {
                    type: '자전거 (국토종주 코스)',
                    price: '0원 (무료)',
                    departure: '출발지',
                    arrival: '목적지',
                    time: '약 2-3일',
                    distance: '약 400km',
                    note: '숙박 및 식사 비용 별도'
                }
            ];
            break;
        case 'minTime':
            transportData = [
                {
                    type: '비행기 (대한항공)',
                    price: '89,000원',
                    departure: '김포공항',
                    arrival: '김해공항',
                    time: '1시간 10분',
                    departureTime: '09:00',
                    arrivalTime: '10:10',
                    rank: '1위 - 최단시간'
                },
                {
                    type: 'KTX',
                    price: '59,800원',
                    departure: '서울역',
                    arrival: '부산역',
                    time: '2시간 40분',
                    departureTime: '09:00',
                    arrivalTime: '11:40',
                    rank: '2위'
                },
                {
                    type: 'SRT',
                    price: '52,300원',
                    departure: '수서역',
                    arrival: '부산역',
                    time: '2시간 50분',
                    departureTime: '10:00',
                    arrivalTime: '12:50',
                    rank: '3위'
                }
            ];
            break;
        case 'minCost':
            transportData = [
                {
                    type: '시외버스',
                    price: '12,000원',
                    departure: '동서울터미널',
                    arrival: '부산서부터미널',
                    time: '5시간',
                    departureTime: '10:00',
                    arrivalTime: '15:00',
                    rank: '1위 - 최저비용'
                },
                {
                    type: '고속버스',
                    price: '15,000원',
                    departure: '서울고속버스터미널',
                    arrival: '부산종합버스터미널',
                    time: '4시간 30분',
                    departureTime: '09:00',
                    arrivalTime: '13:30',
                    rank: '2위'
                },
                {
                    type: 'ITX-새마을',
                    price: '42,100원',
                    departure: '서울역',
                    arrival: '부산역',
                    time: '4시간 20분',
                    departureTime: '08:30',
                    arrivalTime: '12:50',
                    rank: '3위'
                }
            ];
            break;
    }

    // 리스트 렌더링
    listElement.innerHTML = transportData.map((item, index) => `
        <div class="transport-item" onclick="selectTransport('${type}', ${index})">
            <div class="transport-header">
                <span class="transport-type">${item.type}</span>
                <span class="transport-price">${item.price}</span>
            </div>
            <div class="transport-details">
                ${item.rank ? `<div style="color: #ea4335; font-weight: 600;">${item.rank}</div>` : ''}
                <div class="transport-route">
                    <span>${item.departure}</span>
                    <span class="route-arrow">→</span>
                    <span>${item.arrival}</span>
                </div>
                <div>소요시간: ${item.time}</div>
                ${item.departureTime ? `<div>출발: ${item.departureTime} | 도착: ${item.arrivalTime}</div>` : ''}
                ${item.distance ? `<div>거리: ${item.distance}</div>` : ''}
                ${item.note ? `<div style="color: #ea4335; font-size: 12px;">${item.note}</div>` : ''}
            </div>
        </div>
    `).join('');
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

    const request = {
        origin: appState.departure.location,
        destination: appState.destination.location,
        travelMode: google.maps.TravelMode.DRIVING
    };

    directionsService.route(request, (result, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(result);
        } else {
            console.error('경로를 표시할 수 없습니다:', status);
        }
    });
}

// 윈도우 로드 시 초기화
window.showPage = showPage;
