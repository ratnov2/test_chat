import { AvatarImage } from '../AvatarImage/AvatarImage'
import styles from './Avatar.module.css'

const colorIndex = (id: string) => {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % 7
}

export const Avatar = ({ id, src, title, size }: { id: string; src?: string; title: string; size?: number }) => {
  const style = size ? { width: size, height: size, fontSize: size * 0.37 } : undefined
  return (
    <div className={styles.avatar} data-c={colorIndex(id)} style={style}>
      {title.replace('+', '')[0]?.toUpperCase()}
      {src && <AvatarImage key={src} src={src} />}
    </div>
  )
}
