# Notification Integration Guide

## Overview
The notification system is now set up to handle notifications for Quotes, Purchase Orders (POs), and Invoices. The bell icon in the header shows an unread count and displays all notifications.

## How to Trigger Notifications

### Import the Notification Context Hook
```jsx
import { useNotifications } from '../context/NotificationContext';

function YourComponent() {
  const { triggerDocumentNotification } = useNotifications();
  // Rest of your component
}
```

### Trigger a Notification

```jsx
triggerDocumentNotification(documentType, status, documentNumber, details);
```

**Parameters:**
- `documentType` (string): 'quote', 'po', or 'invoice'
- `status` (string): The event that occurred (see list below)
- `documentNumber` (string): The quote/PO/invoice number for display
- `details` (object, optional): Additional details like `id` for the link

## Available Notification Events

### Quote Events
- `approved_by_pm` - Quote gets approved by PM
- `sent_to_finance` - Quote gets sent to Finance for approval
- `approved_by_finance` - Approval from finance
- `sent_to_client` - Quote sent to client
- `approved_by_client` - Client Approves quote
- `po_requested` - Request for PO

### PO Events
- `approved_by_pm` - PO gets approved by PM
- `sent_to_finance` - PO gets sent to Finance for approval
- `approved_by_finance` - Approval from finance
- `sent_to_client` - PO sent to client
- `approved_by_client` - Client Approves PO

### Invoice Events
- `approved_by_pm` - Invoice gets approved by PM
- `sent_to_finance` - Invoice gets sent to Finance for approval
- `approved_by_finance` - Approval from finance
- `sent_to_client` - Invoice sent to client
- `approved_by_client` - Client Approves invoice
- `payment_received` - Payment has been received

## Usage Examples

### Example 1: When a Quote is Approved by PM
```jsx
const { triggerDocumentNotification } = useNotifications();

// When quote gets approved by PM
triggerDocumentNotification('quote', 'approved_by_pm', 'CG-2025001', { 
  id: quoteId 
});
```

### Example 2: When an Invoice is Sent to Client
```jsx
triggerDocumentNotification('invoice', 'sent_to_client', 'INV-2025-001', {
  id: invoiceId
});
```

### Example 3: When a PO Payment is Received
```jsx
triggerDocumentNotification('po', 'payment_received', 'PO-2025-001', {
  id: poId,
  amount: 50000
});
```

## Features

### Automatic Unread Count Badge
- The bell icon shows a badge with the unread notification count
- Badge displays '9+' if there are more than 9 unread notifications

### Browser Notifications
- Desktop browser notifications are sent automatically
- Users will be prompted for notification permission on first use

### Notification Links
- Each notification includes a link to the relevant document
- Format: `/VendorDashboard/{documentType}s/{documentId}`

### Real-time Updates
- Notifications appear instantly in the notification dropdown
- WebSocket connection handles real-time notifications from the backend
- 30-second polling for new notifications as backup

## Integration Points

To fully implement this system, integrate notifications at these points in your application:

1. **Quote Workflow**
   - When PM approves quote
   - When finance approves quote
   - When quote is sent to client
   - When client approves quote
   - When PO is requested from quote

2. **PO Workflow**
   - When PM approves PO
   - When finance approves PO
   - When PO is sent to client
   - When client approves PO
   - When payment is received

3. **Invoice Workflow**
   - When PM approves invoice
   - When finance approves invoice
   - When invoice is sent to client
   - When client approves invoice
   - When payment is received

## Bell Icon Features

### Visual Indicators
- Bell icon in the top-right header
- Red unread count badge
- Dropdown menu showing last notifications
- "View all notifications" link

### Notification Dropdown
- Shows up to 10 most recent notifications
- Color-coded by type (green for approvals, blue for sent, etc.)
- Time stamps for each notification
- Action badges for pending items
- Direct links to the related documents

## Notification UI Components

The notification system includes:

1. **Notification Bell Icon** - In the main header (AppHeader)
2. **Notification Dropdown** - Shows recent notifications
3. **Notification Page** - Full list of all notifications
4. **Browser Notifications** - Desktop alerts (with permission)

## Example Implementation in NewQuoteComponent

```jsx
const { triggerDocumentNotification } = useNotifications();

// When saving a quote
const handleSaveQuote = async () => {
  try {
    // ... save quote logic ...
    
    // After successful save, trigger notification
    triggerDocumentNotification('quote', 'sent_to_finance', customQuoteNumber, {
      id: quoteId
    });
  } catch (error) {
    console.error('Error saving quote:', error);
  }
};
```

## API Backend Integration

When your backend processes status changes, it can also trigger notifications via the WebSocket or API, which will be automatically received by the NotificationContext.

---

**Note:** All notifications are stored in the notification state and persist during the user's session. You may need to add backend persistence for notifications to survive page refreshes.
