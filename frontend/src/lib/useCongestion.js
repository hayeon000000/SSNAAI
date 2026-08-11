import { useEffect, useState } from 'react';
import { fetchCongestion } from './congestionApi';

// 캠퍼스 건물별 혼잡도를 가져온다. 백엔드가 없는 동안 fetchCongestion은
// 개발 확인용 mock(또는 null)을 반환하므로, 화면단에서는 data 유무로 분기하면 된다.
export function useCongestion() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCongestion()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
