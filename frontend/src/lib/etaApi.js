// 목적지까지의 예상 소요시간을 가져오는 API 래퍼.
// 백엔드가 준비되면 아래 fetchEta 함수 내부만 실제 요청으로 교체하면 된다.
//
// 기대하는 응답 형태:
// {
//   etaMinutes: number,               // 선택한 이동수단 기준 소요시간(분)
//   alternative: {                    // 단일 이동수단을 선택했을 때만 의미 있음
//     transport: '엘베만' | '계단만',
//     etaMinutes: number,
//     steps: [{ from: string, to: string, minutes: number }],
//   } | null,
// }

// eslint-disable-next-line no-unused-vars -- transport는 백엔드 연동 시 요청 바디에 사용된다.
export async function fetchEta({ destination, transport }) {
  if (!destination) return null;

  // TODO(backend): 아래 mock을 실제 API 호출로 교체
  // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
  // const res = await fetch(`${API_BASE_URL}/api/eta`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ destination, transport }),
  // });
  // if (!res.ok) throw new Error('Failed to fetch ETA');
  // return res.json();

  return null;
}
