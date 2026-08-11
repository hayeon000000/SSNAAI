import { useEffect, useState } from 'react';
import { getNow } from './getNow';

// getNow()는 호출된 순간의 시간을 딱 한 번 계산해서 돌려주기만 해서, 화면을 다시
// 그릴 이유가 없으면 시계가 멈춰있는 것처럼 보인다. 이 훅은 1초마다 강제로
// 다시 계산해서 시:분:초가 실제로 움직이게 해준다.
export function useNow() {
  const [now, setNow] = useState(getNow);

  useEffect(() => {
    const timer = setInterval(() => setNow(getNow()), 1000);
    return () => clearInterval(timer);
  }, []);

  return now;
}