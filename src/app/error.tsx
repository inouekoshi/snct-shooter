'use client'

import ErrorFallback from '@/components/ErrorFallback'

export default function Error() {
  return (
    <ErrorFallback
      title="エラーが発生しました"
      message="画面を表示できませんでした。再読み込みするか、ホームに戻ってください。"
      showReload
    />
  )
}
