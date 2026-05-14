'use client'

import { DashboardLayout } from '@/components/dashboard-layout'
import { WorkQueueTable } from '@/components/work-queue-table'
import { Button } from '@/components/ui/button'

export default function WorkQueuePage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Work Queue</h1>
            <p className="text-muted-foreground">Review and manage pending AI-generated emails</p>
          </div>
          
        </div>

        {/* Work Queue Table */}
        <WorkQueueTable />
      </div>
    </DashboardLayout>
  )
}
