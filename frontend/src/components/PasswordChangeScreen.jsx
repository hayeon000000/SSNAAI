import { useState } from 'react';
import BottomNav from './BottomNav';
import NotificationBell from './NotificationBell';
import { verifyPassword, changePassword } from '../lib/api';
import { getStudentId } from '../lib/apiConfig';

// 정민이 auth.py 스펙에 맞춘 2단계 흐름:
//   1) 기존 비밀번호 입력 → "확인" → POST .../password/verify
//      - 401(틀림) → 에러 메시지, 새 비밀번호 칸은 계속 잠금
//      - 200(맞음) → "비밀번호가 일치합니다." + 새 비밀번호 칸 활성화
//   2) 새 비밀번호 입력 → "변경" → PATCH .../password (current+new 같이 보냄)

const FIELD_CLASS =
  'w-full h-[39px] rounded-[14px] bg-white/50 px-4 flex items-center text-left text-[15px] disabled:opacity-50';

export default function PasswordChangeScreen({ onSave, onBack, onHome, onOpenPet }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [verified, setVerified] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | verifying | saving
  const [message, setMessage] = useState(null); // { type: 'error' | 'success', text }

  const handleVerify = async () => {
    const studentId = getStudentId();
    if (!studentId) {
      setMessage({ type: 'error', text: '로그인 정보가 없어요.' });
      return;
    }
    if (!currentPassword) {
      setMessage({ type: 'error', text: '기존 비밀번호를 입력해줘.' });
      return;
    }

    setStatus('verifying');
    setMessage(null);
    try {
      await verifyPassword(studentId, currentPassword);
      setVerified(true);
      setMessage({ type: 'success', text: '비밀번호가 일치합니다.' });
    } catch (err) {
      console.error('[PasswordChangeScreen] 확인 실패:', err);
      setVerified(false);
      setMessage({ type: 'error', text: '기존 비밀번호가 일치하지 않습니다.' });
    } finally {
      setStatus('idle');
    }
  };

  const handleChange = async () => {
    const studentId = getStudentId();
    if (!newPassword) {
      setMessage({ type: 'error', text: '새 비밀번호를 입력해줘.' });
      return;
    }

    setStatus('saving');
    setMessage(null);
    try {
      await changePassword(studentId, currentPassword, newPassword);
      onSave?.({ currentPassword, newPassword });
    } catch (err) {
      console.error('[PasswordChangeScreen] 변경 실패:', err);
      setMessage({ type: 'error', text: '비밀번호 변경에 실패했어. 다시 시도해줘.' });
      setStatus('idle');
    }
  };

  // 기존 비밀번호를 다시 고치면, 재확인 전까지 새 비밀번호 칸은 다시 잠금
  const handleCurrentPasswordChange = (value) => {
    setCurrentPassword(value);
    if (verified) {
      setVerified(false);
      setNewPassword('');
      setMessage(null);
    }
  };

  return (
    <div
      className="max-w-sm mx-auto min-h-screen flex flex-col justify-between px-7 py-8 text-white"
      style={{ background: 'linear-gradient(160deg, #a78bba 6%, #ffffff 100%)' }}
    >
      <div className="flex flex-col">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">SSNAAI</h1>
          <NotificationBell />
        </div>

        <div className="mt-8 rounded-[17px] bg-white/50 shadow-[0px_4px_22.1px_-5px_rgba(167,139,186,0.5)] px-6 py-6">
          <h2 className="text-center font-semibold text-xl mb-6">비밀번호 변경</h2>

          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => handleCurrentPasswordChange(e.target.value)}
                placeholder="기존 비밀번호를 입력해 주세요."
                className={`${FIELD_CLASS} flex-1 text-[#a78bba] placeholder:text-[#a78bba]/60 outline-none`}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              />
              <button
                type="button"
                onClick={handleVerify}
                disabled={status === 'verifying' || verified}
                className="px-4 rounded-[14px] bg-[#a78bba] text-white text-sm font-medium disabled:opacity-50"
              >
                {status === 'verifying' ? '확인 중...' : verified ? '확인됨' : '확인'}
              </button>
            </div>

            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={verified ? '새 비밀번호를 입력해 주세요.' : '기존 비밀번호를 먼저 확인해줘'}
              disabled={!verified}
              className={`${FIELD_CLASS} text-[#a78bba] placeholder:text-[#a78bba]/60 outline-none`}
              onKeyDown={(e) => e.key === 'Enter' && verified && handleChange()}
            />
          </div>

          {message && (
            <p
              className={`text-xs text-center mt-3 ${
                message.type === 'error' ? 'text-red-500' : 'text-green-600'
              }`}
            >
              {message.text}
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            type="button"
            onClick={handleChange}
            disabled={!verified || status === 'saving'}
            className="w-[162px] py-3 rounded-[37px] bg-white/50 text-[#a775ca] text-[15px] font-medium shadow-[0px_4px_20.8px_-10px_rgba(167,139,186,0.5)] transition-colors hover:bg-white/70 disabled:opacity-50"
          >
            {status === 'saving' ? '변경 중...' : '저장'}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-[162px] py-3 rounded-[37px] bg-[#a78bba]/50 text-white text-[15px] font-medium shadow-[0px_4px_20.8px_-10px_rgba(167,139,186,0.5)] transition-colors hover:bg-[#a78bba]/70"
          >
            취소
          </button>
        </div>
      </div>

      <BottomNav onPet={onOpenPet} onHome={onHome} profileActive />
    </div>
  );
}
