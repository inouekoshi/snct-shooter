'use client'

import ErrorFallback from '@/components/ErrorFallback'

export default function GlobalError() {
  return (
    <html lang="ja">
      <body style={{ margin: 0, background: '#000' }}>
        <ErrorFallback
          title="エラーが発生しました"
          message="画面を表示できませんでした。再読み込みするか、ホームに戻ってください。"
          showReload
        />
      </body>
    </html>
  )
}
