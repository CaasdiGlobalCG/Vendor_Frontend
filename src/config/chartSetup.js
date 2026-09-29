// ============================================================
// FILE: chartSetup.js
// PURPOSE: Registers the Chart.js v4 scales, elements and plugins used across
//          the vendor app. Import this once from any module that renders a
//          react-chartjs-2 chart.
// CONNECTS TO: chart.js, chartjs-adapter-date-fns; imported by
//              RevenueDetailPage, RevenueDetailModal and RevenueChart.
// ============================================================
//
// WHY this exists:
//   react-chartjs-2 v5 auto-registers only the *controller* for each typed
//   component (Bar/Line/Doughnut/Pie...). Scales, elements and plugins are NOT
//   auto-registered, so they must be registered explicitly or Chart.js throws
//   `"category" is not a registered scale` / `"arc" is not a registered element`.
//   Registration is idempotent, so importing this from multiple modules is safe.

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);
