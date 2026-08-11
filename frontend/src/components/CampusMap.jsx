// Figma(SSNAAI 홈화면, node-id 176:453)의 캠퍼스 일러스트에
// 건물 이름과 혼잡도 색상을 표시한다. 도형 좌표는 원본 Figma 익스포트 그대로다.
import { useState } from 'react';
import { CONGESTION_COLORS, DEFAULT_BUILDING_COLOR } from '../lib/congestion';
import { getBuildingDetail } from '../lib/api';
import { MAP_ID_TO_BACKEND_ID } from '../lib/buildings';

// 단순 사각형 블록(그림자만 있는 평면 사각형).
const BUILDINGS = [
  { id: 'sujeongA', label: '수정관A', x: 276, y: 435, width: 52, height: 28 },
  { id: 'sujeongB', label: '수정관B', x: 275, y: 485, width: 65, height: 27 },
  { id: 'sujeongC', label: '수정관C', x: 273, y: 533, width: 61, height: 25 },
  { id: 'seongshinHall', label: '성신관', x: 140, y: 409, width: 122, height: 40 },
  { id: 'library', label: '중앙도서관', x: 86, y: 544, width: 73, height: 30 },
  { id: 'studentUnion', label: '학생회관', x: 54, y: 288, width: 16, height: 59, vertical: true },
  { id: 'nanhyang', label: '난향관', x: 76, y: 281, width: 20, height: 103, vertical: true },
];

// 복합 도형(꺾인 형태). translate는 원본 Figma 좌표계 기준, labelOffset은 도형 안에서
// 이름표를 올릴 대략적인 중심점(도형 로컬 좌표).
const COMPLEX_SHAPES = [
  {
    id: 'adminHall',
    label: '행정관',
    translate: [52.5, 390],
    d: 'M18.5 0H38.5V71H4V46H18.5V0Z',
    labelOffset: [25, 35],
    vertical: true,
  },
  {
    id: 'artHall2',
    label: '조형2관',
    translate: [76.5, 192],
    d: 'M14.5 0L61 66.5H113.5V84H39V71.5L4 7.5L14.5 0Z',
    labelOffset: [76, 78],
  },
  {
    id: 'artHall1',
    label: '조형1관',
    translate: [112, 308],
    d: 'M4 28.5H31V0H83V22H56V32.5H83V51.5H4V28.5Z',
    labelOffset: [43, 42],
  },
  {
    id: 'musicHall',
    label: '음악관',
    translate: [196, 347],
    d: 'M4 0H26V24H62V43H4V0Z',
    labelOffset: [33, 33],
  },
];

// 혼잡도를 제공하는 건물만 이 목록에 포함한다. 나머지 건물은 congestion 데이터가
// 와도 무시하고 항상 중립색으로 표시한다.
const CONGESTION_ENABLED_IDS = new Set([
  'studentUnion',
  'nanhyang',
  'seongshinHall',
  'sujeongA',
  'sujeongB',
  'sujeongC',
]);

function colorForBuilding(id, congestion) {
  if (!CONGESTION_ENABLED_IDS.has(id)) return DEFAULT_BUILDING_COLOR;
  const level = congestion?.[id];
  return level ? CONGESTION_COLORS[level] : DEFAULT_BUILDING_COLOR;
}

