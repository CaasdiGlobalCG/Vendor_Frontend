# Logistics Elements Implementation Plan

## Overview
Add comprehensive logistics tracking and management capabilities to the workspace system. This will enable users to manage shipments, calculate freight costs, optimize routes, and track delivery performance.

---

## Phase 1: Core Components (Week 1)

### 1.1 Shipment Card Component
**File:** `src/pages/WorkspacePage/components/logistics/ShipmentCard.jsx`
- Display shipment information
- Show Origin → Destination route
- Vehicle ID field
- ETA (Estimated Time of Arrival)
- Actual arrival time
- Current shipment status
- Status timeline visualization (pending → in-transit → delivered)
- Edit/View toggle
- Data persistence to canvas

**Data Structure:**
```
{
  shipmentId: string,
  origin: { address: string, coordinates: {} },
  destination: { address: string, coordinates: {} },
  vehicleId: string,
  eta: datetime,
  actualArrival: datetime,
  status: enum ['pending', 'in-transit', 'delivered'],
  timeline: [ { status, timestamp } ],
  carrier: string,
  weight: number,
  trackingNumber: string
}
```

### 1.2 Freight Cost Calculator Component
**File:** `src/pages/WorkspacePage/components/logistics/FreightCostCalculator.jsx`
- Input fields: Distance, Weight, Rate per unit
- Auto-calculate base freight cost
- Fuel surcharge input/auto-calc
- Toll calculation input
- Handling fee input
- Display breakdown table:
  - Base Freight Cost = Distance × Rate
  - Fuel Surcharge (%)
  - Toll Charges
  - Handling Fee
  - **Total Freight Cost**
- Add to summary functionality
- Persist results

**Data Structure:**
```
{
  distance: number,
  distanceUnit: enum ['km', 'miles'],
  rate: number,
  rateType: enum ['per-km', 'per-mile'],
  baseFreightCost: number,
  fuelSurchargePercent: number,
  fuelSurcharge: number,
  tollCharges: number,
  handlingFee: number,
  totalFreightCost: number
}
```

---

## Phase 2: Advanced Logistics Features (Week 2)

### 2.1 Route Optimization Block Component
**File:** `src/pages/WorkspacePage/components/logistics/RouteOptimizationBlock.jsx`
- Display multiple route suggestions
- Show metrics for each route:
  - Total distance
  - Estimated time
  - Estimated cost
  - Traffic conditions (if applicable)
- Cost vs Time comparison table
- Select best route
- Highlight recommended route
- Integrate with mapping (optional: Google Maps API)

**Data Structure:**
```
{
  routes: [
    {
      routeId: string,
      name: string,
      distance: number,
      estimatedTime: number,
      estimatedCost: number,
      waypoints: [ { location, sequence } ],
      trafficCondition: enum ['low', 'moderate', 'high'],
      tollRoads: boolean,
      recommended: boolean
    }
  ],
  selectedRoute: string
}
```

### 2.2 Proof of Delivery (POD) Block Component
**File:** `src/pages/WorkspacePage/components/logistics/ProofOfDeliveryBlock.jsx`
- Signature capture (canvas drawing)
- Photo upload from device
- Timestamp auto-capture
- Recipient name field
- Delivery notes textarea
- Upload to S3 with signed URLs
- Display POD summary on canvas
- Archive functionality

**Data Structure:**
```
{
  podId: string,
  signature: { imageUrl: string, type: 'canvas/upload' },
  photos: [ { url: string, timestamp, description } ],
  timestamp: datetime,
  recipientName: string,
  recipientSignature: string,
  notes: string,
  deliveryConfirmed: boolean,
  s3Keys: [ string ]
}
```

### 2.3 Exception / Delay Report Component
**File:** `src/pages/WorkspacePage/components/logistics/ExceptionDelayReport.jsx`
- Predefined reason codes dropdown:
  - Traffic Congestion
  - Vehicle Breakdown
  - Bad Weather
  - Accident
  - Documentation Issue
  - Customs/Compliance
  - Other
- Custom description field
- Delay duration input
- Auto-calculate penalty based on rules
- Penalty breakdown table
- Attach photos/documents

