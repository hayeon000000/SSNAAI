import { useEffect, useState } from 'react';
import { User, Pencil, Calendar, Star } from 'lucide-react';
import BottomNav from './BottomNav';
import NotificationBell from './NotificationBell';
import { getUserProfile } from '../lib/api';
import { getStudentId } from '../lib/apiConfig';
import { getLocalTimetable } from '../lib/localCache';
import { findCurrentOrNextClass } from '../lib/timetable';

const CARD_CLASS =
  'flex-1 h-[174px] rounded-[17px] bg-white/50 shadow-[0px_4px_22.1px_-5px_rgba(167,139,186,0.5)] flex flex-col items-center justify-center gap-3 text-[#a78bba] text-[13px] font-semibold text-center transition hover:brightness-75';

const LIST_ITEM_CLASS = 'text-left text-[15px] text-white transition hover:brightness-75';

export default function MyPageScreen({
  profile,
  onProfileLoaded,
  onEditProfile,
  onLogin,
  onManageTimetable,
  onManageFavorites,
  onChangePassword,
  onLogout,
  onOpenPet,
  onBack,
}) {
  // 로그인 여부는 학번 저장 유무로 판단한다 (백엔드가 nickname/department를 안 줘서
  // 그걸로 판단하면 로그인해도 계속 "로그인 안 됨"으로 보이는 버그가 있었음).
  const hasProfile = Boolean(getStudentId());
  const currentClass = findCurrentOrNextClass(getLocalTimetable().subjects);

  // 화면 진입 시 저장된 학번이 있으면 서버에서 최신 프로필을 받아온다.
  // (studentId가 없으면 아직 "로그인" 안 된 상태라 스킵)
  useEffect(() => {
    const studentId = getStudentId();
    if (!studentId) return;

    getUserProfile(studentId)
      .then((data) => onProfileLoaded?.(data))
      .catch((err) => console.error('[MyPageScreen] 프로필 조회 실패:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        {hasProfile ? (
          <div className="flex items-center gap-5 mt-8">
            <div className="relative shrink-0">
              <div className="w-[119px] h-[119px] rounded-full bg-[#f4ebf7] flex items-center justify-center overflow-hidden">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt="프로필 사진" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-14 h-14 text-[#a78bba]" strokeWidth={1.5} />
                )}
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
              <p className="font-bold text-xl">{profile?.nickname || getStudentId()}</p>
              <p className="text-[15px] mt-1">
                {[profile?.department, profile?.studentYear].filter(Boolean).join(' ') || '학과 · 학번 미설정'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 mt-8">
            <div className="w-[119px] h-[119px] rounded-full bg-[#f4ebf7] flex items-center justify-center">
              <User className="w-14 h-14 text-[#a78bba]" strokeWidth={1.5} />
            </div>
            <button
              type="button"
              onClick={onLogin}
              className="w-[200px] py-3 rounded-[37px] bg-white/50 text-[#a775ca] text-[15px] font-medium shadow-[0px_4px_20.8px_-10px_rgba(167,139,186,0.5)] transition-colors hover:bg-white/70"
            >
              로그인하기
            </button>
          </div>
        )}

        <hr className="border-white/40 my-6" />

        <div className="flex gap-4">
          <button type="button" onClick={onManageTimetable} className={CARD_CLASS}>
            <Calendar className="w-7 h-7" strokeWidth={1.75} />
            <span>
              시간표
              <br />
              관리하기
            </span>
            {currentClass && (
              <span className="text-[10px] font-normal leading-tight px-2">
                {currentClass.status === 'ongoing' ? '지금: ' : '다음: '}
                {currentClass.subject.subject}
                <br />
                {currentClass.subject.room ? `${currentClass.subject.room} · ` : ''}
                {currentClass.subject.start_time}~{currentClass.subject.end_time}
              </span>
            )}
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
          <button type="button" onClick={onChangePassword} className={LIST_ITEM_CLASS}>
            비밀번호 변경
          </button>
          <button type="button" onClick={onLogout} className={LIST_ITEM_CLASS}>
            로그아웃
          </button>
          <button type="button" className={LIST_ITEM_CLASS}>
            탈퇴하기
          </button>
        </div>
      </div>

      <BottomNav onPet={onOpenPet} onHome={onBack} profileActive />
    </div>
  );
}
