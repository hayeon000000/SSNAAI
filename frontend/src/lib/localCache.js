// 즐겨찾기/시간표 "조회" API가 백엔드에 없어서(등록만 있음), 저장 성공할 때마다
// 브라우저 localStorage에도 같이 남겨서 화면 표시용으로 쓴다.
// ⚠️ 임시방편: 다른 기기/브라우저에서 로그인하면 안 보임. GET 엔드포인트 생기면
// 이 파일 대신 서버에서 직접 불러오는 걸로 바꾸면 됨.

const FAVORITES_KEY = 'ssnaai_favorites_cache';
const TIMETABLE_KEY = 'ssnaai_timetable_cache';

function safeParse(json, fallback) {
  try {
    const parsed = JSON.parse(json);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function getLocalFavorites() {
  return safeParse(localStorage.getItem(FAVORITES_KEY), []);
}

export function setLocalFavorites(names) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(names));
}

export function getLocalTimetable() {
  // { semester, subjects: [{ subject, day, start_time, end_time, room }] }
  return safeParse(localStorage.getItem(TIMETABLE_KEY), { semester: null, subjects: [] });
}

export function setLocalTimetable(timetable) {
  localStorage.setItem(TIMETABLE_KEY, JSON.stringify(timetable));
}

const PROFILE_KEY = 'ssnaai_profile_cache';

// 프로필(닉네임/학과/학번/비밀번호/사진)도 백엔드에 저장할 방법이 없어서
// (UserProfileResponse에 이 필드들이 아예 없음) 로컬에 남겨서 새로고침해도 유지되게 한다.
export function getLocalProfile() {
  return safeParse(localStorage.getItem(PROFILE_KEY), null);
}

export function setLocalProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}