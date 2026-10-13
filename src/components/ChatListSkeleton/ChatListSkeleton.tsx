import styles from './ChatListSkeleton.module.css'

const ROWS = 9
const TITLE_WIDTHS = [52, 38, 64, 46, 58, 42, 68, 50, 36]
const LAST_WIDTHS = [78, 62, 84, 70, 56, 88, 66, 74, 60]

export const ChatListSkeleton = () => (
  <div className={styles.list} role="status" aria-busy="true" aria-label="Загрузка чатов">
    {Array.from({ length: ROWS }, (_, i) => (
      <div key={i} className={styles.row}>
        <div className={`${styles.bone} ${styles.avatar}`} />
        <div className={styles.meta}>
          <div className={`${styles.bone} ${styles.line}`} style={{ width: `${TITLE_WIDTHS[i]}%` }} />
          <div className={`${styles.bone} ${styles.line}`} style={{ width: `${LAST_WIDTHS[i]}%` }} />
        </div>
      </div>
    ))}
  </div>
)
