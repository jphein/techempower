import { AboutDonate } from '@/components/homepage/AboutDonate'
import { AppsShowcase } from '@/components/homepage/AppsShowcase'
import { GuideGrid } from '@/components/homepage/GuideGrid'
import { Hero } from '@/components/homepage/Hero'
import { NewsletterSignup } from '@/components/homepage/NewsletterSignup'
import { QualifyCallout } from '@/components/homepage/QualifyCallout'
import { ResourcesPreview } from '@/components/homepage/ResourcesPreview'
import { ShowCallout } from '@/components/homepage/ShowCallout'
import { SupportChannels } from '@/components/homepage/SupportChannels'
import { StaticPageHead } from '@/components/StaticPageHead'
import * as config from '@/lib/config'

export default function HomePage() {
  const title = `${config.name} — Technology for All: Access Made Easy`
  const description = config.description

  return (
    <>
      <StaticPageHead title={title} description={description} path='/' />

      <main id='main-content'>
        <Hero />
        <QualifyCallout />
        <GuideGrid />
        <ResourcesPreview />
        <ShowCallout />
        <AppsShowcase />
        <SupportChannels />
        <AboutDonate />
        <NewsletterSignup />
      </main>
    </>
  )
}
