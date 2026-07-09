// 성신여자대학교 수정캠퍼스 건물 배치를 단순화한 스키매틱 지도.
// 혼잡도 대상 건물(학생회관, 난향관, 성신관, A, B, C)의 좌표/치수만 정의하고,
// 실제 혼잡도 값은 백엔드 연동 전까지 congestionData 목업으로 대체한다.
const BUILDINGS = [
  { id: 'studentUnion', name: '학생회관', x: 14, y: 92, width: 58, height: 26 },
  { id: 'nanhyang', name: '난향관', x: 20, y: 128, width: 64, height: 26 },
  { id: 'seongsin', name: '성신관', x: 112, y: 196, width: 100, height: 38 },
  { id: 'C', name: 'C', x: 222, y: 204, width: 44, height: 32 },
  { id: 'B', name: 'B', x: 214, y: 248, width: 46, height: 34 },
  { id: 'A', name: 'A', x: 206, y: 296, width: 48, height: 36 },
];

// 혼잡도 표시가 필요 없는 주변 건물은 회색 배경으로만 그려 지도의 맥락을 유지한다.
const CONTEXT_BUILDINGS = [
  { name: '조형1관', x: 108, y: 38, width: 100, height: 32 },
  { name: '조형2관', x: 113, y: 108, width: 96, height: 30 },
  { name: '음악관', x: 158, y: 146, width: 36, height: 24 },
  { name: '행정관', x: 8, y: 194, width: 60, height: 55 },
  { name: '중도', x: 54, y: 310, width: 56, height: 40 },
  { name: '성신별관', x: 6, y: 320, width: 50, height: 70 },
  { name: '과학관', x: 188, y: 392, width: 100, height: 30 },
  { name: '체육관', x: 188, y: 428, width: 100, height: 24 },
];

// 목적지 선택 화면의 표기와 지도 상 건물명이 다른 경우의 별칭.
const DESTINATION_ALIASES = {
  도서관: '중도',
  수정관A: 'A',
  수정관B: 'B',
  수정관C: 'C',
};

const ROAD_PATH =
  'M50,14 C42,68 38,128 55,178 C72,228 95,254 112,310 C128,360 150,396 168,456';

// 실제 혼잡도는 백엔드 API 연동 후 이 목업을 대체한다.
export const MOCK_CONGESTION = {
  studentUnion: 'busy',
  nanhyang: 'good',
  seongsin: 'normal',
  A: 'good',
  B: 'busy',
  C: 'normal',
};

const LEVEL_FILL = {
  good: '#86efac',
  normal: '#fde68a',
  busy: '#fca5a5',
};

const LEVEL_TEXT = {
  good: '#052e16',
  normal: '#422006',
  busy: '#7f1d1d',
};

const START_BUILDING_NAME = '학생회관';
const ROUTE_MARKER_COLOR = '#c8a8e9';

function buildingCenter(name) {
  const resolvedName = DESTINATION_ALIASES[name] ?? name;
  const building =
    BUILDINGS.find((b) => b.name === resolvedName) ??
    CONTEXT_BUILDINGS.find((b) => b.name === resolvedName);
  if (!building) return null;
  return { x: building.x + building.width / 2, y: building.y + building.height / 2 };
}

// start-end를 완만한 2차 베지어 곡선으로 잇고, 곡선을 따라 발자국 마커를 등간격 배치한다.
function buildRouteMarkers(start, end, markerCount = 8) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const perpX = -dy / length;
  const perpY = dx / length;
  const bow = length * 0.22;
  const control = {
    x: (start.x + end.x) / 2 + perpX * bow,
    y: (start.y + end.y) / 2 + perpY * bow,
  };

  const markers = [];
  for (let i = 1; i <= markerCount; i += 1) {
    const t = i / (markerCount + 1);
    const mt = 1 - t;
    const x = mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x;
    const y = mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y;
    const tx = 2 * mt * (control.x - start.x) + 2 * t * (end.x - control.x);
    const ty = 2 * mt * (control.y - start.y) + 2 * t * (end.y - control.y);
    const angle = (Math.atan2(ty, tx) * 180) / Math.PI;
    markers.push({ x, y, angle });
  }
  return markers;
}

