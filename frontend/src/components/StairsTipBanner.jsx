import { useState } from 'react';
import { X } from 'lucide-react';
import { logStairUse } from '../lib/api';
import { getStudentId } from '../lib/apiConfig';
import CameraTimestampRecorder from './CameraTimestampRecorder';

export default function StairsTipBanner({ onClose }) {
  const [status, setStatus] = useState('idle'); // idle | logging | done | error
  const [showRecorder, setShowRecorder] = useState(false);

  const handleButtonClick = () => {
    const studentId = getStudentId();
    if (!studentId) {
      setStatus('error');
      return;
    }
    setShowRecorder(true);
  };

  const handleStairUse = async () => {
    setShowRecorder(false);
    const studentId = getStudentId();
    setStatus('logging');
    try {
      await logStairUse(studentId, 1);
      setStatus('done');
    } catch (err) {
      console.error('[StairsTipBanner] 계단 이용 기록 실패:', err);
      setStatus('error');
    }
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 w-full max-w-xs px-4 z-50">
      <div className="relative bg-white/50 rounded-2xl shadow-[0px_4px_17.9px_-6px_rgba(167,139,186,0.5)] px-5 py-3 text-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 text-[#a775ca]/70 hover:text-[#a775ca]"
          aria-label="알림 닫기"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <p className="text-[#a775ca] font-bold text-[15px]">계단 이용을 추천해요!</p>

        {status === 'done' ? (
          <p className="text-[#a775ca] text-xs mt-2">기록 완료! 🪜</p>
        ) : (
          <button
            type="button"
            onClick={handleButtonClick}
            disabled={status === 'logging'}
            className="mt-2 w-full py-2 rounded-[20px] bg-[#a78bba]/40 text-white text-sm font-medium hover:bg-[#a78bba]/60 disabled:opacity-50"
          >
            {status === 'logging' ? '기록 중...' : '🪜 계단 이용했어요!'}
          </button>
        )}
        {status === 'error' && (
          <p className="text-red-500 text-xs mt-1">기록 실패 (로그인 확인 필요)</p>
        )}
      </div>

      {showRecorder && (
        <CameraTimestampRecorder onConfirm={handleStairUse} onCancel={() => setShowRecorder(false)} />
      )}
    </div>
  );
}
