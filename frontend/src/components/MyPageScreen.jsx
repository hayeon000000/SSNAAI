import { User, Pencil, Calendar, Star } from 'lucide-react';
import BottomNav from './BottomNav';
import NotificationBell from './NotificationBell';

const CARD_CLASS =
  'flex-1 h-[174px] rounded-[17px] bg-white/50 shadow-[0px_4px_22.1px_-5px_rgba(167,139,186,0.5)] flex flex-col items-center justify-center gap-3 text-[#a78bba] text-[13px] font-semibold text-center transition hover:brightness-75';

const LIST_ITEM_CLASS = 'text-left text-[15px] text-white transition hover:brightness-75';

export default function MyPageScreen({ profile, onEditProfile, onManageTimetable, onManageFavorites, onBack }) {
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

        <div className="flex items-center gap-5 mt-8">
          <div className="relative shrink-0">
            <div className="w-[119px] h-[119px] rounded-full bg-[#f4ebf7] flex items-center justify-center">
              <User className="w-14 h-14 text-[#a78bba]" strokeWidth={1.5} />
            </div>
            <button
              type="button"
              onClick={onEditProfile}
              aria-label="프로필 수정"
              className="absolute bottom-0 right-1 w-7 h-7 rounded-full bg-[#a78bba] flex items-center justify-center transition hover:brightness-75"
            >
              <Pencil className="w-3.5 h-3.5 text-white" />
            </button>
          </div>

          <div>
            <p className="font-bold text-xl">{profile.nickname || '닉네임 없음'}</p>
            <p className="text-[15px] mt-1">
              {[profile.department, profile.studentYear].filter(Boolean).join(' ') || '학과 · 학번 미설정'}
            </p>
          </div>
        </div>

        <hr className="border-white/40 my-6" />

        <div className="flex gap-4">
          <button type="button" onClick={onManageTimetable} className={CARD_CLASS}>
            <Calendar className="w-7 h-7" strokeWidth={1.75} />
            <span>
              시간표
              <br />
              관리하기
            </span>
          </button>
          <button type="button" onClick={onManageFavorites} className={CARD_CLASS}>
            <Star className="w-7 h-7" strokeWidth={1.75} />
            <span>
              건물
              <br />
              즐겨찾기
            </span>
          </button>
        </div>

        <hr className="border-white/40 my-6" />

        <h2 className="font-semibold text-xl">계정 및 보안</h2>
        <hr className="border-white/40 my-4" />
        <div className="flex flex-col gap-5">
          <button type="button" className={LIST_ITEM_CLASS}>
            로그인 정보
          </button>
          <button type="button" className={LIST_ITEM_CLASS}>
            비밀번호 변경
          </button>
          <button type="button" className={LIST_ITEM_CLASS}>
            로그아웃
          </button>
          <button type="button" className={LIST_ITEM_CLASS}>
            탈퇴하기
          </button>
        </div>
      </div>

      <BottomNav onHome={onBack} profileActive />
    </div>
  );
}
