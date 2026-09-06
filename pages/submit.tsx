import { StaticPageHead } from '@/components/StaticPageHead'
import { SubmitResourceForm } from '@/components/SubmitResourceForm'
import * as config from '@/lib/config'

export default function SubmitPage() {
  const title = `Submit a resource — ${config.name}`
  const description =
    'Know a free program or service that helps low-income individuals or families? Suggest it for our resources directory.'

  return (
    <>
      {/* This is an intake form, not editorial content — no need for
          search engines to index a submission page. */}
      <StaticPageHead
        title={title}
        description={description}
        path='/submit'
        socialTitle='Submit a resource'
        noindex
      />

      <SubmitResourceForm />
    </>
  )
}
