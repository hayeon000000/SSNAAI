// 건물 관련 매핑을 한 곳에서 관리한다. (예전엔 congestionApi.js, CampusMap.jsx에 따로
// 있었는데 서로 다르게 짜여서 꼬였음 — 이제 여기 하나만 보면 됨)
//
// 백엔드 공식 건물 목록 (app/services/data_store.py 기준, main 브랜치 확인):
//   SOOJUNG 수정관 · SUNGSHIN 성신관 · NANHYANG 난향관 · UNJEONG 운정그린캠퍼스
//   PRIME 프라임관 · STUDENT_HALL 학생회관 · JOHYUNG 조형관 · MUSIC 음악관
//   MEDIA 미디어정보관 · GLOBAL 국제교육관 · GYM 체육관

// 목적지선택 화면(DestinationScreen)의 한글 건물명 → 백엔드 building_id.
// ⚠️ 수정관 A/B/C는 backend엔 SOOJUNG 하나뿐이라 셋 다 같은 곳으로 묶임.
// ⚠️ 조형1관/조형2관도 JOHYUNG 하나로 묶임.
// ⚠️ 도서관/행정관은 backend 건물 목록에 아예 없음 — null로 표시, 관련 기능(경로추천 등) 스킵됨.
export const BUILDING_NAME_TO_BACKEND_ID = {
  성신관: 'SUNGSHIN',
  학생회관: 'STUDENT_HALL',
  난향관: 'NANHYANG',
  수정관A: 'SOOJUNG',
  수정관B: 'SOOJUNG',
  수정관C: 'SOOJUNG',
  조형1관: 'JOHYUNG',
  조형2관: 'JOHYUNG',
  음악관: 'MUSIC',
  체육관: 'GYM',
  도서관: null,
  행정관: null,
};

// CampusMap.jsx SVG 건물 id → 백엔드 building_id. (같은 이유로 수정관 A/B/C, 조형1/2관은 통합)
export const MAP_ID_TO_BACKEND_ID = {
  studentUnion: 'STUDENT_HALL',
  seongshinHall: 'SUNGSHIN',
  nanhyang: 'NANHYANG',
  sujeongA: 'SOOJUNG',
  sujeongB: 'SOOJUNG',
  sujeongC: 'SOOJUNG',
  musicHall: 'MUSIC',
  artHall1: 'JOHYUNG',
  artHall2: 'JOHYUNG',
  // library, adminHall: backend에 대응 건물 없음 — 매핑 안 함(항상 중립색/클릭 무반응)
};

// 백엔드 building_id → 한글 이름 (팝업/배지 등에 표시용)
export const BACKEND_ID_TO_NAME = {
  SOOJUNG: '수정관',
  SUNGSHIN: '성신관',
  NANHYANG: '난향관',
  UNJEONG: '운정그린캠퍼스',
  PRIME: '프라임관',
  STUDENT_HALL: '학생회관',
  JOHYUNG: '조형관',
  MUSIC: '음악관',
  MEDIA: '미디어정보관',
  GLOBAL: '국제교육관',
  GYM: '체육관',
};

// 목적지선택 화면의 이동수단 라벨 → 백엔드 RouteMode enum
export const TRANSPORT_TO_ROUTE_MODE = {
  엘베만: 'ELEVATOR_ONLY',
  '엘베+계단': 'STAIRS_AND_ELEVATOR',
  계단만: 'STAIRS_ONLY',
};

// 경로 추천 API(from_building_id/from_floor)에 쓸 기본 출발 위치.
// 학생회관(STUDENT_HALL)으로 고정 — 사용자가 실제 어디 있는지는 추적 안 함(요청사항),
// 캠퍼스 정문에서 가까운 학생회관을 출발 기준으로 삼음.
export const DEFAULT_ORIGIN = { buildingId: 'STUDENT_HALL', floor: 1 };