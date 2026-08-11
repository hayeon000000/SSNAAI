// 건물별 혼잡도 데이터를 가져오는 API 래퍼.
// GET /api/home/map (main 브랜치 app/routers/home.py 확인) 사용.
// 응답: { base_time, buildings: [{ building_id, current_level: 'LOW'|'MODERATE'|'HIGH', ... }] }

import { API_BASE_URL } from './apiConfig';
import { MAP_ID_TO_BACKEND_ID } from './buildings';

// 기대하는 최종 반환 형태: { [mapId: string]: 'congested' | 'normal' | 'relaxed' }
// 색상은 CampusMap.jsx의 congestion.js 톤다운 팔레트를 그대로 씀
// (백엔드가 주는 color 필드는 원색이라 보라 테마랑 안 어울려서 안 씀).

// backend building_id → 프론트 지도 id (buildings.js MAP_ID_TO_BACKEND_ID의 역방향)
const BACKEND_ID_TO_MAP_IDS = Object.entries(MAP_ID_TO_BACKEND_ID).reduce((acc, [mapId, backendId]) => {
  (acc[backendId] ??= []).push(mapId);
  return acc;
}, {});

const LEVEL_TO_CONGESTION = {
  HIGH: 'congested',
  MODERATE: 'normal',
  LOW: 'relaxed',
};

export async function fetchCongestion() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/home/map`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });
    if (!res.ok) throw new Error('Failed to fetch congestion');
    const payload = await res.json();
    const buildings = payload.buildings ?? [];

    const result = {};
    for (const b of buildings) {
      const mapIds = BACKEND_ID_TO_MAP_IDS[b.building_id];
      if (!mapIds) continue; // UNJEONG, GLOBAL, MEDIA, PRIME 등 지도에 없는 건물은 무시

      const level = LEVEL_TO_CONGESTION[b.current_level] ?? 'relaxed';
      for (const mapId of mapIds) {
        result[mapId] = level; // 수정관 A/B/C, 조형1/2관처럼 여러 지도 id가 같은 backend 건물을 공유
      }
    }
    return result;
  } catch (err) {
    console.error('[congestionApi] /api/home/map 연동 실패:', err);
    if (import.meta.env.DEV) return MOCK_CONGESTION;
    return null;
  }
}

const MOCK_CONGESTION = {
  studentUnion: 'relaxed',
  nanhyang: 'normal',
  seongshinHall: 'congested',
  sujeongA: 'normal',
  sujeongB: 'normal',
  sujeongC: 'normal',
};