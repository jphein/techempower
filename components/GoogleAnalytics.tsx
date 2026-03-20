import Script from 'next/script'

const gaTrackingId = process.env.NEXT_PUBLIC_GA_TRACKING_ID

export function GoogleAnalytics() {
  if (!gaTrackingId) {
    return null
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaTrackingId}`}
        strategy='afterInteractive'
      />
      <Script id='google-analytics' strategy='afterInteractive'>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaTrackingId}');
        `}
      </Script>
    </>
  )
}
