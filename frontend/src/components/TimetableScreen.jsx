import BottomNav from './BottomNav';
import NotificationBell from './NotificationBell';

export default function TimetableScreen({ onSave, onBack, onHome }) {
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

        <div className="mt-8 h-[562px] rounded-[17px] bg-white/50 shadow-[0px_4px_22.1px_-5px_rgba(167,139,186,0.5)] px-6 py-5">
          <h2 className="text-center font-semibold text-xl">시간표 관리</h2>
        </div>

        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            type="button"
            onClick={onSave}
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

      <BottomNav onHome={onHome} profileActive />
    </div>
  );
}
