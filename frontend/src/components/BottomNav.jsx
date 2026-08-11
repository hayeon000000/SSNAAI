import { BadgeIcon, BadgeNavIcon, ProfileIcon, HomeNavIcon, ProfileNavBadge } from './NavIcons';

export default function BottomNav({
  onPet,
  onHome,
  onProfile,
  homeActive = false,
  profileActive = false,
  petActive = false,
}) {
  return (
    <div className="flex items-center justify-between px-10 py-3 mt-6 rounded-full bg-white/50 shadow-[0px_4px_38.9px_-8px_rgba(167,139,186,0.5)]">
      <button type="button" onClick={onPet} className="group flex flex-col items-center gap-0.5 text-[#a775ca]">
        {petActive ? <BadgeNavIcon className="w-8 h-7" /> : <BadgeIcon className="w-8 h-7" />}
        <span className="text-[10px] leading-none">펫</span>
      </button>

      <button type="button" onClick={onHome} className="group flex flex-col items-center gap-0.5 transition hover:brightness-110">
        <div className="w-9 h-9">
          <HomeNavIcon className="w-full h-full" active={homeActive} />
        </div>
        <span className="text-[10px] leading-none text-[#a775ca]">홈</span>
      </button>

      <button type="button" onClick={onProfile} className="group flex flex-col items-center gap-0.5 text-[#a775ca]">
        {profileActive ? <ProfileNavBadge className="w-7 h-7" /> : <ProfileIcon className="w-7 h-7" />}
        <span className="text-[10px] leading-none">마이</span>
      </button>
    </div>
  );
}
