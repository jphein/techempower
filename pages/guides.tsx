import { GuidesIndex } from '@/components/guides/GuidesIndex'
import { StaticPageHead } from '@/components/StaticPageHead'
import * as config from '@/lib/config'

export default function GuidesPage() {
  const title = `Step-by-step guides — ${config.name}`
  const description =
    'Eight free, plain-English guides to programs that lower the cost of internet, phone service, food, and getting around — who qualifies, what to do, and who to call.'

  return (
    <>
      <StaticPageHead
        title={title}
        description={description}
        path='/guides'
        socialTitle='Step-by-step guides'
      />
      <GuidesIndex />
    </>
  )
}
