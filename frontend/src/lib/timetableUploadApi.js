// 에브리타임 시간표 스크린샷을 업로드해서 과목 목록을 추출하는 API 래퍼.
// POST /api/timetable/upload (Timetable api.py, 포트 5002) 사용.

import { TIMETABLE_UPLOAD_BASE_URL } from './apiConfig';

// 반환 형태 (Timetable api.py 기준):
// { success: true, timetable: { semester: '2026년 1학기', subjects: [{ subject, day, start_time, end_time, room }] } }
// 실패 시 에러를 throw한다 — 화면단에서 try/catch로 처리.
export async function uploadTimetableImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${TIMETABLE_UPLOAD_BASE_URL}/api/timetable/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.success) {
    throw new Error(data?.error ?? '시간표 인식에 실패했어요.');
  }

  return data.timetable; // { semester, subjects: [...] }
}