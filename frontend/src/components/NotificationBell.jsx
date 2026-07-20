import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';

export default function NotificationBell() {
  const [muted, setMuted] = useState(false);

  return (
    <button type="button" aria-label={muted ? '알림 켜기' : '알림 끄기'} onClick={() => setMuted((v) => !v)}>
      {muted ? <BellOff className="w-5 h-5" strokeWidth={1.75} /> : <Bell className="w-5 h-5" strokeWidth={1.75} />}
    </button>
  );
}
