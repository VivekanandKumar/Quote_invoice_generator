import React from 'react';
import { Plus, Trash2, Copy, ShoppingBag } from 'lucide-react';
import type { LineItem, TaxType } from '../types/invoice';
import { formatCurrency } from '../utils/defaultData';

interface LineItemsTableProps {
  items: LineItem[];
  showHsn: boolean;
  showTaxes: boolean;
  taxType?: TaxType;
  onChange: (items: LineItem[]) => void;
}

export const LineItemsTable: React.FC<LineItemsTableProps> = ({
  items,
  showHsn,
  showTaxes,
  taxType,
  onChange,
}) => {
  const isIntraState = Boolean(showTaxes && taxType === 'CGST_SGST');
  const isInterState = Boolean(showTaxes && taxType === 'IGST');
  const parseNumericQty = (val: string | number): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const match = String(val).replace(/,/g, '').match(/[-+]?[0-9]*\.?[0-9]+/);
    return match ? parseFloat(match[0]) : 0;
  };

  const updateItem = (id: string, updates: Partial<LineItem>) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        const newItem = { ...item, ...updates };
        // Recalculate amount using parsed numeric quantity (supports units like Sq.Ft.)
        const numQty = parseNumericQty(newItem.qty);
        const rate = Number(newItem.rate) || 0;
        newItem.amount = numQty * rate;

        // Recalculate CGST and IGST amounts if tax rates are set
        if (newItem.cgstRate) {
          newItem.cgstAmount = (newItem.amount * newItem.cgstRate) / 100;
        }
        if (newItem.igstRate) {
          newItem.igstAmount = (newItem.amount * newItem.igstRate) / 100;
        }

        return newItem;
      }
      return item;
    });
    onChange(updated);
  };

  const addItem = () => {
    const newItem: LineItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: '',
      description: '',
      hsnCode: '',
      qty: '1',
      rate: 0,
      amount: 0,
      cgstRate: 0,
      igstRate: 0,
    };
    onChange([...items, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) {
      onChange([
        {
          id: `item-${Date.now()}`,
          name: '',
          description: '',
          hsnCode: '',
          qty: '1',
          rate: 0,
          amount: 0,
        },
      ]);
      return;
    }
    onChange(items.filter((item) => item.id !== id));
  };

  const duplicateItem = (index: number) => {
    const itemToClone = items[index];
    const cloned: LineItem = {
      ...itemToClone,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    const nextItems = [...items];
    nextItems.splice(index + 1, 0, cloned);
    onChange(nextItems);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs min-w-0 w-full max-w-full">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <ShoppingBag className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-800">Line Items</h2>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Item
        </button>
      </div>

      {/* Mobile Card View (Visible on screens < md) */}
      <div className="md:hidden space-y-3.5 w-full min-w-0">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-200/90 space-y-3 shadow-2xs w-full min-w-0"
          >
            {/* Card Top: Index, Amount & Duplicate / Delete */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center">
                  {index + 1}
                </span>
                <span className="text-xs font-bold text-slate-900 font-mono">
                  ₹ {formatCurrency(item.amount)}
                </span>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => duplicateItem(index)}
                  title="Duplicate row"
                  className="p-1.5 text-slate-500 hover:text-slate-800 bg-white rounded-md border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  title="Delete row"
                  className="p-1.5 text-slate-500 hover:text-red-600 bg-white rounded-md border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Item Name */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Item Name</label>
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateItem(item.id, { name: e.target.value })}
                placeholder="Item name"
                className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Description (Optional)</label>
              <textarea
                value={item.description}
                onChange={(e) => updateItem(item.id, { description: e.target.value })}
                placeholder="Item description"
                rows={2}
                className="w-full text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y"
              />
            </div>

            {/* Qty & Rate Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Qty (with Unit)</label>
                <input
                  type="text"
                  value={item.qty}
                  onChange={(e) => updateItem(item.id, { qty: e.target.value })}
                  placeholder="1 or 10 Pcs"
                  className="w-full text-xs text-right font-medium text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Rate (₹)</label>
                <div className="relative rounded-lg">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400 font-medium text-xs">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={item.rate === 0 ? '' : item.rate}
                    onChange={(e) => updateItem(item.id, { rate: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full text-xs text-right font-medium text-slate-900 bg-white border border-slate-200 rounded-lg pl-6 pr-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Optional HSN/SAC */}
            {showHsn && (
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">HSN/SAC Code</label>
                <input
                  type="text"
                  value={item.hsnCode || ''}
                  onChange={(e) => updateItem(item.id, { hsnCode: e.target.value })}
                  placeholder="HSN/SAC Code"
                  className="w-full text-xs text-center font-mono text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            )}

            {/* Optional CGST and SGST for Intra-State */}
            {isIntraState && (
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-0.5">CGST (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="any"
                    value={item.cgstRate ?? ''}
                    onChange={(e) =>
                      updateItem(item.id, { cgstRate: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="w-full text-xs text-right font-medium text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-0.5">SGST (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="any"
                    value={item.sgstRate ?? ''}
                    onChange={(e) =>
                      updateItem(item.id, { sgstRate: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="w-full text-xs text-right font-medium text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Optional IGST for Inter-State */}
            {isInterState && (
              <div className="pt-1">
                <label className="block text-[10px] font-medium text-slate-500 mb-0.5">IGST (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={item.igstRate ?? ''}
                  onChange={(e) =>
                    updateItem(item.id, { igstRate: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0"
                  className="w-full text-xs text-right font-medium text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Spreadsheet Table (Hidden on mobile < md) */}
      <div className="hidden md:block overflow-x-auto w-full min-w-0">
        <table className="w-full text-left border-collapse min-w-[720px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3 min-w-[220px]">Item & Description</th>
              {showHsn && <th className="py-2.5 px-3 w-28 text-center">HSN/SAC</th>}
              <th className="py-2.5 px-3 w-32 text-right">Qty (with Unit)</th>
              <th className="py-2.5 px-3 w-28 text-right">Rate (₹)</th>
              {/* Tax columns depending on tax breakdown mode */}
              {isIntraState && (
                <>
                  <th className="py-2.5 px-3 w-22 text-right">CGST (%)</th>
                  <th className="py-2.5 px-3 w-22 text-right">SGST (%)</th>
                </>
              )}
              {isInterState && (
                <th className="py-2.5 px-3 w-24 text-right">IGST (%)</th>
              )}
              <th className="py-2.5 px-3 w-32 text-right">Amount (₹)</th>
              <th className="py-2.5 px-3 w-16 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, index) => (
              <tr key={item.id} className="hover:bg-slate-50/50 group transition-colors">
                {/* Index */}
                <td className="py-2.5 px-3 text-xs font-medium text-slate-400 text-center align-top pt-3.5">
                  {index + 1}
                </td>

                {/* Name & Description */}
                <td className="py-2.5 px-3 align-top">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(item.id, { name: e.target.value })}
                    placeholder="Item name"
                    className="w-full text-xs font-semibold text-slate-800 border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 mb-1"
                  />
                  <textarea
                    value={item.description}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                    placeholder="Description (optional)"
                    rows={1}
                    className="w-full text-xs text-slate-600 border border-slate-200 rounded-md px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y"
                  />
                </td>

                {/* Optional HSN/SAC */}
                {showHsn && (
                  <td className="py-2.5 px-3 align-top pt-2.5">
                    <input
                      type="text"
                      value={item.hsnCode || ''}
                      onChange={(e) => updateItem(item.id, { hsnCode: e.target.value })}
                      placeholder="HSN/SAC"
                      className="w-full text-xs text-center text-slate-700 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </td>
                )}

                {/* Qty (allows units like Sq.Ft.) */}
                <td className="py-2.5 px-3 align-top pt-2.5">
                  <input
                    type="text"
                    value={item.qty}
                    onChange={(e) => updateItem(item.id, { qty: e.target.value })}
                    placeholder="Qty / Units"
                    className="w-full text-xs text-right font-medium text-slate-800 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    title="Enter quantity with optional unit (e.g. 10 Pcs, 100, 50 Sq.Ft.)"
                  />
                </td>

                {/* Rate */}
                <td className="py-2.5 px-3 align-top pt-2.5">
                  <div className="relative rounded-md">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2 text-slate-400 font-medium text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.rate === 0 ? '' : item.rate}
                      onChange={(e) => updateItem(item.id, { rate: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="w-full text-xs text-right font-medium text-slate-800 border border-slate-200 rounded-md pl-5 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </td>

                {/* Optional CGST and SGST for Intra-State */}
                {isIntraState && (
                  <>
                    <td className="py-2.5 px-3 align-top pt-2.5">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        step="any"
                        value={item.cgstRate ?? ''}
                        onChange={(e) =>
                          updateItem(item.id, { cgstRate: parseFloat(e.target.value) || 0 })
                        }
                        placeholder="0"
                        className="w-full text-xs text-right text-slate-700 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                      />
                    </td>
                    <td className="py-2.5 px-3 align-top pt-2.5">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        step="any"
                        value={item.sgstRate ?? ''}
                        onChange={(e) =>
                          updateItem(item.id, { sgstRate: parseFloat(e.target.value) || 0 })
                        }
                        placeholder="0"
                        className="w-full text-xs text-right text-slate-700 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                      />
                    </td>
                  </>
                )}

                {/* Optional IGST for Inter-State */}
                {isInterState && (
                  <td className="py-2.5 px-3 align-top pt-2.5">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={item.igstRate ?? ''}
                      onChange={(e) =>
                        updateItem(item.id, { igstRate: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0"
                      className="w-full text-xs text-right text-slate-700 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                    />
                  </td>
                )}

                {/* Amount in Rupees */}
                <td className="py-2.5 px-3 text-xs font-bold text-slate-900 text-right align-top pt-3.5 font-mono whitespace-nowrap">
                  ₹ {formatCurrency(item.amount)}
                </td>

                {/* Actions */}
                <td className="py-2.5 px-3 text-center align-top pt-2.5">
                  <div className="flex items-center justify-center space-x-1">
                    <button
                      type="button"
                      onClick={() => duplicateItem(index)}
                      title="Duplicate row"
                      className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      title="Delete row"
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end">
        <p className="text-[11px] text-slate-400">
          Tip: You can specify units directly in Qty (e.g. <code>1240 Sq.Ft.</code>, <code>100 Pcs</code>). The amount will automatically compute based on the numeric value.
        </p>
      </div>
    </div>
  );
};