**Data Structure:**
```
{
  exceptionId: string,
  reasonCode: enum [codes list],
  description: string,
  delayDuration: number,
  delayUnit: enum ['minutes', 'hours', 'days'],
  autoPenaltyAmount: number,
  penaltyReason: string,
  attachments: [ { url, type } ],
  resolution: string,
  timestamp: datetime
}
```

---

## Phase 3: Analytics & Reporting (Week 3)

### 3.1 Carrier Performance Scorecard Component
**File:** `src/pages/WorkspacePage/components/logistics/CarrierPerformanceScorecard.jsx`
- Display KPIs:
  - **On-Time Delivery %** - (Deliveries on/before ETA / Total Deliveries) × 100
  - **Damage Rate %** - (Damaged shipments / Total Shipments) × 100
  - **Cost Deviation %** - (|Actual Cost - Estimated Cost| / Estimated Cost) × 100
- Trend charts (last 30/60/90 days)
- Carrier rating (1-5 stars)
- Performance alerts (if metrics below threshold)
- Export performance report

**Data Structure:**
```
{
  carrierId: string,
  carrierName: string,
  onTimeDeliveryPercent: number,
  damagePercent: number,
  costDeviationPercent: number,
  rating: number (1-5),
  totalShipments: number,
  performancePeriod: { startDate, endDate },
  alerts: [ { type, message, severity } ],
  trends: [ { date, metrics } ]
}
```

### 3.2 Logistics Dashboard Summary Component
**File:** `src/pages/WorkspacePage/components/logistics/LogisticsDashboardSummary.jsx`
- Overview of all shipments on canvas
- Quick stats cards:
  - Total shipments in progress
  - Completed today
  - Pending dispatch
  - Exceptions/alerts
- Add to canvas functionality

---

## Phase 4: Integration & Backend Setup (Week 4)

### 4.1 Backend Models
**Files:** `backend/modules/logistics/models/`
- `LogisticsWorkspace.js` - Main model for logistics data
- `ShipmentModel.js` - Shipment CRUD operations
- `CarrierModel.js` - Carrier data management
- `FreightCostModel.js` - Cost calculations

### 4.2 Backend Routes
**Files:** `backend/modules/logistics/routes/`
- `shipmentRoutes.js` - GET/POST/PUT shipments
- `freightCostRoutes.js` - Calculate freight costs
- `routeOptimizationRoutes.js` - Route calculation
- `podRoutes.js` - POD data management
- `carrierPerformanceRoutes.js` - Performance metrics

### 4.3 Backend Controllers
**Files:** `backend/modules/logistics/controllers/`
- `shipmentController.js`
- `freightCostController.js`
- `routeOptimizationController.js`
- `podController.js`
- `carrierPerformanceController.js`
- `exceptionReportController.js`

### 4.4 DynamoDB Tables
```
logistics_shipments_table:
  - PK: workspaceId
  - SK: shipmentId
  - GSI: carrierId (For carrier performance queries)

logistics_freight_costs_table:
  - PK: workspaceId
  - SK: costCalculationId

carrier_performance_table:
  - PK: carrierId
  - GSI: performancePeriod
```

---

## Phase 5: Canvas Integration

### 5.1 Element Types
Add new element types to ElementNode.jsx:
- `'logistics-shipment-card'` → ShipmentCard
- `'logistics-freight-calculator'` → FreightCostCalculator
- `'logistics-route-optimization'` → RouteOptimizationBlock
- `'logistics-pod'` → ProofOfDeliveryBlock
- `'logistics-exception-report'` → ExceptionDelayReport
- `'logistics-performance-scorecard'` → CarrierPerformanceScorecard
- `'logistics-dashboard'` → LogisticsDashboardSummary

### 5.2 Frontend Modal
**File:** `src/pages/WorkspacePage/components/modals/LogisticsElementsModal.jsx`
- Similar to CostCalculatorsModal structure
- List of logistics elements to add
- Drag from modal to canvas
- Auto-integration with canvas system

### 5.3 Elements Panel Entry
Update `ElementsPanel.jsx` and `ElementsSidebar.jsx`:
- Add new "Logistics" category
- List all 7 logistics elements
- Drag-and-drop support

---

## Phase 6: Features & Enhancements

### 6.1 Export Capabilities
- **PDF Export:** Generate professional logistics reports
- **Excel Export:** Detailed shipment data, performance metrics
- **CSV Export:** For integration with external logistics systems

