import { Layout, Button, Space } from 'antd'
import { GithubOutlined } from '@ant-design/icons'
import MDEditor from './components/EditorView/EditorView'
import GiteeIcon from './Icons/GiteeIcon'
import './App.css'
const { Header, Content, Footer } = Layout;


function App() {
  return (
    <Layout className="main-container" style={{ minHeight: '100vh', display: 'flex' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white', padding: '0 24px' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Easier Markdown Editor</div>
        <Space>
          <Button 
            type="text" 
            icon={<GithubOutlined />} 
            style={{ color: 'white' }}
            href="https://github.com" 
            target="_blank"
          >
            GitHub
          </Button>
          <Button 
            type="text" 
            icon={<GiteeIcon />} 
            style={{ color: 'white' }}
            href="https://gitee.com" 
            target="_blank"
          >
            Gitee
          </Button>
        </Space>
      </Header>
      <Content style={{ padding: '24px', overflow: 'hidden',display:'block', height: '80vh' }}>
        <MDEditor />
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        Easier Markdown Editor ©{new Date().getFullYear()} Created by ffxd
      </Footer>
    </Layout>
  )
}

export default App
