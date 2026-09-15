import {
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  Filter,
  GitFork,
  Globe,
  Hourglass,
  Mail,
  RefreshCw,
  Repeat,
  Tag,
  UserPlus,
  Webhook,
  Workflow as WorkflowIcon,
  Zap
} from 'lucide-react';

export const STATUS_OPTIONS = ['Issued', 'Open', 'Approved', 'Rejected', 'Completed', 'Submitted'];

export const TRIGGER_TYPES = [
  {
    value: 'status-change',
    label: 'A status changes',
    shortLabel: 'Status change',
    icon: RefreshCw,
    cardClass: 'border-blue-200 bg-blue-50 text-blue-700',
    description: 'Runs when an element on the canvas moves to a status you pick, like Approved.'
  },
  {
    value: 'task-completion',
    label: 'A task is completed',
    shortLabel: 'Task completed',
    icon: CheckCircle2,
    cardClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    description: 'Runs as soon as a task or element is marked Completed.'
  },
  {
    value: 'approval',
    label: 'An approval decision is made',
    shortLabel: 'Approval / rejection',
    icon: BadgeCheck,
    cardClass: 'border-amber-200 bg-amber-50 text-amber-700',
    description: 'Runs when something is approved, rejected, or moved back to pending.'
  },
  {
    value: 'time-based',
    label: 'On a schedule',
    shortLabel: 'Schedule',
    icon: Clock,
    cardClass: 'border-sky-200 bg-sky-50 text-sky-700',
    description: 'Runs automatically every day, week, or month at a time you pick.'
  },
  {
    value: 'conditional',
    label: 'Conditions are met',
    shortLabel: 'Conditions',
    icon: Filter,
    cardClass: 'border-violet-200 bg-violet-50 text-violet-700',
    description: 'Runs only when the event data matches rules you set (advanced).'
  },
  {
    value: 'webhook',
    label: 'Another app calls in',
    shortLabel: 'Webhook',
    icon: Webhook,
    cardClass: 'border-rose-200 bg-rose-50 text-rose-700',
    description: 'Lets an external tool start this workflow through a secure webhook URL.'
  }
];

export const ACTION_TYPES = [
  {
    value: 'create-task',
    label: 'Create a task',
    icon: ClipboardList,
    cardClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    description: 'Adds a new task to the workspace, like a work order or RFQ.'
  },
  {
    value: 'update-status',
    label: 'Change a status',
    icon: Tag,
    cardClass: 'border-amber-200 bg-amber-50 text-amber-700',
    description: 'Moves an element to a new status, like Approved or Completed.'
  },
  {
    value: 'assign-user',
    label: 'Assign someone',
    icon: UserPlus,
    cardClass: 'border-yellow-200 bg-yellow-50 text-yellow-700',
    description: 'Hands an element to a teammate to work on.'
  },
  {
    value: 'send-email',
    label: 'Send an email',
    icon: Mail,
    cardClass: 'border-blue-200 bg-blue-50 text-blue-700',
    description: 'Emails a person or team with the details of what happened.'
  },
  {
    value: 'call-webhook',
    label: 'Notify another app',
    icon: Globe,
    cardClass: 'border-rose-200 bg-rose-50 text-rose-700',
    description: 'Sends the event to an external URL (webhook).'
  },
  {
    value: 'invoke-subworkflow',
    label: 'Run another workflow',
    icon: WorkflowIcon,
    cardClass: 'border-purple-200 bg-purple-50 text-purple-700',
    description: 'Starts a different saved workflow as the next step.'
  },
  {
    value: 'wait-approval',
    label: 'Wait for approval',
    icon: Hourglass,
    cardClass: 'border-orange-200 bg-orange-50 text-orange-700',
    description: 'Pauses until someone approves or rejects, then continues.'
  },
  {
    value: 'conditional-branch',
    label: 'If / else branch',
    icon: GitFork,
    cardClass: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    description: 'Does different things depending on conditions (advanced).'
  },
  {
    value: 'loop',
    label: 'Repeat actions',
    icon: Repeat,
    cardClass: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    description: 'Runs a set of actions multiple times (advanced).'
  }
];

