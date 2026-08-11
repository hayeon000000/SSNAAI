// 계단 인증 촬영이 끝난 뒤, 정지 프레임 1장을 Timetable api.py(같은 Gemini 서버, 포트 5002)로
// 보내서 "이거 진짜 계단 맞아?"만 가볍게 물어본다. 완전 엉뚱한 장면을 걸러내는 용도.

import { TIMETABLE_UPLOAD_BASE_URL } from './apiConfig';

// dataUrl(캔버스 toDataURL 결과)을 Blob으로 변환
async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}

export async function verifyStairPhoto(dataUrl) {
  const blob = await dataUrlToBlob(dataUrl);
  const formData = new FormData();
  formData.append('image', blob, 'stair.jpg');

  const res = await fetch(`${TIMETABLE_UPLOAD_BASE_URL}/api/stair-verify`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    throw new Error(data?.error ?? '계단 인증에 실패했어요.');
  }

  return { isStairs: data.is_stairs, reason: data.reason };
}