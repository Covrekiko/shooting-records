import { useState } from 'react';

export default function PowderStockCalculator({ component }) {
  const [stockInput, setStockInput] = useState('');
  const [stockUnit, setStockUnit] = useState('kg');
  const [chargePerRound, setChargePerRound] = useState('');
  const [result, setResult] = useState(null);

  // Conversion factors to grains (base unit for calculation)
  const toGrains = {
    'grains': 1,
    'grams': 15.4323584,
    'kg': 15432.3584,
    'oz': 437.5,
    'lb': 7000,
  };

  const calculateRemaining = () => {
    if (!stockInput || !chargePerRound) {
      setResult(null);
      return;
    }

    try {
      const stockInGrains = parseFloat(stockInput) * toGrains[stockUnit];
      const chargeGrains = parseFloat(chargePerRound);
      
      if (chargeGrains <= 0 || stockInGrains <= 0) {
        setResult(null);
        return;
      }

      const estimatedLoads = Math.floor(stockInGrains / chargeGrains);
      const remainingGrains = stockInGrains % chargeGrains;
      
      // Convert remaining back to original unit for display
      const remainingInOriginalUnit = stockInGrains / toGrains[stockUnit];

      setResult({
        totalStockGrains: stockInGrains,
        estimatedLoads,
        remainingGrains,
        remainingDisplay: remainingInOriginalUnit.toFixed(2),
        originalUnit: stockUnit,
      });
    } catch (error) {
      console.error('Calculation error:', error);
      setResult(null);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <h4 className="font-bold text-sm">Powder Stock Calculator</h4>
      
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Current Stock</label>
          <input
            type="number"
            value={stockInput}
            onChange={(e) => {
              setStockInput(e.target.value);
              if (chargePerRound) calculateRemaining();
            }}
            placeholder="Enter amount"
            step="0.01"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Unit</label>
          <select
            value={stockUnit}
            onChange={(e) => {
              setStockUnit(e.target.value);
              if (stockInput && chargePerRound) calculateRemaining();
            }}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
          >
            <option value="kg">kg</option>
            <option value="grams">g</option>
            <option value="oz">oz</option>
            <option value="lb">lb</option>
            <option value="grains">gr</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Charge per Round (grains)</label>
        <input
          type="number"
          value={chargePerRound}
          onChange={(e) => {
            setChargePerRound(e.target.value);
            if (stockInput) calculateRemaining();
          }}
          placeholder="e.g., 40"
          step="0.1"
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
        />
      </div>

      {result && (
        <div className="bg-secondary/30 rounded-lg p-3 space-y-2 border border-border">
          <div className="text-sm">
            <p className="text-muted-foreground">Estimated Loads Possible</p>
            <p className="text-2xl font-bold text-primary">{result.estimatedLoads}</p>
          </div>
          <div className="border-t border-border pt-2 text-xs">
            <p className="text-muted-foreground">Remaining Stock</p>
            <p className="font-semibold">{result.remainingDisplay} {result.originalUnit} ({result.remainingGrains.toFixed(1)}gr)</p>
          </div>
        </div>
      )}
    </div>
  );
}