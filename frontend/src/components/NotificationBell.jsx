import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { createAlertSetting, getActiveAlerts, getAlerts } from '../lib/api';
import { getStudentId } from '../lib/apiConfig';
import { BACKEND_ID_TO_NAME } from '../lib/buildings';

// ⚠️ 여기저기(거의 모든 화면)서 <NotificationBell />을 studentId prop 없이 그냥 씀.
// prop으로 다 뚫는 대신 getStudentId()로 내부에서 직접 읽는 방식으로 감. (apiConfig 참고)
//
// ⚠️ 실제 알림 등록 형식(app/models/schemas.py AlertCreateRequest 확인):
// { student_id, building_id, floor?, starts_at?, ends_at?, threshold_score(0~100, 기본 70) }
// building_id는 일단 SOOJUNG(수정관) 고정 — 건물 선택 UI가 지금 화면엔 없어서 임시로 고정해둠.

export default function NotificationBell() {
  const [muted, setMuted] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [allAlerts, setAllAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [tab, setTab] = useState('active'); // 'active' | 'all'

  useEffect(() => {
    const studentId = getStudentId();
    if (!studentId) return;

    getActiveAlerts(studentId)
      .then((data) => setActiveAlerts(Array.isArray(data) ? data : []))
      .catch((err) => console.error('[NotificationBell] 활성 알림 조회 실패:', err));
  }, []);

  const handleShowAllAlerts = () => {
    const studentId = getStudentId();
    if (!studentId) return;
    setTab('all');
    getAlerts(studentId)
      .then((data) => setAllAlerts(Array.isArray(data) ? data : []))
      .catch((err) => console.error('[NotificationBell] 전체 알림 조회 실패:', err));
  };

  const handleToggle = async () => {
    // 활성 알림이 있으면 벨 클릭은 알림 목록 열기/닫기
    if (activeAlerts.length > 0) {
      setShowAlerts((v) => !v);
      return;
    }

    const studentId = getStudentId();
    const next = !muted;
    setMuted(next);

    if (!next && studentId) {
      try {
        await createAlertSetting({
          student_id: studentId,
          building_id: 'SOOJUNG', // TODO: 건물 선택 UI 생기면 교체
          threshold_score: 70,
        });
      } catch (err) {
        console.error('[NotificationBell] 알림 등록 실패:', err);
      }
    }
  };

  const listToShow = tab === 'active' ? activeAlerts : allAlerts;

  return (
    <div className="relative">
      <button type="button" aria-label={muted ? '알림 켜기' : '알림 끄기'} onClick={handleToggle}>
        {muted ? <BellOff className="w-5 h-5" strokeWidth={1.75} /> : <Bell className="w-5 h-5" strokeWidth={1.75} />}
        {activeAlerts.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#d99a92]" />
        )}
      </button>

      {showAlerts && (
        <div className="absolute right-0 top-8 w-56 rounded-xl bg-white/95 shadow-lg px-4 py-3 text-[#4a3b57] text-xs z-50">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold">{tab === 'active' ? '활성 알림' : '전체 알림'}</p>
            <button
              type="button"
              onClick={tab === 'active' ? handleShowAllAlerts : () => setTab('active')}
              className="text-[#a78bba] underline"
            >
              {tab === 'active' ? '전체 보기' : '활성만 보기'}
            </button>
          </div>
          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
            {listToShow.length === 0 && <p className="text-[#4a3b57]/60">알림이 없어요.</p>}
            {tab === 'active'
              ? listToShow.map((alert) => (
                  // 활성 알림은 백엔드가 문장을 이미 만들어서 줌(message) — 그대로 표시
                  <p key={alert.alert_id}>{alert.message}</p>
                ))
              : listToShow.map((alert) => (
                  <p key={alert.alert_id}>
                    {BACKEND_ID_TO_NAME[alert.building_id] ?? alert.building_id} 혼잡도{' '}
                    {alert.threshold_score}점 이상 · {alert.enabled ? '켜짐' : '꺼짐'}
                  </p>
                ))}
          </div>
        </div>
      )}
    </div>
  );
}
