import { useState, type ChangeEvent, type SyntheticEvent } from 'react'
import { checkAccount, errorMessage, type Credentials } from '../../api'
import { actions } from '../../store'
import { Spinner } from '../Spinner/Spinner'
import styles from './NewChatForm.module.css'
import { formatPhone, isValidPhone, phoneDigits } from './phone'

export const NewChatForm = ({ creds }: { creds: Credentials }) => {
  const [phone, setPhone] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  const digits = phoneDigits(phone)
  const canSubmit = isValidPhone(digits) && !pending

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    const deletedMaskChar = next.length < phone.length && phoneDigits(next) === digits
    setPhone(formatPhone(deletedMaskChar ? digits.slice(0, -1) : next))
    setError(undefined)
  }

  const submit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!canSubmit) return
    setPending(true)
    setError(undefined)
    try {
      const r = await checkAccount(creds, digits)
      if (!r.exist) return setError('Аккаунт МАХ с таким номером не найден')
      actions.ensureChat(r.chatId)
      actions.setActiveChat(r.chatId)
      setPhone('')
    } catch (err) {
      console.error(err)
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="off"
        placeholder="+7 (999) 123-45-67"
        value={phone}
        readOnly={pending}
        aria-invalid={!!error}
        onChange={onChange}
      />
      <button
        type="submit"
        className={pending ? styles.pending : undefined}
        disabled={!canSubmit}
        aria-label="Найти аккаунт"
      >
        {pending ? <Spinner size={18} /> : '+'}
      </button>
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
    </form>
  )
}
