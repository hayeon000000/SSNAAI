import { useState } from 'react'
import HomeScreen from './components/HomeScreen'
import DestinationScreen from './components/DestinationScreen'
import ResultScreen from './components/ResultScreen'
import MyPageScreen from './components/MyPageScreen'
import ProfileScreen from './components/ProfileScreen'

function App() {
  const [screen, setScreen] = useState('home')
  const [selection, setSelection] = useState({ transport: null, destination: null })
  const [profile, setProfile] = useState({ nickname: '쓰나이', department: 'AI융합학부', studentYear: '25학번' })

  if (screen === 'destination') {
    return (
      <DestinationScreen
        onComplete={(next) => {
          setSelection(next)
          setScreen('result')
        }}
        onBack={() => setScreen('home')}
        onOpenProfile={() => setScreen('mypage')}
      />
    )
  }

  if (screen === 'result') {
    return (
      <ResultScreen
        destination={selection.destination}
        transport={selection.transport}
        onEditDestination={() => setScreen('destination')}
        onBack={() => setScreen('home')}
        onOpenProfile={() => setScreen('mypage')}
      />
    )
  }

  if (screen === 'mypage') {
    return (
      <MyPageScreen
        profile={profile}
        onEditProfile={() => setScreen('profile-edit')}
        onBack={() => setScreen('home')}
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
      />
    )
  }

  return (
    <HomeScreen
      onSelectDestination={() => setScreen('destination')}
      onOpenProfile={() => setScreen('mypage')}
    />
  )
}

export default App
