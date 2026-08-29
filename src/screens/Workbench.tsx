import { useState } from 'react'
import { useAppStore } from '../store'
import { Header } from '../components/Header'
import { Analysis } from '../tabs/Analysis'
import { Plan } from '../tabs/Plan'
import { Chat } from '../tabs/Chat'
import { Diary } from '../tabs/Diary'
import { Market } from '../tabs/Market'
import { Materials } from '../tabs/Materials'
import { Profile } from '../tabs/Profile'
import type { AuthUser } from '../lib/auth'

interface Props {
  onLogout: () => Promise<void> | void
  user: AuthUser
}

export function Workbench({ onLogout, user }: Props) {
  const tab = useAppStore((s) => s.tab)
  const [materialsOpen, setMaterialsOpen] = useState(false)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header onLogout={onLogout} />
      <main style={{ flex: 1, padding: '24px 34px 56px' }}>
        {tab === 'analysis' && <Analysis onOpenMaterials={() => setMaterialsOpen(true)} user={user} />}
        {tab === 'plan' && <Plan />}
        {tab === 'profile' && <Profile />}
        {tab === 'chat' && <Chat />}
        {tab === 'diary' && <Diary />}
        {tab === 'market' && <Market />}
      </main>
      <Materials open={materialsOpen} onClose={() => setMaterialsOpen(false)} />
    </div>
  )
}
