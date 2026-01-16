import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import WorkspacePicker from './components/WorkspacePicker'

function App(): React.JSX.Element {
  const [route, setRoute] = useState<string>('')

  useEffect(() => {
    // 获取当前路由（从 hash 中）
    const hash = window.location.hash.slice(1) // 移除 # 号
    setRoute(hash)

    // 监听 hash 变化
    const handleHashChange = () => {
      setRoute(window.location.hash.slice(1))
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // 根据路由渲染不同的组件
  if (route === '/workspace-picker') {
    return <WorkspacePicker />
  }

  return <Layout />
}

export default App
