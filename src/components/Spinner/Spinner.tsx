import styles from './Spinner.module.css'

export const Spinner = ({ size = 20 }: { size?: number }) => (
  <span className={styles.spinner} style={{ width: size, height: size }} role="status" aria-label="Загрузка" />
)
