export function getNow() {
  const now = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(
    now.getDate()
  ).padStart(2, '0')}.(${days[now.getDay()]})`;
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
  return { date, time };
}
