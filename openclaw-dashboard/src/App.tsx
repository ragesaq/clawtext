import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import NowPage from './pages/NowPage'
import ProjectsPage from './pages/ProjectsPage'
import TasksPage from './pages/TasksPage'
import ReviewPage from './pages/ReviewPage'
import MemoryBrowser from './pages/MemoryBrowser'
import DocsPage from './pages/DocsPage'
import ModelHealth from './pages/ModelHealth'
import AgentStatus from './pages/AgentStatus'
import SystemHealth from './pages/SystemHealth'
import GrafanaMetrics from './pages/GrafanaMetrics'
import Settings from './pages/Settings'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<NowPage />} />
        <Route path="/now" element={<NowPage />} />
        <Route path="/health" element={<SystemHealth />} />
        <Route path="/costs" element={<ModelHealth />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/memory" element={<MemoryBrowser />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/agents" element={<AgentStatus />} />
        <Route path="/grafana" element={<GrafanaMetrics />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}

export default App
