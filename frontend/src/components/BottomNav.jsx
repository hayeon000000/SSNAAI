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
      <button type="button" onClick={onPet} className="group text-[#a775ca]">
        {petActive ? <BadgeNavIcon className="w-8 h-7" /> : <BadgeIcon className="w-8 h-7" />}
      </button>

      <button type="button" onClick={onHome} className="group w-9 h-9 transition hover:brightness-110">
        <HomeNavIcon className="w-full h-full" active={homeActive} />
      </button>

      <button type="button" onClick={onProfile} className="group text-[#a775ca]">
        {profileActive ? <ProfileNavBadge className="w-7 h-7" /> : <ProfileIcon className="w-7 h-7" />}
      </button>
    </div>
  );
}