function RouteMarker({ x, y, angle }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(0.55) translate(-12.76 -12.5)`}>
      <path
        d="M11.1704 7.4522L10.874 7.25716C10.7955 7.52894 10.6935 7.78475 10.5719 8.02622L10.716 7.99733L13.4362 10.6875L9.63006 10.6358L9.07312 9.78509C8.08107 10.5471 6.84643 11.0457 5.67644 11.3691C3.11229 12.0777 0.158321 9.30673 0.0999217 5.97444C0.0417076 2.64207 3.1185 -0.114497 5.48354 0.326814C6.71227 0.556214 8.15379 1.12107 9.26372 2.07746L9.31049 1.73577L12.7227 0.0323576L11.4174 3.64262L10.6258 3.84202C10.7547 4.12069 10.8565 4.41729 10.9304 4.73137L11.1224 4.59518L14.6791 5.96296L11.1704 7.4522Z"
        fill={ROUTE_MARKER_COLOR}
      />
      <path
        d="M21.9204 20.8899L21.624 20.6949C21.5455 20.9666 21.4434 21.2224 21.3219 21.4639L21.466 21.435L24.1862 24.1252L20.3801 24.0735L19.8231 23.2228C18.8311 23.9848 17.5964 24.4834 16.4264 24.8068C13.8623 25.5154 10.9083 22.7444 10.8499 19.4121C10.7917 16.0798 13.8685 13.3232 16.2335 13.7645C17.4623 13.9939 18.9038 14.5588 20.0137 15.5152L20.0605 15.1735L23.4727 13.4701L22.1674 17.0803L21.3758 17.2797C21.5047 17.5584 21.6065 17.855 21.6804 18.1691L21.8724 18.0329L25.4291 19.4007L21.9204 20.8899Z"
        fill={ROUTE_MARKER_COLOR}
      />
    </g>
  );
}

export default function CampusMap({ congestionData = MOCK_CONGESTION, routeTo }) {
  const start = buildingCenter(START_BUILDING_NAME);
  const end = routeTo ? buildingCenter(routeTo) : null;
  const routeMarkers = start && end && routeTo !== START_BUILDING_NAME ? buildRouteMarkers(start, end) : [];

  return (
    <svg viewBox="0 0 300 460" className="w-full h-full" role="img" aria-label="캠퍼스 건물 혼잡도 지도">
      <rect x="0" y="0" width="300" height="460" fill="#3f3f46" />

      <path d={ROAD_PATH} fill="none" stroke="#52525b" strokeWidth="7" strokeLinecap="round" />

      {CONTEXT_BUILDINGS.map(({ name, x, y, width, height }) => (
        <g key={name}>
          <rect x={x} y={y} width={width} height={height} rx="5" fill="#525259" />
          <text
            x={x + width / 2}
            y={y + height / 2}
            fill="#a1a1aa"
            fontSize="9"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {name}
          </text>
        </g>
      ))}

      {BUILDINGS.map(({ id, name, x, y, width, height }) => {
        const level = congestionData[id];
        const fill = LEVEL_FILL[level] ?? '#71717a';
        const textColor = LEVEL_TEXT[level] ?? '#ffffff';
        return (
          <g key={id}>
            <rect x={x} y={y} width={width} height={height} rx="6" fill={fill} stroke="#18181b" strokeWidth="1" />
            <text
              x={x + width / 2}
              y={y + height / 2}
              fill={textColor}
              fontSize="11"
              fontWeight="600"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {name}
            </text>
          </g>
        );
      })}

      {routeMarkers.map((marker, i) => (
        <RouteMarker key={i} x={marker.x} y={marker.y} angle={marker.angle} />
      ))}
    </svg>
  );
}
