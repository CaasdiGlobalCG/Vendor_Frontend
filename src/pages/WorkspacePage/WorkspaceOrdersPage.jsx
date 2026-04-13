import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { RefreshCw, ArrowLeft, PackageCheck, Clock3, CheckCircle2, AlertCircle } from 'lucide-react';
import authFetch from '../../utils/authFetch';
import { VendorContext } from '../../context/VendorContext';

const statusStyles = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  completed: 'bg-blue-100 text-blue-800 border-blue-200',
  rejected: 'bg-rose-100 text-rose-800 border-rose-200',
  default: 'bg-gray-100 text-gray-800 border-gray-200'
};

const normalizeStatus = (status) => {
  if (!status) return 'pending';
  return String(status).trim().toLowerCase();
};

const getStatusClassName = (status) => statusStyles[normalizeStatus(status)] || statusStyles.default;

const formatDateTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const WorkspaceOrdersPage = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const [searchParams] = useSearchParams();
  const { currentUser, isHydratingUser } = useContext(VendorContext);

  const taskId = searchParams.get('taskId') || '';
  const subtaskId = searchParams.get('subtaskId') || '';
  const taskName = searchParams.get('taskName') || 'Task';
  const subtaskName = searchParams.get('subtaskName') || 'Subtask';
  const tokenFromQuery = searchParams.get('authToken') || '';
  const vendorIdFromQuery = searchParams.get('vendorId') || '';
  const userRoleFromQuery = searchParams.get('userRole') || 'vendor';
  const userEmailFromQuery = searchParams.get('userEmail') || '';
  const userNameFromQuery = searchParams.get('userName') || '';

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tokenFromQuery) return;

    // New tabs do not share sessionStorage, so bootstrap auth token from query once.
    sessionStorage.setItem('authToken', tokenFromQuery);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('authToken');
    navigate(
      `/VendorDashboard/workspace/${encodeURIComponent(workspaceId || '')}/orders?${nextParams.toString()}`,
      { replace: true }
    );
  }, [tokenFromQuery, searchParams, navigate, workspaceId]);

  const getAuthToken = useCallback(() => (
    localStorage.getItem('authToken') ||
    sessionStorage.getItem('authToken') ||
    ''
  ), []);

  const userContext = useMemo(() => {
    const vendorId = currentUser?.vendorId || currentUser?.id || vendorIdFromQuery || '';
    const role = currentUser?.role || userRoleFromQuery || 'vendor';
    const email = currentUser?.email || userEmailFromQuery || '';
    const name = currentUser?.name || userNameFromQuery || '';
    return { vendorId, role, email, name };
  }, [currentUser, vendorIdFromQuery, userRoleFromQuery, userEmailFromQuery, userNameFromQuery]);

  const fetchOrders = useCallback(async ({ silent = false } = {}) => {
    if (!workspaceId || !taskId || !subtaskId) {
      setError('Workspace, task, or subtask context is missing. Open this page from the workspace header Orders button.');
      setIsLoading(false);
      return;
    }

    if (!userContext.vendorId) {
      if (isHydratingUser) {
        setError('');
        setIsLoading(true);
        return;
      }
      setError('Authentication required');
      setIsLoading(false);
      return;
    }

    if (silent) setIsRefreshing(true);
    else setIsLoading(true);

    setError('');

    try {
      const query = new URLSearchParams({
        workspaceId,
        taskId,
        subtaskId,
        vendorId: userContext.vendorId,
        userRole: userContext.role || 'vendor'
      });

      const token = getAuthToken();
      const requestHeaders = {
        'Content-Type': 'application/json',
        'x-user-info': JSON.stringify({
          vendorId: userContext.vendorId,
          role: userContext.role || 'vendor',
          email: userContext.email || '',
          name: userContext.name || ''
        })
      };
      if (token) {
        requestHeaders.Authorization = `Bearer ${token}`;
      }

      const response = await authFetch(`/api/procurement-requests?${query.toString()}`, {
        method: 'GET',
        headers: requestHeaders,
        credentials: 'include'
      });

      let finalResponse = response;
      if (response.status === 401 && token) {
        // Re-establish server cookie session for this new tab and retry once.
        await fetch('/api/auth/session', {
          method: 'POST',
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        finalResponse = await authFetch(`/api/procurement-requests?${query.toString()}`, {
          method: 'GET',
          headers: requestHeaders,
          credentials: 'include'
        });
      }

      if (!finalResponse.ok) {
        let message = 'Failed to fetch orders';
        try {
          const errData = await finalResponse.json();
          message = errData?.message || message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const payload = await finalResponse.json();
      const rows = Array.isArray(payload?.data) ? payload.data : [];

      setOrders(rows);
    } catch (err) {
      setError(err.message || 'Unable to load orders right now.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [workspaceId, taskId, subtaskId, getAuthToken, userContext, isHydratingUser]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchOrders({ silent: true });
    }, 30000);

    return () => clearInterval(intervalId);
  }, [fetchOrders]);

  const summary = useMemo(() => {
    const base = {
      total: orders.length,
      pending: 0,
      completed: 0,
      approved: 0,
      rejected: 0
    };

    for (const order of orders) {
      const status = normalizeStatus(order?.status);
      if (status.includes('pending')) base.pending += 1;
      else if (status.includes('complete')) base.completed += 1;
      else if (status.includes('approve')) base.approved += 1;
      else if (status.includes('reject')) base.rejected += 1;
    }

    return base;
  }, [orders]);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Orders</h1>
            <p className="mt-1 text-sm text-slate-600">
              Workspace: <span className="font-medium text-slate-800">{workspaceId || '--'}</span>
            </p>
            <p className="text-sm text-slate-600">
              Task: <span className="font-medium text-slate-800">{taskName}</span> | Subtask: <span className="font-medium text-slate-800">{subtaskName}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/VendorDashboard/workspace/${workspaceId}`)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back To Workspace
            </button>
            <button
              type="button"
              onClick={() => fetchOrders({ silent: true })}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard icon={PackageCheck} label="Total" value={summary.total} />
          <SummaryCard icon={Clock3} label="Pending" value={summary.pending} />
          <SummaryCard icon={CheckCircle2} label="Approved" value={summary.approved} />
          <SummaryCard icon={PackageCheck} label="Completed" value={summary.completed} />
          <SummaryCard icon={AlertCircle} label="Rejected" value={summary.rejected} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="p-6 text-sm text-slate-600">Loading orders...</div>
          ) : error ? (
            <div className="p-6 text-sm text-rose-700">{error}</div>
          ) : orders.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">No material orders found for this workspace task/subtask yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Request ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Material</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Qty</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Priority</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Requested By</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Created</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr key={order.requestId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{order.requestId || '--'}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-medium text-slate-800">{order.item || '--'}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{order.itemDescription || '--'}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{order.quantity || '--'}</td>
                      <td className="px-4 py-3 text-slate-700">{order.priority || '--'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${getStatusClassName(order.status)}`}>
                          {order.status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{order.requestor || '--'}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDateTime(order.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDateTime(order.updatedAt || order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ icon: Icon, label, value }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
};

export default WorkspaceOrdersPage;
