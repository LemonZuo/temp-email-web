import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useAuth } from '@/store/auth'
import App from './App'
import './index.css'

// `?jwt=` auto-login links: store the credential and strip it from the URL before routing
{
  const url = new URL(window.location.href)
  const jwt = url.searchParams.get('jwt')
  if (jwt !== null) {
    useAuth.getState().setJwt(jwt)
    url.searchParams.delete('jwt')
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
