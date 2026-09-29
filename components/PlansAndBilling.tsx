'use client';

import React, { useState, useEffect } from 'react';
import { StoragePlan, LogicalQuota, ManualUPIPayment } from '@/types';
import { formatBytes } from '@/lib/formatters';
import {
  Check,
  Sparkles,
  QrCode,
  Copy,
  Clock,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

interface PlansAndBillingProps {
  currentQuota: LogicalQuota | null;
  onPlanUpgraded: () => void;
}

export const PlansAndBilling: React.FC<PlansAndBillingProps> = ({
  currentQuota,
  onPlanUpgraded,
}) => {
  const [plans, setPlans] = useState<StoragePlan[]>([]);
  const [payments, setPayments] = useState<ManualUPIPayment[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<StoragePlan | null>(null);
  const [upiRefId, setUpiRefId] = useState('');
  const [userVpa, setUserVpa] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recipientUpiId = 'storagepay@upi';

  const loadData = async () => {
    try {
      const [plansRes, paymentsRes] = await Promise.all([
        fetch('/api/plans'),
        fetch('/api/payments/upi'),
      ]);

      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data.plans || []);
      }
      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        setPayments(data.payments || []);
      }
    } catch (e) {
      console.error('Failed to load plans data', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(recipientUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !upiRefId.trim()) return;

    try {
      setSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch('/api/payments/upi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          amountInr: selectedPlan.monthlyPrice ?? selectedPlan.monthlyPriceInr ?? 199,
          upiReferenceId: upiRefId.trim(),
          userVpa: userVpa.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Submission failed');
      }

      setSuccessMsg(`Payment submission for ${selectedPlan.name} registered successfully!`);
      setUpiRefId('');
      setUserVpa('');
      setSelectedPlan(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoApprove = async (paymentId: string) => {
    try {
      const res = await fetch('/api/payments/upi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'demo_approve', paymentId }),
      });
      if (res.ok) {
        await loadData();
        onPlanUpgraded();
      }
    } catch (e) {
      console.error('Demo approval failed', e);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-neutral-900">Storage Plans & Subscriptions</h1>
          <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
            Phase 1
          </span>
        </div>
        <p className="text-xs text-neutral-500 max-w-2xl">
          Purchase monthly cloud capacity with our straightforward UPI payment workflow. Your storage quota is dynamically expanded upon verification.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const isCurrent = currentQuota?.planId === plan.id;
          const isSelected = selectedPlan?.id === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                isCurrent
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                  : isSelected
                  ? 'border-neutral-900 ring-2 ring-neutral-900/10 shadow-xs'
                  : 'border-neutral-200 hover:border-neutral-300 shadow-2xs'
              }`}
            >
              {plan.isPopular && !isCurrent && (
                <div className="absolute -top-2.5 right-4 px-2 py-0.5 bg-neutral-900 text-white rounded-full text-[10px] font-semibold tracking-wider uppercase">
                  Most Popular
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-2.5 right-4 px-2 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-semibold tracking-wider uppercase flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" />
                  <span>Current Plan</span>
                </div>
              )}

              <div>
                <div className="text-sm font-semibold text-neutral-900">{plan.name}</div>
                <div className="text-xs text-neutral-400 mt-0.5">{plan.description}</div>

                <div className="mt-4 mb-4">
                  <span className="text-2xl font-bold text-neutral-900">₹{plan.monthlyPrice ?? plan.monthlyPriceInr}</span>
                  <span className="text-xs text-neutral-500"> / month</span>
                </div>

                <div className="space-y-2 text-xs text-neutral-600 pt-2 border-t border-neutral-100 mb-6">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                {isCurrent ? (
                  <div className="w-full py-2 text-center text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl">
                    Active Subscription
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedPlan(plan);
                      setSuccessMsg(null);
                      setErrorMsg(null);
                    }}
                    className={`w-full py-2 text-xs font-semibold rounded-xl transition-colors ${
                      isSelected
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                    }`}
                  >
                    Select Plan
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual UPI Workflow Drawer / Panel */}
      {selectedPlan && (
        <div className="bg-neutral-50 border border-neutral-200/90 rounded-2xl p-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
            <div>
              <div className="text-sm font-bold text-neutral-900">
                Upgrade to {selectedPlan.name} • ₹{selectedPlan.monthlyPrice ?? selectedPlan.monthlyPriceInr}/month
              </div>
              <p className="text-xs text-neutral-500">
                Complete your transfer via any UPI app (GPay, PhonePe, Paytm, BHIM) and submit your reference number below.
              </p>
            </div>
            <button
              onClick={() => setSelectedPlan(null)}
              className="text-xs text-neutral-400 hover:text-neutral-700"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
            {/* Payment Details & QR Representation */}
            <div className="space-y-4">
              <div className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-4">
                {/* SVG Visual QR Code */}
                <div className="w-24 h-24 bg-neutral-900 rounded-lg flex flex-col items-center justify-center p-2 text-white shrink-0">
                  <QrCode className="w-16 h-16" />
                  <span className="text-[9px] font-mono tracking-tighter">SCAN & PAY</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="text-neutral-400 text-[11px] font-medium">Merchant UPI VPA</div>
                  <div className="flex items-center gap-2 font-mono font-semibold text-neutral-900 bg-neutral-100 px-2.5 py-1 rounded-lg">
                    <span>{recipientUpiId}</span>
                    <button
                      onClick={handleCopyUpi}
                      className="text-neutral-500 hover:text-neutral-900 p-0.5"
                    >
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-neutral-500 text-[11px]">
                    Pay exact amount: <strong className="text-neutral-900 font-bold">₹{selectedPlan.monthlyPriceInr}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  After payment, enter the 12-digit UTR or UPI Transaction Reference Number. Once verified, your storage capacity increases to <strong>{formatBytes(selectedPlan.quotaBytes)}</strong> immediately.
                </p>
              </div>
            </div>

            {/* Submission Form */}
            <form onSubmit={handleSubmitPayment} className="space-y-3.5 bg-white border border-neutral-200 rounded-xl p-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  12-Digit UPI Reference Number (UTR) *
                </label>
                <input
                  type="text"
                  required
                  value={upiRefId}
                  onChange={(e) => setUpiRefId(e.target.value)}
                  placeholder="e.g., 426819402911"
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Your UPI ID (Optional - for faster verification)
                </label>
                <input
                  type="text"
                  value={userVpa}
                  onChange={(e) => setUserVpa(e.target.value)}
                  placeholder="e.g., user@okaxis"
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !upiRefId.trim()}
                className="w-full py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>{submitting ? 'Submitting...' : 'Submit Payment Verification'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Payment Submissions History */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="font-semibold text-xs text-neutral-900">Your UPI Payment Submissions</div>
          <button
            onClick={loadData}
            className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md"
            title="Refresh history"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {payments.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400">
            No payments submitted yet. Select a plan above to initiate an upgrade.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 text-xs">
            {payments.map((p) => (
              <div key={p.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-neutral-900">{p.planName}</div>
                  <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                    UTR: {p.referenceId || p.upiReferenceId} • ₹{p.amount || p.amountInr}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    Submitted on {new Date(p.submittedAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      p.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : p.status === 'under_review'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    {p.status === 'under_review' ? 'Under Review' : p.status}
                  </span>

                  {/* Demo Verification Trigger for testing */}
                  {p.status === 'under_review' && (
                    <button
                      onClick={() => handleDemoApprove(p.id)}
                      className="px-2.5 py-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                      title="Simulates instant verification to test quota upgrade"
                    >
                      Instant Verify (Demo)
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
