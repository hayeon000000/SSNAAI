// 목적지까지의 예상 소요시간을 가져오는 API 래퍼.
// GET /api/routes/recommend (main 브랜치 app/routers/routes.py 확인) 사용.
//
// ⚠️ 이 API는 출발지(from_building_id/from_floor)가 꼭 필요한데 프론트엔 현재 위치를
// 고르는 UI가 없음. 사용자 확인: "출발지는 안 중요하고 목적지 혼잡도 기반 추천만 되면 됨"
// → DEFAULT_ORIGIN(수정관 1층) 고정해서 요청함.
//
// ⚠️ 백엔드 steps는 문자열 배열(예: "처음 3개 층은 계단 이용")이라
// ResultScreen이 기대하던 {from,to,minutes} 구조가 아님 — 문자열 그대로 쓰도록
// ResultScreen.jsx도 같이 고쳤음.

import { getRouteRecommendation } from './api';
import { BUILDING_NAME_TO_BACKEND_ID, TRANSPORT_TO_ROUTE_MODE, DEFAULT_ORIGIN } from './buildings';

const OPPOSITE_MODE = {
  ELEVATOR_ONLY: 'STAIRS_ONLY',
  STAIRS_ONLY: 'ELEVATOR_ONLY',
};

export async function fetchEta({ destination, transport }) {
  if (!destination) return null;

  const toBuildingId = BUILDING_NAME_TO_BACKEND_ID[destination];
  if (!toBuildingId) {
    console.warn(`[etaApi] "${destination}"은 backend에 매핑된 건물이 없어요.`);
    return null;
  }

  const singleMode =
    Array.isArray(transport) && transport.length === 1 ? TRANSPORT_TO_ROUTE_MODE[transport[0]] : null;
  const mode = singleMode ?? 'STAIRS_AND_ELEVATOR';

  const baseParams = {
    fromBuildingId: DEFAULT_ORIGIN.buildingId,
    fromFloor: DEFAULT_ORIGIN.floor,
    toBuildingId,
    toFloor: 1, // TODO: 목적지 층 선택 UI 없음 — 일단 1층 고정
  };

  try {
    const result = await getRouteRecommendation({ ...baseParams, mode });

    // 이동수단을 정확히 하나만 골랐을 때만 "반대 수단이면?" 비교용으로 한 번 더 조회
    let alternative = null;
    if (singleMode && OPPOSITE_MODE[singleMode]) {
      try {
        const altResult = await getRouteRecommendation({ ...baseParams, mode: OPPOSITE_MODE[singleMode] });
        alternative = { etaMinutes: altResult.estimated_minutes, steps: altResult.steps ?? [] };
      } catch (err) {
        console.error('[etaApi] 대안 경로 조회 실패:', err);
      }
    }

    return {
      etaMinutes: result.estimated_minutes,
      message: result.message,
      stairsRecommended: result.stairs_recommended,
      steps: result.steps ?? [],
      alternative,
    };
  } catch (err) {
    console.error('[etaApi] /api/routes/recommend 연동 실패:', err);
    return null;
  }
}