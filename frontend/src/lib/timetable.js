// JS의 Date.getDay()는 일요일=0부터 시작해서, 우리가 쓰는 요일 문자(월~일) 순서로 바꿔주는 매핑.
const JS_DAY_TO_KOREAN = ['일', '월', '화', '수', '목', '금', '토'];

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// 오늘 요일 기준으로 "지금 듣고 있는 수업" 또는 "다음 수업"을 찾는다.
// 오늘 남은 수업이 없으면 null.
// 반환: { subject: {subject, day, start_time, end_time, room}, status: 'ongoing' | 'next' }
export function findCurrentOrNextClass(subjects) {
  if (!subjects || subjects.length === 0) return null;

  const now = new Date();
  const todayLabel = JS_DAY_TO_KOREAN[now.getDay()];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const todayClasses = subjects
    .filter((s) => s.day === todayLabel)
    .map((s) => ({ ...s, _start: timeToMinutes(s.start_time), _end: timeToMinutes(s.end_time) }))
    .sort((a, b) => a._start - b._start);

  const ongoing = todayClasses.find((s) => nowMinutes >= s._start && nowMinutes < s._end);
  if (ongoing) return { subject: ongoing, status: 'ongoing' };

  const next = todayClasses.find((s) => s._start > nowMinutes);
  if (next) return { subject: next, status: 'next' };

  return null;
}