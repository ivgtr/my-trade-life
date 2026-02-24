import { useEffect, useState, useRef } from 'react'
import { AudioSystem } from '../systems/AudioSystem'

/**
 * マイルストーン判定テーブル。
 * 10億円（ビリオネア）は別画面で処理するためここでは扱わない。
 */
export const MILESTONE_TABLE = [
  { threshold: 10_000_000,  message: '一千万円。夢が現実になり始めた。',     duration: 2500 },
  { threshold: 30_000_000,  message: '三千万円。もう普通じゃない。',         duration: 2500 },
  { threshold: 50_000_000,  message: '五千万円。億が見えてきた。',           duration: 3500 },
  { threshold: 100_000_000, message: '一億円。億トレーダー誕生。',           duration: 3500 },
  { threshold: 300_000_000, message: '三億円。伝説になりつつある。',         duration: 3500 },
  { threshold: 500_000_000, message: '五億円。もはや別次元。',               duration: 3500 },
]

const bannerStyle = {
  position: 'fixed',
  top: '60px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 900,
  backgroundColor: 'rgba(0, 0, 0, 0.88)',
  color: '#ffd700',
  padding: '14px 32px',
  borderRadius: '8px',
  fontSize: '18px',
  fontWeight: 'bold',
  textAlign: 'center',
  boxShadow: '0 0 20px rgba(255, 215, 0, 0.3)',
  border: '1px solid rgba(255, 215, 0, 0.4)',
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
}

/**
 * 資産マイルストーン演出コンポーネント。
 * バナーがスライドインして自動消去する。
 */
export default function MilestoneOverlay({ milestone, onComplete }) {
  const [visible, setVisible] = useState(false)
  const [opacity, setOpacity] = useState(0)
  const timerRef = useRef(null)
  const milestoneRef = useRef(null)

  useEffect(() => {
    if (!milestone || milestone.threshold === milestoneRef.current) return
    milestoneRef.current = milestone.threshold

    // SE発火
    AudioSystem.playSE('milestone')

    // スライドイン
    setVisible(true)
    requestAnimationFrame(() => setOpacity(1))

    // 自動消去
    timerRef.current = setTimeout(() => {
      setOpacity(0)
      timerRef.current = setTimeout(() => {
        setVisible(false)
        milestoneRef.current = null
        onComplete?.()
      }, 400)
    }, milestone.duration)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [milestone, onComplete])

  if (!visible || !milestone) return null

  return (
    <div
      style={{
        ...bannerStyle,
        opacity,
        transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-out',
        transform: `translateX(-50%) translateY(${opacity === 1 ? '0' : '-20px'})`,
      }}
    >
      {milestone.message}
    </div>
  )
}
