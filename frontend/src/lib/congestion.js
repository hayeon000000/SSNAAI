// 건물 혼잡도 단계와 지도에 표시할 색상.
// 너무 쨍하지 않은, 톤 다운된 색으로 기존 보라색 테마와 어울리게 한다.
export const CONGESTION_COLORS = {
  congested: '#d99a92', // 혼잡 - 톤 다운된 레드
  normal: '#d9c37a', // 보통 - 톤 다운된 옐로우
  relaxed: '#93b58f', // 여유 - 톤 다운된 그린
};

export const CONGESTION_LABELS = {
  congested: '혼잡',
  normal: '보통',
  relaxed: '여유',
};

// 혼잡도 데이터가 아직 없는 건물에 쓰는 중립색(기존 지도 기본색과 동일).
export const DEFAULT_BUILDING_COLOR = '#f4ebf7';
