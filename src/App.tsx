import { useEffect, useState } from 'react'
import { useAppStore } from './store'
import { getCurrentUser } from './lib/auth'
import { Login } from './screens/Login'
import { Empty } from './screens/Empty'
import { Creating } from './screens/Creating'
import { Workbench } from './screens/Workbench'

export default function App() {
  const screen = useAppStore((s) => s.screen)
  const doLogin = useAppStore((s) => s.doLogin)
  const [authReady, setAuthReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)

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

  if (!authReady) {
    return null
  }

  if (!authenticated) {
    return (
      <Login
        onAuthenticated={() => {
          setAuthenticated(true)
          doLogin()
        }}
      />
    )
  }

  switch (screen) {
    case 'login':
      return null
    case 'empty':
      return <Empty />
    case 'creating':
      return <Creating />
    case 'app':
      return <Workbench />
  }
}
