import { useState } from 'react'
import HomeScreen from './components/HomeScreen'
import DestinationScreen from './components/DestinationScreen'
import ResultScreen from './components/ResultScreen'
import MyPageScreen from './components/MyPageScreen'
import ProfileScreen from './components/ProfileScreen'
import TimetableScreen from './components/TimetableScreen'
import BuildingFavoritesScreen from './components/BuildingFavoritesScreen'

function App() {
  const [screen, setScreen] = useState('home')
  const [selection, setSelection] = useState({ transport: [], destination: null })
  const [profile, setProfile] = useState({ nickname: '쓰나이', department: 'AI융합학부', studentYear: '25학번' })
  // 목적지를 방금 선택하고 온 상태인지 추적. 마이페이지 등 다른 화면을 거치면 꺼진다.
  const [justSelected, setJustSelected] = useState(false)

  const goToMyPage = () => {
    setJustSelected(false)
    setScreen('mypage')
  }

  // 목적지 화면에 들어가는 순간 일단 "방금 선택함" 표시를 끈다.
  // 선택하기를 눌러 완료해야만 다시 켜지고, 돌아가기를 누르면 꺼진 채로 홈에 돌아간다.
  const goToDestination = () => {
    setJustSelected(false)
    setScreen('destination')
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
      />
    )
  }

  if (screen === 'mypage') {
    return (
      <MyPageScreen
        profile={profile}
        onEditProfile={() => setScreen('profile-edit')}
        onManageTimetable={() => setScreen('timetable')}
        onManageFavorites={() => setScreen('favorites')}
        onBack={() => setScreen('home')}
      />
    )
  }

  if (screen === 'timetable') {
    return (
      <TimetableScreen
        onSave={() => setScreen('mypage')}
        onBack={() => setScreen('mypage')}
        onHome={() => setScreen('home')}
      />
    )
  }

  if (screen === 'favorites') {
    return (
      <BuildingFavoritesScreen
        onSave={() => setScreen('mypage')}
        onBack={() => setScreen('mypage')}
        onHome={() => setScreen('home')}
      />
    )
  }

  if (screen === 'profile-edit') {
    return (
      <ProfileScreen
        profile={profile}
        onSave={(next) => {
          setProfile(next)
          setScreen('mypage')
        }}
        onBack={() => setScreen('mypage')}
        onHome={() => setScreen('home')}
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
    />
  )
}

export default App
