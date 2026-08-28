import { useAppStore } from './store'
import { Login } from './screens/Login'
import { Empty } from './screens/Empty'
import { Creating } from './screens/Creating'
import { Workbench } from './screens/Workbench'

export default function App() {
  const screen = useAppStore((s) => s.screen)
  switch (screen) {
    case 'login':
      return <Login />
    case 'empty':
      return <Empty />
    case 'creating':
      return <Creating />
    case 'app':
      return <Workbench />
  }
}
