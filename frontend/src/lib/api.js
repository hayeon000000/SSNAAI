// 정민이 백엔드 main 브랜치(FastAPI, app/routers/*.py + app/models/schemas.py)를
// 직접 읽고 그대로 맞춘 API 클라이언트. 2026-08-05 기준 main 브랜치 코드 확인함.
//
// ⚠️ 남은 확인 필요 사항:
//   - 사용자 프로필에 nickname/department/studentYear/password 개념이 아예 없음
//     (UserProfileResponse는 student_id/timetable/favorite_places/rewards뿐).
//     ProfileScreen·PasswordChangeScreen이 쓰던 필드들은 백엔드에 대응 API가 없음 — 로컬에서만 도는 중.
//   - 경로 추천은 출발지(from_building_id/floor)가 필요한데 프론트에 위치 추적 기능이 없어서
//     기본값(수정관 1층, DEFAULT_ORIGIN) 고정으로 감 — 사용자 확인: 출발지 안 중요하다고 함.

import { API_BASE_URL } from './apiConfig';

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      // ngrok 무료 플랜은 브라우저 요청에 경고 페이지(HTML)를 먼저 보여주는데,
      // 거기엔 CORS 헤더가 없어서 "CORS 에러"로 보임. 이 헤더로 그 경고를 건너뛴다.
      'ngrok-skip-browser-warning': 'true',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new Error(`[api] ${method} ${path} 실패 (${res.status}): ${message}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// 1. 홈 화면 지도 ─────────────────────────────────────────
// 응답: { base_time, buildings: [{ building_id, building_name, current_level,
//         current_label, current_score, expected_wait_seconds, color, recommend_stairs, ... }] }
export function getHomeMap() {
  return request('/api/home/map');
}

// 2. 건물 선택 상세 ───────────────────────────────────────
// 응답: { congestion: {...위 buildings 항목과 동일 구조...}, nearby_classes: [...], recommendation_message }
export function getBuildingDetail(buildingId) {
  return request(`/api/buildings/${encodeURIComponent(buildingId)}`);
}

// 3. 목적지 선택 / 경로 추천 ──────────────────────────────
// GET 방식. 필수 파라미터: from_building_id, from_floor, to_building_id, to_floor.
// mode는 'ELEVATOR_ONLY' | 'STAIRS_AND_ELEVATOR' | 'STAIRS_ONLY' (선택).
export function getRouteRecommendation({ fromBuildingId, fromFloor, toBuildingId, toFloor, mode }) {
  const params = {
    from_building_id: fromBuildingId,
    from_floor: fromFloor,
    to_building_id: toBuildingId,
    to_floor: toFloor,
  };
  if (mode) params.mode = mode;
  const qs = new URLSearchParams(params).toString();
  return request(`/api/routes/recommend?${qs}`);
}

// 4. 학번 로그인 ──────────────────────────────────────────
// body: { student_id } 만 있으면 됨 (이름/비밀번호 없음, 없는 학번이면 자동 생성됨).
// 응답: { student_id, rewards: {...} }
export function login(studentId, password) {
  return request('/api/users/login', {
    method: 'POST',
    body: { student_id: studentId, password: password },
  });
}

// 5. 사용자 프로필 조회 ───────────────────────────────────
// 응답: { student_id, timetable: [...], favorite_places: [...], rewards: {...} }
// ⚠️ nickname/department 등은 없음.
export function getUserProfile(studentId) {
  return request(`/api/users/${encodeURIComponent(studentId)}`);
}

// 5-1. 기존 비밀번호 확인 ───────────────────────────────────
// 정민이 auth.py 스펙: POST /api/users/{id}/password/verify
// 요청: { current_password }
// 응답: 200 { verified: true, message } / 401 { detail: "기존 비밀번호가 일치하지 않습니다." }
export function verifyPassword(studentId, currentPassword) {
  return request(`/api/users/${encodeURIComponent(studentId)}/password/verify`, {
    method: 'POST',
    body: { currentPassword: currentPassword },
  });
}

// 5-2. 비밀번호 변경 ────────────────────────────────────────
// 정민이 auth.py 스펙: PATCH /api/users/{id}/password
// 요청: { current_password, new_password }
export function changePassword(studentId, currentPassword, newPassword) {
  return request(`/api/users/${encodeURIComponent(studentId)}/password`, {
    method: 'PATCH',
    body: { currentPassword: currentPassword, newPassword: newPassword },
  });
}

// 5-3. 사용자 프로필 수정 (닉네임, 학과 등)
export function updateUserProfile(studentId, profileData) {
  return request(`/api/users/${encodeURIComponent(studentId)}/profile`, {
    method: 'PATCH',
    body: profileData, // 예: { nickname: "하연", department: "AI융합학부 지능형IoT전공" }
  });
}

// 6. 시간표 등록 ──────────────────────────────────────────
// ⚠️ 한 번에 "과목 하나"만 등록됨(스펙 문서의 "시간표 등록"은 사실 "수업 한 개 추가").
// 여러 과목 저장하려면 이 함수를 과목 수만큼 반복 호출해야 함.
// body: { subject, day, start_time('HH:MM:SS'), end_time, building_id?, room, floor?, preferred_route_mode? }
// building_id/floor를 안 주면 백엔드가 room으로 알아서 추정해줌.
export function addTimetableEntry(studentId, entry) {
  return request(`/api/users/${encodeURIComponent(studentId)}/timetable`, {
    method: 'POST',
    body: entry,
  });
}

// 7. 즐겨찾기 등록 ────────────────────────────────────────
// ⚠️ 한 번에 "장소 하나"만 등록됨. body: { place_id } (건물 id를 그대로 씀).
export function addFavorite(studentId, placeId) {
  return request(`/api/users/${encodeURIComponent(studentId)}/favorites`, {
    method: 'POST',
    body: { place_id: placeId },
  });
}

// 8. 계단 이용 기록 / 보상 ────────────────────────────────
// body: { floors } (1~50)
export function logStairUse(studentId, floors = 1) {
  return request(`/api/users/${encodeURIComponent(studentId)}/stair-uses`, {
    method: 'POST',
    body: { floors },
  });
}

// 9. 보상 화면 ────────────────────────────────────────────
// 응답: { stair_use_floors, reward_points, suyong_health, badges: [...] }
export function getRewards(studentId) {
  return request(`/api/users/${encodeURIComponent(studentId)}/rewards`);
}

// 10. 시간표 기반 다음 루트 추천 ──────────────────────────
// 응답 형태는 #3(경로 추천)과 동일 (RouteRecommendationResponse)
export function getNextRoute(studentId) {
  return request(`/api/users/${encodeURIComponent(studentId)}/next-route`);
}

// 11. 알림 설정 ───────────────────────────────────────────
// body: { student_id, building_id, floor?, starts_at?('HH:MM:SS'), ends_at?, threshold_score(0~100, 기본 70) }
export function createAlertSetting(payload) {
  return request('/api/alerts', { method: 'POST', body: payload });
}

// 12. 알림 목록 조회 ──────────────────────────────────────
// 응답: [{ alert_id, student_id, building_id, floor, starts_at, ends_at, threshold_score, enabled }]
export function getAlerts(studentId) {
  return request(`/api/alerts/user/${encodeURIComponent(studentId)}`);
}

// 13. 활성 알림 조회 ──────────────────────────────────────
// 응답: [{ alert_id, building_id, floor, current_score, predicted_score_after_10_min, active, message }]
// message는 백엔드가 이미 문장으로 만들어서 줌 — 그대로 표시하면 됨.
export function getActiveAlerts(studentId) {
  return request(`/api/alerts/user/${encodeURIComponent(studentId)}/active`);
}

// 14. 수업 검색 ───────────────────────────────────────────
export function searchSchedules({ keyword, buildingId, limit = 30 } = {}) {
  const params = {};
  if (keyword) params.keyword = keyword;
  if (buildingId) params.building_id = buildingId;
  params.limit = limit;
  const qs = new URLSearchParams(params).toString();
  return request(`/api/schedules/search?${qs}`);
}

// 15. 데이터 요약 ─────────────────────────────────────────
export function getDataSummary() {
  return request('/api/data/summary');
}
