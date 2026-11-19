import { ConstructionIcon } from 'lucide-react'
import { Page, PageHeader } from './page'
import { EmptyState } from './empty-state'

/** Temporary page body used while a module is being built. */
export function Placeholder({ title }: { title: string }) {
  return (
    <Page>
      <PageHeader title={title} />
      <EmptyState icon={<ConstructionIcon />} title="Coming soon" description={title} />
    </Page>
  )
}
