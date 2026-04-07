import { NetWorthTicker }    from '../components/widgets/NetWorthTicker'
import { WeeklyScore }        from '../components/widgets/WeeklyScore'
import { StreakBadges }       from '../components/widgets/StreakBadges'
import { AssetBreakdown }     from '../components/widgets/AssetBreakdown'
import { BudgetStatus }       from '../components/widgets/BudgetStatus'
import { MilestoneProgress }  from '../components/widgets/MilestoneProgress'
import { NetWorthChart }      from '../components/widgets/NetWorthChart'
import { Receivables }        from '../components/widgets/Receivables'

export function Dashboard() {
  return (
    <div className="p-4 md:p-6">
      {/* Mobile: single column — Tablet: 2 col — Desktop: 3 col */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <NetWorthTicker />
        <WeeklyScore />
        <StreakBadges />
        <AssetBreakdown />
        <BudgetStatus />
        <MilestoneProgress />
        {/* Chart spans 2 cols on tablet+, full row on desktop */}
        <div className="md:col-span-2">
          <NetWorthChart />
        </div>
        <Receivables />
      </div>
    </div>
  )
}
