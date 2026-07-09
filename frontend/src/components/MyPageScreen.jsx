import { Pencil, User } from 'lucide-react';
import { BadgeIcon, ProfileBadge, HomeIcon } from './NavIcons';

// 커서를 올렸을 때 칸 색이 바뀌는 정확한 스펙(Figma node-id 181-155)을 조회하지 못해
// 임시로 앱의 포인트 컬러(#c8a8e9)로 hover 강조를 적용했다. 스크린샷을 받으면 교체 예정.
const ACTION_ITEM_CLASS =
  'w-full h-[47px] rounded-full bg-[#d9d9d9] px-5 flex items-center text-sm text-black/60 transition-colors hover:bg-[#c8a8e9] hover:text-white';

export default function MyPageScreen({ profile, onEditProfile, onBack }) {
  return (
    <div className="max-w-sm mx-auto min-h-screen bg-neutral-950 text-white flex flex-col justify-between px-4 py-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-bold text-purple-400">SSNAAI</h1>

        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-neutral-400 flex items-center justify-center">
            <User className="w-12 h-12 text-neutral-100" strokeWidth={1.5} />
          </div>
          <button
            type="button"
            onClick={onEditProfile}
            className="flex items-center gap-1.5 mt-3 text-purple-300 font-semibold text-lg"
          >
            {profile.nickname || '닉네임 없음'}
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <p className="text-xs text-neutral-400 mt-1">
            {[profile.department, profile.studentYear].filter(Boolean).join(' ') || '학과 · 학번 미설정'}
          </p>
        </div>

        <div className="h-64 rounded-2xl bg-[#d9d9d9]" />

        <div className="flex flex-col gap-3">
          <button type="button" className={ACTION_ITEM_CLASS}>
            건물 즐겨찾기 등록하기
          </button>
          <button type="button" className={ACTION_ITEM_CLASS}>
            계정 정보 확인하기
          </button>
          <button type="button" className="text-center text-sm py-2 text-white hover:text-[#c8a8e9]">
            로그아웃
          </button>
          <hr className="border-neutral-700" />
          <button type="button" className="text-left text-sm text-neutral-500 hover:text-neutral-300">
            의견 남기기
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-6 mt-8">
        <button type="button">
          <BadgeIcon className="w-7 h-9 text-neutral-400" />
        </button>

        <button type="button" onClick={onBack} className="w-14 h-14 transition hover:brightness-125">
          <HomeIcon className="w-full h-full text-neutral-400 hover:text-[#c8a8e9]" />
        </button>

        <button type="button" className="w-11 h-14">
          <ProfileBadge className="w-full h-full" />
        </button>
      </div>
    </div>
  );
}
