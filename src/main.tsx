import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

const root = document.getElementById('root')
if (!root) {
  document.body.innerHTML = '<div style="color:red;padding:20px;">Error: #root not found</div>'
} else {
  try {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    console.log('[shader-portfolio] React mounted successfully')
  } catch (e) {
    console.error('[shader-portfolio] Mount failed:', e)
    root.innerHTML = '<div style="color:red;padding:20px;font-family:sans-serif;">Render Error: ' + String(e) + '</div>'
  }
}
