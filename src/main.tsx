import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { lightTheme } from './theme'
import App from './App.tsx'
import './styles/global.less'

createRoot(document.getElementById('root')!).render(
  <ConfigProvider 
    locale={zhCN}
    theme={lightTheme}
  >
    <App />
  </ConfigProvider>
)
