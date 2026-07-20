import { useEffect, useState } from 'react';
import { fetchEta } from './etaApi';

// destination/transport가 바뀔 때마다 예상 소요시간을 다시 조회한다.
// 백엔드가 없는 동안 fetchEta는 null을 반환하므로 data는 계속 null이고,
// 화면단에서는 이를 placeholder('00분')로 보여주면 된다.
export function useEta(destination, transport) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!destination) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchEta({ destination, transport })
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
  }, [destination, transport]);

  return { data, loading, error };
}
