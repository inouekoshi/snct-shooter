import ErrorFallback from '@/components/ErrorFallback'

export default function NotFound() {
  return (
    <ErrorFallback
      title="ページが見つかりません"
      message="URLが間違っているか、ページが移動した可能性があります。"
    />
  )
}