export const triggerTypeMeta = (type) => TRIGGER_TYPES.find((item) => item.value === type);
export const actionTypeMeta = (type) => ACTION_TYPES.find((item) => item.value === type);

export const baseRuleForType = (type) => {
  switch (type) {
    case 'status-change':
      return { nodeId: '', status: 'Approved', fromStatus: '' };
    case 'task-completion':
      return { nodeId: '' };
    case 'approval':
      return { nodeId: '', approvalStatus: 'Approved' };
    case 'time-based':
      return { frequency: 'daily', time: '09:00', dayOfWeek: 1, dayOfMonth: 1, cronExpression: '' };
    case 'conditional':
      return { operator: 'AND', operands: [{ field: '', operator: '=', value: '' }] };
    case 'webhook':
      return { source: 'external' };
    default:
      return {};
  }
};

export const baseParamsForType = (type) => {
  switch (type) {
    case 'create-task':
      return {
        templateType: 'execution-work-order',
        templateData: {
          title: '',
          location: '',
          assignee: '',
          priority: 'Medium'
        }
      };
    case 'update-status':
      return { nodeId: '', newStatus: 'Approved', message: '' };
    case 'assign-user':
      return { nodeId: '', userId: '' };
    case 'send-email':
      return {
        templateType: 'custom',
        recipient: '',
        subject: 'Workflow notification: {{workflowName}}',
        body: 'Task {{taskName}} is now {{taskStatus}}.'
      };
    case 'call-webhook':
      return { url: '', method: 'POST', headers: {}, body: {} };
    case 'invoke-subworkflow':
      return { subworkflowId: '' };
    case 'wait-approval':
      return {
        expectedStatus: 'Approved',
        approver: '',
        autoApprove: false,
        message: 'Workflow paused pending approval.'
      };
    case 'conditional-branch':
      return {
        conditionJson: JSON.stringify(
          { operator: 'AND', operands: [{ field: 'status', operator: '=', value: 'Approved' }] },
          null,
          2
        ),
        ifActionsJson: JSON.stringify([], null, 2),
        elseActionsJson: JSON.stringify([], null, 2)
      };
    case 'loop':
      return {
        mode: 'count',
        count: 2,
        maxIterations: 5,
        conditionJson: JSON.stringify(
          { operator: 'AND', operands: [{ field: 'status', operator: '=', value: 'Approved' }] },
          null,
          2
        ),
        actionsJson: JSON.stringify([], null, 2)
      };
    default:
      return {};
  }
};

const DAY_NAMES = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday'
};

const describeSchedule = (rule = {}) => {
  if (rule.cronExpression) return 'On a custom schedule';
  const at = rule.time ? ` at ${rule.time}` : '';
  if (rule.frequency === 'weekly') return `Every ${DAY_NAMES[rule.dayOfWeek ?? 1] || 'Monday'}${at}`;
  if (rule.frequency === 'monthly') return `Every month on day ${rule.dayOfMonth || 1}${at}`;
  return `Every day${at}`;
};

export const describeTrigger = (trigger) => {
  if (!trigger) return 'Something happens';
  const rule = trigger.rule || {};
  const onNode = rule.nodeId ? ` on ${rule.nodeId}` : '';
  switch (trigger.type) {
    case 'status-change':
      return `Status becomes ${rule.status || '…'}${onNode}`;
    case 'task-completion':
      return `A task is completed${onNode}`;
    case 'approval': {
      const decision = (rule.approvalStatus || 'approved').toLowerCase();
      return `Something gets ${decision}${onNode}`;
    }
    case 'time-based':
      return describeSchedule(rule);
    case 'conditional': {
      const count = (rule.operands || []).length;
      return count > 0 ? `${count} condition${count === 1 ? '' : 's'} must match` : 'Matching conditions';
    }
    case 'webhook':
      return `${rule.source || 'An external app'} calls in`;
    default:
      return trigger.type || 'Something happens';
  }
};

