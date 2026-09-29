'use client';

import React from 'react';
import { LogicalQuota } from '@/types';
import { formatBytes } from '@/lib/formatters';
import { HardDrive, AlertCircle, RefreshCw } from 'lucide-react';

interface QuotaMeterProps {
  quota: LogicalQuota | null;
  compact?: boolean;
  onRefresh?: () => void;
}

export const QuotaMeter: React.FC<QuotaMeterProps> = ({ quota, compact = false, onRefresh }) => {
  if (!quota) {
    return (
      <div className="animate-pulse bg-neutral-100 rounded-lg p-3 text-xs text-neutral-400">
        Loading quota metrics...
      </div>
    );
  }

  const usedPercent = Math.min(100, Math.round((quota.usedBytes / quota.quotaBytes) * 100));
  const reservedPercent = Math.min(100 - usedPercent, Math.round((quota.reservedBytes / quota.quotaBytes) * 100));
  const isNearLimit = usedPercent > 85;

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-neutral-50 border border-neutral-200/80 rounded-lg px-3 py-1.5 text-xs text-neutral-700">
        <HardDrive className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
        <div className="flex flex-col min-w-[120px]">
          <div className="flex justify-between font-medium text-[11px] text-neutral-600 mb-1">
            <span>{formatBytes(quota.usedBytes)} of {formatBytes(quota.quotaBytes)}</span>
            <span className={isNearLimit ? 'text-amber-600 font-semibold' : 'text-neutral-500'}>
              {usedPercent}%
            </span>
          </div>
          <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden flex">
            <div
              className={`h-full transition-all duration-300 ${isNearLimit ? 'bg-amber-500' : 'bg-neutral-800'}`}
              style={{ width: `${usedPercent}%` }}
            />
            {quota.reservedBytes > 0 && (
              <div
                className="h-full bg-indigo-400 animate-pulse"
                style={{ width: `${Math.max(2, reservedPercent)}%` }}
                title={`Reserved: ${formatBytes(quota.reservedBytes)}`}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200/90 rounded-xl p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-neutral-500">Logical Storage Quota</div>
            <div className="text-sm font-semibold text-neutral-900">{quota.planName}</div>
          </div>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh quota accounting"
            className="text-neutral-400 hover:text-neutral-700 p-1 rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Progress Bar with Split Segments */}
      <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden flex mb-2 border border-neutral-200/50">
        <div
          className={`h-full transition-all duration-300 ${isNearLimit ? 'bg-amber-500' : 'bg-neutral-800'}`}
          style={{ width: `${usedPercent}%` }}
          title={`Used: ${formatBytes(quota.usedBytes)} (${usedPercent}%)`}
        />
        {quota.reservedBytes > 0 && (
          <div
            className="h-full bg-indigo-500 animate-pulse"
            style={{ width: `${Math.max(2, reservedPercent)}%` }}
            title={`Reserved: ${formatBytes(quota.reservedBytes)} (${reservedPercent}%)`}
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-neutral-100">
        <div>
          <div className="text-[11px] text-neutral-500">Used</div>
          <div className="font-semibold text-neutral-800">{formatBytes(quota.usedBytes)}</div>
        </div>
        <div>
          <div className="text-[11px] text-neutral-500">Reserved</div>
          <div className="font-semibold text-indigo-600">
            {quota.reservedBytes > 0 ? formatBytes(quota.reservedBytes) : '0 B'}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-neutral-500">Available</div>
          <div className="font-semibold text-emerald-700">{formatBytes(quota.availableBytes)}</div>
        </div>
      </div>

      {isNearLimit && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>Storage quota is above 85%. Consider upgrading your plan.</span>
        </div>
      )}
    </div>
  );
};
