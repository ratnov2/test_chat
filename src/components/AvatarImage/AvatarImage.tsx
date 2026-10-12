import { useState } from 'react'
import styles from './AvatarImage.module.css'

export const AvatarImage = ({ src }: { src: string }) => {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <img
      className={`${styles.img}${loaded ? ` ${styles.loaded}` : ''}`}
      src={src}
      alt=""
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  )
}
