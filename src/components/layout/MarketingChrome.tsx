import SmoothScroll from '@/components/animations/SmoothScroll'
import PageLoader from '@/components/layout/PageLoader'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import MobileContactBar from '@/components/layout/MobileContactBar'
import AttributionCapture from '@/components/layout/AttributionCapture'
import CustomCursor from '@/components/animations/CustomCursor'
import GrainOverlay from '@/components/animations/GrainOverlay'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Script from 'next/script'
import { ADS_ID } from '@/lib/gtag'

/* Shared by the (marketing) layout and the root not-found page so the
   branded 404 keeps the full marketing experience. The admin app must
   never import this. */
export default function MarketingChrome({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      {/* Google tag (gtag.js) — Google Ads + Consent Mode v2. Loaded once
          site-wide via next/script; the dataLayer queue guarantees consent
          defaults are registered before the config call. */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${ADS_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',region:['GB','AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO']});
gtag('set','url_passthrough', true);
gtag('js', new Date());
gtag('config', '${ADS_ID}');`}
      </Script>
      <SmoothScroll>
        <PageLoader />
        <Header />
        <main>{children}</main>
        <Footer />
      </SmoothScroll>
      {/* Rendered outside SmoothScroll so no transformed ancestor becomes the
          containing block for its fixed positioning (same reason the mobile
          nav overlay lives outside the header). */}
      <MobileContactBar />
      <AttributionCapture />
      <CustomCursor />
      <GrainOverlay />
      <Analytics />
      <SpeedInsights />
    </>
  )
}
