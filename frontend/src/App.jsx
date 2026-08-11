import { useState } from 'react'
import HomeScreen from './components/HomeScreen'
import PetScreen from './components/PetScreen'
import DestinationScreen from './components/DestinationScreen'
import ResultScreen from './components/ResultScreen'
import MyPageScreen from './components/MyPageScreen'
import ProfileScreen from './components/ProfileScreen'
import PasswordChangeScreen from './components/PasswordChangeScreen'
import TimetableScreen from './components/TimetableScreen'
import BuildingFavoritesScreen from './components/BuildingFavoritesScreen'
import LoginScreen from './components/LoginScreen'
import { setStudentId, getStudentId } from './lib/apiConfig'
import { getLocalProfile, setLocalProfile } from './lib/localCache'

function App() {
  const [screen, setScreen] = useState(getStudentId() ? 'home' : 'login')
  const [selection, setSelection] = useState({ transport: [], destination: null })
  const [profile, setProfile] = useState(
    () => getLocalProfile() ?? { nickname: '', department: null, studentYear: null }
  )
  // 목적지를 방금 선택하고 온 상태인지 추적. 마이페이지 등 다른 화면을 거치면 꺼진다.
  const [justSelected, setJustSelected] = useState(false)

  const goToMyPage = () => {
    setJustSelected(false)
    setScreen('mypage')
  }

  const goToPet = () => {
    setJustSelected(false)
    setScreen('pet')
  }

  // 목적지 화면에 들어가는 순간 일단 "방금 선택함" 표시를 끈다.
  // 선택하기를 눌러 완료해야만 다시 켜지고, 돌아가기를 누르면 꺼진 채로 홈에 돌아간다.
  const goToDestination = () => {
    setJustSelected(false)
    setScreen('destination')
  }

  if (screen === 'login') {
    return (
      <LoginScreen
        onLoginSuccess={() => setScreen(getLocalProfile() ? 'home' : 'profile-edit')}
      />
    )
  }

  if (screen === 'destination') {
    return (
      <DestinationScreen
        onComplete={(next) => {
          setSelection(next)
          setJustSelected(true)
          setScreen('result')
        }}
        onBack={() => setScreen('home')}
        onOpenProfile={goToMyPage}
        onOpenPet={goToPet}
      />
    )
  }

  if (screen === 'result') {
    return (
      <ResultScreen
        destination={selection.destination}
        transport={selection.transport}
        onEditDestination={goToDestination}
        onBack={() => setScreen('home')}
        onOpenProfile={goToMyPage}
        onOpenPet={goToPet}
      />
    )
  }

  if (screen === 'pet') {
    return <PetScreen onHome={() => setScreen('home')} onOpenProfile={goToMyPage} />
  }

  if (screen === 'mypage') {
    return (
      <MyPageScreen
        profile={profile}
        onProfileLoaded={(data) => setProfile((prev) => ({ ...prev, ...data }))}
        onEditProfile={() => setScreen('profile-edit')}
        onLogin={() => setScreen('login')}
        onManageTimetable={() => setScreen('timetable')}
        onManageFavorites={() => setScreen('favorites')}
        onChangePassword={() => setScreen('password-change')}
        onLogout={() => {
          setProfile({ nickname: '', department: null, studentYear: null })
          setStudentId(null)
          setScreen('mypage')
        }}
        onOpenPet={goToPet}
        onBack={() => setScreen('home')}
      />
    )
  }

  if (screen === 'password-change') {
    return (
      <PasswordChangeScreen
        onSave={() => setScreen('mypage')}
        onBack={() => setScreen('mypage')}
        onHome={() => setScreen('home')}
        onOpenPet={goToPet}
      />
    )
  }

  if (screen === 'timetable') {
    return (
      <TimetableScreen
        onSave={() => setScreen('mypage')}
        onBack={() => setScreen('mypage')}
        onHome={() => setScreen('home')}
        onOpenPet={goToPet}
      />
    )
  }

  if (screen === 'favorites') {
    return (
      <BuildingFavoritesScreen
        onSave={() => setScreen('mypage')}
        onBack={() => setScreen('mypage')}
        onHome={() => setScreen('home')}
        onOpenPet={goToPet}
      />
    )
  }

  if (screen === 'profile-edit') {
    const isFirstSetup = !getLocalProfile()
    return (
      <ProfileScreen
        profile={profile}
        onSave={(next) => {
          const merged = { ...profile, ...next }
          setProfile(merged)
          setLocalProfile(merged)
          setScreen(isFirstSetup ? 'home' : 'mypage')
        }}
        onBack={() => setScreen(isFirstSetup ? 'home' : 'mypage')}
        onHome={() => setScreen('home')}
        onOpenPet={goToPet}
      />
    )
  }

  return (
    <HomeScreen
      destination={selection.destination}
      transport={selection.transport}
      justSelected={justSelected}
      onSelectDestination={goToDestination}
      onOpenResult={() => setScreen('result')}
      onOpenProfile={goToMyPage}
      onOpenPet={goToPet}
      onSyncTimetable={() => setScreen('timetable')}
    />
  )
}

export default App
