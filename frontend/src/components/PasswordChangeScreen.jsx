import { useState } from 'react';
import BottomNav from './BottomNav';
import NotificationBell from './NotificationBell';

// ⚠️ 실제 백엔드(main 브랜치) 확인 결과: 로그인이 학번(student_id)만으로 되고
// 비밀번호 개념 자체가 없음(schemas.py에 password 필드가 아예 없음). 그래서 이 화면은
// 저장할 서버 API가 없음 — 로컬에서만 값이 바뀌는 걸로 처리. 실제로 비밀번호 기능이
// 필요하면 정민이한테 관련 API를 새로 만들어달라고 해야 함.

const FIELD_CLASS =
  'w-full h-[39px] rounded-[14px] bg-white/50 px-4 flex items-center text-left text-[15px]';

export default function PasswordChangeScreen({ onSave, onBack, onHome, onOpenPet }) {
  const [newPassword, setNewPassword] = useState('');

  const handleSave = () => {
    onSave?.(newPassword);
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
          <h2 className="text-center font-semibold text-xl mb-6">새 비밀번호를 입력하세요</h2>

          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="새 비밀번호를 입력해 주세요."
            className={`${FIELD_CLASS} text-[#a78bba] placeholder:text-[#a78bba]/60 outline-none`}
          />
        </div>

        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            type="button"
            onClick={handleSave}
            className="w-[162px] py-3 rounded-[37px] bg-white/50 text-[#a775ca] text-[15px] font-medium shadow-[0px_4px_20.8px_-10px_rgba(167,139,186,0.5)] transition-colors hover:bg-white/70"
          >
            저장
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
