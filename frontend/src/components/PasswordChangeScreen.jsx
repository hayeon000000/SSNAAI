import { useState } from 'react';
import BottomNav from './BottomNav';
import NotificationBell from './NotificationBell';

// ⚠️ 정민이가 백엔드 비밀번호 연결 작업 중(1번 항목) — 그동안 프론트는 칸만
// 먼저 만들어둠(기존 비밀번호 확인 + 새 비밀번호 입력). 백엔드 API 준비되면
// handleSave 안에서 실제로 서버에 검증 요청 보내도록 연결하면 됨.

const FIELD_CLASS =
  'w-full h-[39px] rounded-[14px] bg-white/50 px-4 flex items-center text-left text-[15px]';

export default function PasswordChangeScreen({ onSave, onBack, onHome, onOpenPet }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSave = () => {
    onSave?.({ currentPassword, newPassword });
  };

  return (
    <div
      // 최상위 컨테이너에서 justify-between을 빼고 자연스럽게 flex-col로 배치합니다.
      className="max-w-sm mx-auto min-h-screen flex flex-col px-7 py-8 text-white"
      style={{ background: 'linear-gradient(160deg, #a78bba 6%, #ffffff 100%)' }}
    >
      {/* 1. 상단 헤더 영역 */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-semibold">SSNAAI</h1>
        <NotificationBell />
      </div>

      {/* 2. 중앙 정렬될 컨텐츠 영역 (flex-1과 justify-center로 화면 가운데에 배치) */}
      <div className="flex-1 flex flex-col justify-center pb-10">
        <div className="rounded-[17px] bg-white/50 shadow-[0px_4px_22.1px_-5px_rgba(167,139,186,0.5)] px-6 py-6">
          <h2 className="text-center font-semibold text-xl mb-6">비밀번호 변경</h2>

          <div className="flex flex-col gap-3">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="기존 비밀번호를 입력해 주세요."
              className={`${FIELD_CLASS} text-[#a78bba] placeholder:text-[#a78bba]/60 outline-none`}
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="새 비밀번호를 입력해 주세요."
              className={`${FIELD_CLASS} text-[#a78bba] placeholder:text-[#a78bba]/60 outline-none`}
            />
          </div>
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

      {/* 3. 하단 네비게이션 영역 */}
      <div className="shrink-0 mt-auto">
        <BottomNav onPet={onOpenPet} onHome={onHome} profileActive />
      </div>
    </div>
  );
}