const TASK_TYPE_LABELS = {
  'execution-work-order': 'work order',
  'execution-rfi': 'RFI',
  'execution-inspection': 'inspection',
  'execution-daily-site-log': 'daily site log',
  'procurement-rfq': 'procurement RFQ'
};

export const describeAction = (action) => {
  if (!action) return 'Do something';
  const params = action.params || {};
  switch (action.type) {
    case 'create-task': {
      const kind = TASK_TYPE_LABELS[params.templateType] || 'task';
      const title = params.templateData?.title ? ` "${params.templateData.title}"` : '';
      return `Create a ${kind}${title}`;
    }
    case 'update-status':
      return `Set status to ${params.newStatus || '…'}${params.nodeId ? ` on ${params.nodeId}` : ''}`;
    case 'assign-user':
      return `Assign to ${params.userId || 'a teammate'}`;
    case 'send-email':
      return `Email ${params.recipient || 'a recipient'}`;
    case 'call-webhook':
      return `Call ${params.url || 'a webhook URL'}`;
    case 'invoke-subworkflow':
      return `Run workflow ${params.subworkflowId || '…'}`;
    case 'wait-approval':
      return `Wait for ${(params.expectedStatus || 'approval').toLowerCase()}`;
    case 'conditional-branch':
      return 'Run if / else actions';
    case 'loop':
      return params.mode === 'while' ? 'Repeat while a condition holds' : `Repeat ${params.count || 1} time(s)`;
    default:
      return action.type || 'Do something';
  }
};

export const buildWorkflowTemplates = () => {
  const stamp = Date.now();
  return [
    {
      key: 'approved-work-order',
      icon: Zap,
      name: 'Approval → work order',
      tagline: 'When something gets approved on the canvas, a work order task is created automatically.',
      chipClass: 'bg-blue-100 text-blue-700',
      form: {
        name: 'Approved → work order',
        description: 'Creates a work order whenever an element is approved.',
        isEnabled: true,
        logicOperator: 'AND',
        triggers: [{ id: `TR-${stamp}-a`, type: 'approval', rule: { nodeId: '', approvalStatus: 'Approved' } }],
        actions: [
          {
            id: `ACT-${stamp}-a`,
            type: 'create-task',
            params: {
              templateType: 'execution-work-order',
              templateData: { title: 'Work order', location: '', assignee: '', priority: 'Medium' }
            }
          }
        ]
      }
    },
    {
      key: 'completed-notify',
      icon: Mail,
      name: 'Task done → email the team',
      tagline: 'Sends an email as soon as a task is marked completed.',
      chipClass: 'bg-emerald-100 text-emerald-700',
      form: {
        name: 'Completed → notify by email',
        description: 'Emails the team when a task is completed.',
        isEnabled: true,
        logicOperator: 'AND',
        triggers: [{ id: `TR-${stamp}-b`, type: 'task-completion', rule: { nodeId: '' } }],
        actions: [
          {
            id: `ACT-${stamp}-b`,
            type: 'send-email',
            params: {
              templateType: 'status-updated',
              recipient: '',
              subject: 'Task completed: {{taskName}}',
              body: 'Task {{taskName}} is now {{taskStatus}}.'
            }
          }
        ]
      }
    },
    {
      key: 'daily-log',
      icon: Clock,
      name: 'Every morning → daily log',
      tagline: 'Creates a daily site log task at 9:00 AM automatically.',
      chipClass: 'bg-amber-100 text-amber-700',
      form: {
        name: 'Daily site log',
        description: 'Creates a daily site log task every morning.',
        isEnabled: true,
        logicOperator: 'AND',
        triggers: [
          {
            id: `TR-${stamp}-c`,
            type: 'time-based',
            rule: { frequency: 'daily', time: '09:00', dayOfWeek: 1, dayOfMonth: 1, cronExpression: '' }
          }
        ],
        actions: [
          {
            id: `ACT-${stamp}-c`,
            type: 'create-task',
            params: {
              templateType: 'execution-daily-site-log',
              templateData: { title: 'Daily site log', location: '', assignee: '', priority: 'Medium' }
            }
          }
        ]
      }
    }
  ];
};
