import { useEffect, useState } from 'react'
import { useAppStore } from './store'
import { getCurrentUser, logout } from './lib/auth'
import { Login } from './screens/Login'
import { Empty } from './screens/Empty'
import { Creating } from './screens/Creating'
import { Workbench } from './screens/Workbench'
import { MobileAccessDialog } from './components/MobileAccessDialog'

export default function App() {
  const screen = useAppStore((s) => s.screen)
  const doLogin = useAppStore((s) => s.doLogin)
  const [authReady, setAuthReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // 即使服务端请求失败，也要清掉当前页面的登录态，避免用户卡在工作台。
    } finally {
      setAuthenticated(false)
      useAppStore.getState().setScreen('login')
    }
  }

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        if (user) {
          setAuthenticated(true)
          doLogin()
        }
      })
      .finally(() => setAuthReady(true))
  }, [doLogin])

  let content = null

  if (authReady) {
    if (!authenticated) {
      content = (
        <Login
          onAuthenticated={() => {
            setAuthenticated(true)
            doLogin()
          }}
        />
      )
    } else {
      switch (screen) {
        case 'login':
          content = null
          break
        case 'empty':
          content = <Empty onLogout={handleLogout} />
          break
        case 'creating':
          content = <Creating />
          break
        case 'app':
          content = <Workbench onLogout={handleLogout} />
          break
      }
    }
  }

  return (
    <>
      {content}
      <MobileAccessDialog />
    </>
  )
}
