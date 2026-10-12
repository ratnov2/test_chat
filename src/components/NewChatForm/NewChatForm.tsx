import { useState, type SyntheticEvent } from 'react'
import { checkAccount, type Credentials } from '../../api'
import { actions } from '../../store'
import styles from './NewChatForm.module.css'

export const NewChatForm = ({ creds }: { creds: Credentials }) => {
  const [phone, setPhone] = useState('')

  const submit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      const r = await checkAccount(creds, phone.replace(/\D/g, ''))
      if (!r.exist) return console.warn('Аккаунт МАХ с таким номером не найден')
      actions.ensureChat(r.chatId)
      actions.setActiveChat(r.chatId)
      setPhone('')
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <input placeholder="Номер: 79991234567" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      <button type="submit">+</button>
    </form>
  )
}
