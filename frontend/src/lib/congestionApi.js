// 건물별 혼잡도 데이터를 가져오는 API 래퍼.
// 백엔드가 준비되면 아래 fetchCongestion 함수 내부만 실제 요청으로 교체하면 된다.
//
// 기대하는 응답 형태:
// {
//   [buildingId: string]: 'congested' | 'normal' | 'relaxed'
// }
// buildingId는 CampusMap.jsx의 CONGESTION_ENABLED_IDS(학생회관/난향관/성신관/수정관A·B·C)
// 중 하나여야 한다. 그 외 건물은 데이터가 와도 무시된다.

export async function fetchCongestion() {
  // TODO(backend): 아래 mock을 실제 API 호출로 교체
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
  // const res = await fetch(`${API_BASE_URL}/api/congestion`);
  // if (!res.ok) throw new Error('Failed to fetch congestion');
  // return res.json();

  // 백엔드 연동 전까지는 개발 중 화면 확인용 mock 데이터를 보여준다.
  // 위 fetch로 교체하면 이 블록은 더 이상 쓰이지 않는다.
  if (import.meta.env.DEV) return MOCK_CONGESTION;
  return null;
}

const MOCK_CONGESTION = {
  studentUnion: 'relaxed',
  nanhyang: 'normal',
  seongshinHall: 'congested',
  sujeongA: 'normal',
  sujeongB: 'relaxed',
  sujeongC: 'relaxed',
};
