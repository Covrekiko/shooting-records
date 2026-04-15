import { useState } from 'react';

export default function PowderStockCalculator({ component }) {
  const [stockInput, setStockInput] = useState('');
  const [stockUnit, setStockUnit] = useState('kg');
  const [chargePerRound, setChargePerRound] = useState('');
  const [result, setResult] = useState(null);

  // Convert any unit to grams (base unit)
  const toGrams = {
    'grams': 1,
    'kg': 1000,
    'oz': 28.3495,
    'lb': 453.592,
    'grains': 0.06479891,
  };

  const calculateRemaining = (stock, charge) => {
    // Validate inputs - both must be present and valid
    if (!stock || !charge || isNaN(stock) || isNaN(charge) || stock <= 0 || charge <= 0) {
      setResult(null);
      return;
    }

    // Convert stock to grams
    const stockInGrams = stock * toGrams[stockUnit];
    
    // Convert charge from grains to grams
    const chargeInGrams = charge * toGrams['grains'];
    
    // Calculate estimated loads
    const estimatedLoads = Math.floor(stockInGrams / chargeInGrams);
    const remainingGrams = stockInGrams % chargeInGrams;
    
    // Convert remaining back to original unit
    const remainingInOriginalUnit = remainingGrams / toGrams[stockUnit];

    setResult({
      estimatedLoads,
      chargeInGrams: chargeInGrams.toFixed(3),
      remainingGrams: remainingGrams.toFixed(2),
      remainingInOriginalUnit: remainingInOriginalUnit.toFixed(2),
      stockInGrams: stockInGrams.toFixed(2),
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <h4 className="font-bold text-sm">Powder Stock Calculator</h4>
      
      {/* Stock Input */}
      <div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Current Stock</label>
            <input
              type="number"
              value={stockInput}
              onChange={(e) => {
                const val = e.target.value;
                setStockInput(val);
                if (val && chargePerRound) calculateRemaining(parseFloat(val), parseFloat(chargePerRound));
                else setResult(null);
              }}
              placeholder="1"
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
                if (stockInput && chargePerRound) calculateRemaining(parseFloat(stockInput), parseFloat(chargePerRound));
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
      </div>

      {/* Charge Input */}
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Charge per Round</label>
        <input
          type="number"
          value={chargePerRound}
          onChange={(e) => {
            const val = e.target.value;
            setChargePerRound(val);
            if (stockInput && val) calculateRemaining(parseFloat(stockInput), parseFloat(val));
            else setResult(null);
          }}
          placeholder="40"
          step="0.1"
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
        />
        <p className="text-xs text-muted-foreground mt-0.5">in grains (gr)</p>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-secondary/30 rounded-lg p-3 space-y-3 border border-border">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Estimated Loads Possible</p>
            <p className="text-3xl font-bold text-primary">{result.estimatedLoads}</p>
          </div>
          
          <div className="border-t border-border pt-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Charge per Round:</span>
              <span className="font-semibold">{chargePerRound} gr = {result.chargeInGrams} g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Stock:</span>
              <span className="font-semibold">{stockInput} {stockUnit} = {result.stockInGrams} g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Remaining Stock:</span>
              <span className="font-semibold">{result.remainingInOriginalUnit} {stockUnit} ({result.remainingGrams} g)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}