### 6.2 Real-time Tracking (Optional)
- WebSocket connection for live shipment updates
- Status change notifications
- ETA updates

### 6.3 Mobile Proof of Delivery
- Mobile-responsive POD component
- Camera photo capture on mobile devices
- Offline mode (sync when online)

### 6.4 Notifications & Alerts
- Delay notifications
- Exception alerts
- Performance threshold warnings
- Auto-generated penalty notifications

### 6.5 Historical Data & Archive
- Archive old shipments
- Historical performance trends
- Audit trail for all changes

---

## Implementation Checklist

### Week 1 (Core Components)
- [ ] ShipmentCard component
- [ ] FreightCostCalculator component
- [ ] Unit tests for calculations
- [ ] Canvas integration setup

### Week 2 (Advanced Features)
- [ ] RouteOptimizationBlock component
- [ ] ProofOfDeliveryBlock component
- [ ] ExceptionDelayReport component
- [ ] S3 file upload integration

### Week 3 (Analytics)
- [ ] CarrierPerformanceScorecard component
- [ ] Performance calculation logic
- [ ] Trend charts/visualizations
- [ ] Dashboard summary

### Week 4 (Backend)
- [ ] DynamoDB tables setup
- [ ] Backend models & controllers
- [ ] API routes & endpoints
- [ ] Data validation & business logic

### Week 5 (Integration)
- [ ] LogisticsElementsModal
- [ ] Elements panel integration
- [ ] Full canvas integration testing
- [ ] End-to-end testing

### Week 6 (Polish)
- [ ] Export functionality (PDF/Excel)
- [ ] Error handling & edge cases
- [ ] Performance optimization
- [ ] Documentation

---

## Technical Stack

**Frontend:**
- React components (consistent with existing pattern)
- Canvas integration (ReactFlow nodes)
- Tailwind CSS styling
- Lucide React icons
- HTML2PDF / XLSX for exports

**Backend:**
- Node.js/Express
- AWS DynamoDB
- AWS S3 (for file uploads)
- AWS SDK

**Optional Integrations:**
- Google Maps API (route optimization)
- Geolocation API (tracking)
- WebSocket (real-time updates)

---

## File Structure

```
Frontend:
src/pages/WorkspacePage/components/logistics/
├── ShipmentCard.jsx
├── FreightCostCalculator.jsx
├── RouteOptimizationBlock.jsx
├── ProofOfDeliveryBlock.jsx
├── ExceptionDelayReport.jsx
├── CarrierPerformanceScorecard.jsx
├── LogisticsDashboardSummary.jsx
└── LogisticsElementsModal.jsx

Backend:
backend/modules/logistics/
├── models/
│   ├── LogisticsWorkspace.js
│   ├── ShipmentModel.js
│   └── CarrierModel.js
├── controllers/
│   ├── shipmentController.js
│   ├── freightCostController.js
│   └── carrierPerformanceController.js
└── routes/
    ├── shipmentRoutes.js
    └── carrierRoutes.js
```

---

## Resource Requirements

**Development Team:**
- 2 Frontend developers
- 1 Backend developer
- 1 QA engineer

**Timeline:** 6 weeks (if proceeding immediately)

**Estimated Effort:** 480 person-hours

---

## Success Criteria

✅ All 7 logistics elements working on canvas  
✅ Data persists to DynamoDB  
✅ Export functionality (PDF/Excel) working  
✅ Performance metrics calculated correctly  
✅ Mobile responsive design  
✅ Zero data loss on save/load  
✅ User acceptance testing passed  
✅ Documentation complete  

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Complex data models | Start with simple models, iterate |
| Performance with large datasets | Implement pagination, lazy loading |
| File upload size limits | Compress images, set S3 limits |
| Real-time sync issues | Implement robust error handling |
| Mobile responsiveness | Test on multiple devices early |

---

## Next Steps

1. **Approval:** Get sign-off on this plan
2. **Resource Allocation:** Assign team members
3. **Sprint Planning:** Create detailed sprint tasks
4. **Environment Setup:** Prepare dev/staging environments
5. **Phase 1 Kickoff:** Start with core components

**Ready to proceed with Phase 1?**
