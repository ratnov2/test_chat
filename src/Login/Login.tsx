import { useState, type FormEvent } from 'react'
import styles from './Login.module.css'
import { DEFAULT_API_URL, type Credentials } from '../api'

export const Login = ({ onLogin }: { onLogin: (c: Credentials) => void }) => {
  const [idInstance, setId] = useState('')
  const [apiTokenInstance, setToken] = useState('')
  const [apiUrl, setUrl] = useState(DEFAULT_API_URL)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onLogin({ idInstance: idInstance.trim(), apiTokenInstance: apiTokenInstance.trim(), apiUrl: apiUrl.trim() })
  }

  return (
    <form className={styles.login} onSubmit={submit}>
      <h1>Вход в чат</h1>
      <p>Данные из личного кабинета GREEN-API</p>
      <input placeholder="idInstance" value={idInstance} onChange={(e) => setId(e.target.value)} required />
      <input
        placeholder="apiTokenInstance"
        type="password"
        value={apiTokenInstance}
        onChange={(e) => setToken(e.target.value)}
        required
      />
      <input placeholder="apiUrl" value={apiUrl} onChange={(e) => setUrl(e.target.value)} required />
      <button type="submit">Войти</button>
    </form>
  )
}
