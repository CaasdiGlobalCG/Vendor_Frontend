# CG Assistant — AI-Powered Vendor Dashboard Assistant

## Complete Feature Documentation

**Prepared for:** Management & Stakeholders
**Date:** February 26, 2026
**Module:** Vendor Dashboard — AI Assistant Panel

---

## Table of Contents

1. [What is CG Assistant?](#1-what-is-cg-assistant)
2. [AI Chat with Real Data Access](#2-ai-chat-with-real-data-access)
3. [Streaming Responses](#3-streaming-responses)
4. [Quick Commands (Slash Commands)](#4-quick-commands-slash-commands)
5. [Smart Follow-Up Suggestions](#5-smart-follow-up-suggestions)
6. [Conversation Memory & History](#6-conversation-memory--history)
7. [Markdown-Formatted Responses](#7-markdown-formatted-responses)
8. [Feedback System (Thumbs Up / Down)](#8-feedback-system-thumbs-up--down)
9. [Continuous Learning](#9-continuous-learning)
10. [Resizable & Floating Panel](#10-resizable--floating-panel)
11. [Scheduled Reports](#11-scheduled-reports)
12. [Deadline Reminders](#12-deadline-reminders)
13. [Email Notifications via AWS SES](#13-email-notifications-via-aws-ses)
14. [Real-Time In-App Notifications](#14-real-time-in-app-notifications)
15. [Security & Data Privacy](#15-security--data-privacy)

---

## 1. What is CG Assistant?

### What is it?
CG Assistant is an intelligent AI helper built directly into the Vendor Dashboard. It allows vendors to ask questions about their business data — invoices, quotations, tasks, leads, projects, and more — using plain English, just like chatting with a colleague.

### Why did we build it?
Vendors often need to check the status of invoices, count pending tasks, or get a quick overview of their business. Previously, they had to navigate through multiple pages and screens to find this information. CG Assistant puts all of that at their fingertips in a single conversational interface.

### How does it help?
- **Saves time** — Instead of clicking through 5-6 pages, vendors type one question and get the answer instantly.
- **No training required** — Vendors don't need to learn complex filters or navigation. They just ask in plain English.
- **Always available** — The assistant panel is accessible from any page in the dashboard via a button in the header.

---

## 2. AI Chat with Real Data Access

### What is it?
When a vendor asks a question like *"How many invoices are pending?"* or *"Show me my leads"*, the assistant doesn't guess. It connects to the vendor's actual data in the database and retrieves real, up-to-date numbers.

### What data can it access?
| Business Area | What It Can Show |
|---|---|
| **Workspaces** | List of workspaces, tasks within each workspace, task statuses |
| **Invoices** | All invoices with amounts, statuses (paid, pending, overdue) |
| **Quotations** | Quotations with customer names, totals, approval status |
| **Purchase Orders** | PO details and values |
| **Credit Notes** | Credit note summaries |
| **Subscriptions** | Active recurring billing subscriptions |
| **Leads** | Lead invitations, acceptance rates, PM decisions |
| **Projects** | Project listings with status and progress |
| **Products** | Product catalog count and details |
| **Customers** | Customer list |
| **Team Members** | RBAC team member list |
| **Notifications** | Unread notification count |
| **Vendor Profile** | Business profile details |

### Why is this important?
The AI is **not making things up**. Every number, every name, every status comes from the vendor's own data. This ensures the answers are trustworthy and accurate.

### How does it work?
The AI has 17 specialised "tools" — each one knows how to fetch a specific type of data. When a vendor asks a question, the AI decides which tool(s) to use, fetches the data, and then writes a helpful response based on what it finds.

---

## 3. Streaming Responses

### What is it?
When the assistant is generating a response, it appears word-by-word in real time — similar to how ChatGPT works. The vendor can see the response being built, rather than waiting for the entire answer to load.

### Why did we build it?
- **Feels faster** — Even if the full response takes a few seconds, seeing words appear immediately makes the experience feel instant.
- **Transparency** — Vendors can see exactly what the AI is doing: first it shows "Processing your request...", then which data tools it's using, and finally the answer streams in.
- **Reduces anxiety** — With a loading spinner, users wonder *"Is it stuck?"*. With streaming, they can see progress happening.

---

## 4. Quick Commands (Slash Commands)

### What is it?
Typing `/` in the chat input opens a dropdown menu of pre-built shortcuts. Instead of typing a full question, vendors can select a command to instantly trigger a common query.

### Available Commands

| Command | What It Does |
|---|---|
| `/summary` | Complete dashboard overview — projects, leads, finance, tasks |
| `/finance` | Detailed finance breakdown — invoices, quotations, POs, credit notes |
| `/tasks` | All pending tasks across every workspace |
| `/leads` | Lead invitations with status and conversion stats |
| `/projects` | All projects with their progress |
| `/profile` | Vendor profile, team members, products, customers |
| `/schedule` | Opens the Schedules & Reminders management panel |
| `/reminders` | Shows all active scheduled reports and reminders |

### Why did we build it?
- **Speed** — One click instead of typing a full sentence.
- **Discoverability** — New users can see what the assistant is capable of without needing a tutorial.
- **Consistency** — The pre-built queries are optimised to return the most useful information.

---

## 5. Smart Follow-Up Suggestions

### What is it?
After every AI response, the assistant shows 2-3 clickable suggestion buttons below the message. These are context-aware follow-up questions the vendor might want to ask next.

### How does it work?
The system analyses two things:
1. **What data was just retrieved** — If the AI just showed invoice data, it might suggest *"Show overdue invoices"* or *"What is the total revenue this month?"*
2. **What the vendor already asked** — It avoids suggesting something the vendor just asked about.

### Example
> **Vendor:** "Show me my leads"
> **AI:** *Shows 12 leads with statuses...*
> **Suggestions:** `Show only pending leads` · `How many leads were accepted?` · `What is my lead conversion rate?`

### Why did we build it?
- **Guides the conversation** — Vendors may not know what else to ask. Suggestions show them what's possible.
- **Reduces typing** — One tap instead of typing out a new question.
- **Deeper engagement** — Vendors explore more of their data, getting more value from the tool.

---

## 6. Conversation Memory & History

### What is it?
Every conversation is automatically saved. Vendors can:
- **Continue where they left off** — Closing and reopening the panel keeps the current chat intact.
- **View past conversations** — Click "Recent Chats" to see all previous conversations, grouped by Today, Yesterday, This Week, and Older.
- **Start fresh** — Click the "+" button to begin a new conversation at any time.
- **Delete old chats** — Hover over any conversation and click the delete icon.

### Smart Conversation Titles
When a vendor starts a new chat, the AI automatically generates a short, descriptive title (e.g., *"Pending Tasks Overview"*, *"Finance Summary"*) so it's easy to find later.

### Why did we build it?
- **Continuity** — Vendors don't lose their context if they accidentally close the panel.
- **Reference** — Past conversations serve as a log of questions asked and answers received.
- **Organisation** — Auto-generated titles make it easy to scan through history.

---

## 7. Markdown-Formatted Responses

### What is it?
The AI's responses are formatted with proper styling:
- **Bold text** for emphasis
- *Italic text* for names and labels
- `Code-style text` for IDs and reference numbers
- Bullet points for lists
- Numbered lists for steps
- Headings for sections
- Proper spacing between paragraphs

### Why did we build it?
Raw text walls are hard to read. Proper formatting makes the AI's responses scannable, professional, and easy to understand at a glance — especially for data-heavy responses with multiple invoices or tasks.

---

## 8. Feedback System (Thumbs Up / Down)

### What is it?
Every AI response has a thumbs-up and thumbs-down button. Vendors can quickly rate whether a response was helpful or not.

### How does it work?
- **Thumbs Up** — Marks the response as good. The AI learns to give similar responses in the future.
- **Thumbs Down** — Marks the response as unhelpful. The AI learns to avoid similar patterns.
- Feedback is linked to the specific question-answer pair and stored for learning.

### Why did we build it?
- **Quality improvement** — Real user feedback is the most reliable signal for improving AI responses.
- **Personalisation** — Over time, the AI adapts to each vendor's preferences.
- **Accountability** — We can track the quality of AI responses across all vendors.

---

## 9. Continuous Learning

### What is it?
The AI gets smarter over time for each individual vendor. It learns from:

1. **Corrections** — If a vendor says *"Actually, that project is called XYZ, not ABC"*, the AI detects this as a correction and remembers it for future conversations.
2. **Facts** — When the AI retrieves data (e.g., *"You have 7 workspaces"*), it caches this fact so it can reference it faster next time.
3. **Style preferences** — If a vendor consistently asks for bullet points or detailed explanations, the AI adapts its formatting style.
4. **Query patterns** — Frequently asked questions are tracked to optimise response speed.

### Why did we build it?
- **Personalised experience** — Each vendor's AI becomes uniquely tuned to their communication style and business context.
- **Fewer repetitive mistakes** — Once corrected, the AI doesn't make the same error again.
- **Faster over time** — Cached facts and patterns reduce the need to re-query databases.

### Learning Stats
The panel header shows a small counter (e.g., *"47 interactions learned"*) so vendors can see the AI is actively improving.

---

## 10. Resizable & Floating Panel

### What is it?
The AI panel can be customised in two ways:

1. **Resize** — Drag the left edge of the panel to make it wider or narrower (from 340px to 85% of screen width).
2. **Float mode** — Click the float button to detach the panel from the side. It becomes a draggable, resizable window that can be positioned anywhere on screen.
3. **Dock mode** — Click the dock button to snap it back to the right side.

### Why did we build it?
- **Multitasking** — In float mode, vendors can position the AI panel next to their data and reference both simultaneously.
- **Screen flexibility** — Some vendors work on large monitors, others on laptops. Resizing ensures the panel fits their setup.
- **Non-intrusive** — The panel doesn't block the main dashboard content when sized appropriately.

---

## 11. Scheduled Reports

### What is it?
Vendors can set up **automatic recurring reports** that are generated and delivered on a schedule. Instead of manually checking the dashboard every week, the system sends the data directly to them.

### How to set it up?
Vendors simply type in natural language:
- *"Send me a finance summary every Monday"*
- *"Weekly invoice report every Friday at 9am"*
- *"Monthly dashboard summary on the 1st"*
- *"Send me a lead status report daily"*

The AI understands the request, creates the schedule, and confirms the details.

### Supported Report Types

| Report Scope | What It Includes |
|---|---|
| **Dashboard Summary** | Finance, tasks, leads, and projects — all in one report |
| **Finance Summary** | Invoices, quotations, POs, credit notes, subscriptions with totals |
| **Invoice Report** | Invoice count, paid vs pending vs overdue, total value |
| **Quotation Report** | Quotation count, acceptance rate, total value |
| **Task Report** | Workspace tasks — total, pending, completed, overdue |
| **Lead Report** | Lead count, pending, accepted, rejected breakdown |
| **Project Report** | Project count, active vs completed |
| **Purchase Order Report** | PO count and total value |
| **Credit Note Report** | Credit note count and total value |
| **Subscription Report** | Active subscription count |

### Frequency Options
- **Daily** — Every day at the specified time
- **Weekly** — Every week on a chosen day (e.g., every Monday)
- **Biweekly** — Every two weeks
- **Monthly** — Once a month (1st of the month)

### Managing Schedules
- Open the schedule manager using the 📅 button in the header or type `/schedule`
- **Pause/Resume** — Toggle any schedule on/off without deleting it
- **Delete** — Remove schedules you no longer need
- **View next run** — See exactly when each report will be sent next

### Why did we build it?
- **Proactive information** — Vendors don't have to remember to check their data. It comes to them.
- **Management reporting** — Team leads and business owners get regular snapshots without any manual effort.
- **Early warning system** — Overdue invoices, pending tasks, and rejected leads are surfaced automatically before they become bigger problems.

---

## 12. Deadline Reminders

### What is it?
Vendors can set reminders for important business deadlines. These are **limited to business activities only** — not personal reminders. The system notifies them before a deadline arrives.

### How to set it up?
Type naturally:
- *"Remind me about invoice INV-001 due on March 15"*
- *"Set a reminder for quotation QT-456 expiring next Friday"*
- *"Remind me 2 hours before the payment deadline"*
- *"Remind me about the project submission due April 1st"*

### What can reminders track?
Only CaaS business-related items:
- Quotation deadlines
- Invoice due dates
- Payment deadlines
- Workspace task due dates
- Project milestones
- Purchase order deadlines
- Credit note deadlines
- Subscription renewals
- Lead follow-up dates

### "Notify Before" Feature
Vendors can specify how far in advance they want to be reminded:
- *"Remind me 1 day before"*
- *"Remind me 2 hours before"*
- *"Remind me 30 minutes before"*

### What happens when a reminder is due?
Two things happen simultaneously:
1. **An email is sent** to the vendor's registered email address with all the reminder details.
2. **An in-app notification** appears in real-time on the dashboard (via the notification bell).

One-time reminders automatically deactivate after firing. Recurring reminders reschedule automatically.

### Why did we build it?
- **Never miss a deadline** — Late invoices, expired quotations, and missed project deadlines cost real money and damage relationships.
- **Automated follow-up** — The system tracks deadlines so vendors don't have to.
- **Business-focused** — By limiting reminders to CaaS activities, we keep the tool professional and relevant.

---

## 13. Email Notifications via AWS SES

### What is it?
All scheduled reports and deadline reminders are delivered via email using **Amazon SES (Simple Email Service)** — Amazon's enterprise-grade email delivery system.

### What do the emails look like?
Emails are professionally designed with:
- A branded header with the CaaS Digital Global gradient
- Visual stat cards showing key numbers (invoices, tasks, leads, etc.)
- Colour-coded indicators (green for positive, red for overdue/danger, amber for pending)
- A "Open Dashboard" button linking directly to the vendor platform
- Clear labelling of the report type and frequency

### Report emails include:
- Real-time data pulled from the vendor's account at the moment of sending
- Totals, counts, and status breakdowns
- Visual separation between sections (Finance, Tasks, Leads, Projects)

### Reminder emails include:
- The specific item being tracked (invoice number, task name, etc.)
- The due date prominently displayed
- Any description or notes the vendor added
- A direct link to the dashboard

### Why AWS SES instead of regular email?
- **Reliability** — SES is used by Amazon itself; it has near-100% deliverability.
- **Scalability** — Can handle thousands of emails per second as the vendor base grows.
- **Cost-effective** — Significantly cheaper than traditional SMTP email services.
- **Already integrated** — Our infrastructure already runs on AWS, so SES fits naturally.

---

## 14. Real-Time In-App Notifications

### What is it?
When a scheduled report fires or a deadline reminder is due, a **real-time notification** is pushed to the vendor's dashboard instantly — even if they have the page open. This appears in the notification bell, just like any other platform notification.

### How does it work?
The system uses **WebSocket connections** — a live, always-open channel between the vendor's browser and our server. The moment a schedule fires, the notification is pushed through this channel in under a second.

### Why did we build it?
- **Redundancy** — Even if the email goes to spam or the vendor isn't checking email, the in-app notification catches their attention.
- **Immediacy** — No need to refresh the page. The notification appears instantly.
- **Unified experience** — Reports and reminders appear alongside other dashboard notifications (leads, project updates, etc.).

---

## 15. Security & Data Privacy

### How is vendor data protected?

| Measure | Details |
|---|---|
| **Authentication** | Every AI request requires a valid login token (Cognito JWT). Unauthenticated requests are rejected. |
| **Vendor isolation** | The AI can only access the data of the currently logged-in vendor. Vendor A cannot see Vendor B's data. |
| **No data sharing** | The AI model runs locally (Ollama) — vendor data is NOT sent to OpenAI, Google, or any third-party AI service. |
| **Encrypted storage** | All conversation history is stored in DynamoDB with encryption at rest. |
| **No personal reminders** | The system only allows business-related schedules, preventing misuse. |

### Why does this matter?
Vendors trust us with their financial data, customer information, and business operations. By running the AI model locally and enforcing strict data isolation, we ensure that sensitive business data never leaves our infrastructure.

---

## Summary

| Feature | Business Value |
|---|---|
| AI Chat with Real Data | Instant answers without navigating multiple pages |
| Streaming Responses | Feels fast and transparent |
| Slash Commands | One-click access to common reports |
| Smart Suggestions | Guides vendors to deeper insights |
| Conversation Memory | Never lose context; refer back to past chats |
| Formatted Responses | Clean, readable, professional output |
| Feedback System | AI quality improves based on real usage |
| Continuous Learning | Personalised experience for each vendor |
| Resizable/Floating Panel | Works on any screen size, supports multitasking |
| Scheduled Reports | Proactive business insights delivered automatically |
| Deadline Reminders | Never miss an invoice, quotation, or task deadline |
| Email via AWS SES | Enterprise-grade email delivery |
| Real-Time Notifications | Instant alerts in the dashboard |
| Data Privacy | Local AI model, vendor isolation, no third-party data sharing |

---

*Document prepared by the Engineering Team — CaaS Digital Global*
*For questions or feedback, contact the development team.*