export default function CampusMap({ congestion, showLabels = true }) {
  const [popup, setPopup] = useState(null); // { id, label, status: 'loading'|'ready'|'error'|'unsupported', detail }

  const handleBuildingClick = async (id, label) => {
    if (!CONGESTION_ENABLED_IDS.has(id)) return; // 혼잡도 미지원 건물은 팝업 안 띄움

    const backendId = MAP_ID_TO_BACKEND_ID[id];
    if (!backendId) {
      // library, adminHall 등 — backend에 대응 건물 자체가 없음
      setPopup({ id, label, status: 'unsupported', detail: null });
      return;
    }

    setPopup({ id, label, status: 'loading', detail: null });
    try {
      const detail = await getBuildingDetail(backendId);
      setPopup({ id, label, status: 'ready', detail });
    } catch (err) {
      console.error('[CampusMap] 건물 상세 조회 실패:', err);
      setPopup({ id, label, status: 'error', detail: null });
    }
  };
  return (
    <div className="relative w-full h-full">
      <svg viewBox="44 182 294 402" className="w-full h-full" role="img" aria-label="캠퍼스 지도(건물별 혼잡도 표시)">
        <defs>
          <filter id="mapShapeShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="2" floodColor="#a78bba" floodOpacity="0.5" />
          </filter>
        </defs>

        <g filter="url(#mapShapeShadow)">
          {BUILDINGS.map(({ id, label, x, y, width, height }) => (
            <rect
              key={id}
              x={x}
              y={y}
              width={width}
              height={height}
              fill={colorForBuilding(id, congestion)}
              stroke="#c9b8d6"
              strokeWidth="0.5"
              onClick={() => handleBuildingClick(id, label)}
              style={{ cursor: CONGESTION_ENABLED_IDS.has(id) ? 'pointer' : 'default' }}
            />
          ))}

          {COMPLEX_SHAPES.map(({ id, label, translate, d }) => (
            <path
              key={id}
              d={d}
              fill={colorForBuilding(id, congestion)}
              stroke="#c9b8d6"
              strokeWidth="0.5"
              transform={`translate(${translate[0]} ${translate[1]})`}
              onClick={() => handleBuildingClick(id, label)}
              style={{ cursor: CONGESTION_ENABLED_IDS.has(id) ? 'pointer' : 'default' }}
            />
          ))}
        </g>

        {showLabels && (
          <g fontSize="9" fontWeight="600" fill="#4a3b57">
            {BUILDINGS.map(({ id, label, x, y, width, height, vertical }) => (
              <text
                key={id}
                x={x + width / 2}
                y={y + height / 2}
                textAnchor="middle"
                dominantBaseline="central"
                style={vertical ? { writingMode: 'vertical-rl', textOrientation: 'upright' } : undefined}
              >
                {label}
              </text>
            ))}

            {COMPLEX_SHAPES.map(({ id, label, translate, labelOffset, vertical }) => (
              <text
                key={id}
                x={translate[0] + labelOffset[0]}
                y={translate[1] + labelOffset[1]}
                textAnchor="middle"
                dominantBaseline="central"
                style={vertical ? { writingMode: 'vertical-rl', textOrientation: 'upright' } : undefined}
              >
                {label}
              </text>
            ))}
          </g>
        )}
      </svg>

      {popup && (
        <div className="absolute inset-x-2 bottom-2 rounded-2xl bg-white/95 shadow-lg px-4 py-3 text-[#4a3b57]">
          <div className="flex items-start justify-between">
            <p className="font-semibold text-sm">{popup.label}</p>
            <button
              type="button"
              onClick={() => setPopup(null)}
              aria-label="닫기"
              className="text-[#a78bba] text-xs"
            >
              ✕
            </button>
          </div>

          {popup.status === 'loading' && (
            <p className="text-xs mt-1 text-[#a78bba]">불러오는 중...</p>
          )}

          {popup.status === 'error' && (
            <p className="text-xs mt-1 text-red-500">정보를 불러오지 못했어요.</p>
          )}

          {popup.status === 'unsupported' && (
            <p className="text-xs mt-1 text-[#a78bba]">이 건물은 혼잡도 데이터가 아직 없어요.</p>
          )}

          {popup.status === 'ready' && popup.detail && (
            <div className="text-xs mt-1 flex flex-col gap-0.5">
              <p>
                현재 혼잡도:{' '}
                <span className="font-medium">{popup.detail.congestion?.current_label ?? '정보 없음'}</span>
              </p>
              <p>
                예상 대기시간:{' '}
                <span className="font-medium">
                  {popup.detail.congestion?.expected_wait_seconds != null
                    ? `${Math.round(popup.detail.congestion.expected_wait_seconds / 60)}분`
                    : '정보 없음'}
                </span>
              </p>
              {popup.detail.recommendation_message && (
                <p className="mt-1 text-[#a78bba]">{popup.detail.recommendation_message}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
