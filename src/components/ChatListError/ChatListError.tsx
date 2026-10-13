import styles from './ChatListError.module.css'

interface Props {
  message: string
  onRetry: () => void
  compact?: boolean
}

export const ChatListError = ({ message, onRetry, compact }: Props) => (
  <div className={`${styles.error} ${compact ? styles.compact : ''}`} role="alert">
    {!compact && (
      <svg className={styles.icon} viewBox="0 0 24 24" width="48" height="48" aria-hidden="true">
        <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z" />
      </svg>
    )}
    <div className={styles.text}>
      <div className={styles.title}>{compact ? message : 'Не удалось загрузить чаты'}</div>
      {!compact && <div className={styles.hint}>{message}</div>}
    </div>
    <button type="button" className={styles.retry} onClick={onRetry}>
      Повторить
    </button>
  </div>
)
