import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface BookingCalendarProps {
  product: {
    id: string;
    rentalPricePerDay: number;
    price_configs?: any[];
  };
  onCalculate: (details: {
    startDate: string;
    endDate: string;
    rentalDays: number;
    pricePerDay: number;
    totalRentalFee: number;
    depositPercentage: number;
    depositAmount: number;
    isValid: boolean;
  }) => void;
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({ product, onCalculate }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (!startDate || !endDate) {
      onCalculate({
        startDate: '',
        endDate: '',
        rentalDays: 0,
        pricePerDay: 0,
        totalRentalFee: 0,
        depositPercentage: 0,
        depositAmount: 0,
        isValid: false,
      });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Set hours to zero for accurate comparison
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);

    const today = new Date();
    today.setHours(0,0,0,0);

    if (start < today) {
      setValidationError('Ngày nhận máy không thể ở quá khứ');
      return;
    }

    if (end < start) {
      setValidationError('Ngày trả máy phải sau hoặc bằng ngày nhận');
      return;
    }

    setValidationError('');

    // Calculate rental days (inclusive)
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const rentalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Look up matching price configs
    let pricePerDay = Number(product.rentalPricePerDay || 0);
    let depositPercentage = 100.00;

    const matchedConfig = (product.price_configs || []).find((c: any) => 
      rentalDays >= c.min_days && rentalDays <= c.max_days
    );

    if (matchedConfig) {
      pricePerDay = Number(matchedConfig.price_per_day);
      depositPercentage = Number(matchedConfig.deposit_percentage);
    }

    const totalRentalFee = pricePerDay * rentalDays;
    const depositAmount = (totalRentalFee * depositPercentage) / 100;

    onCalculate({
      startDate,
      endDate,
      rentalDays,
      pricePerDay,
      totalRentalFee,
      depositPercentage,
      depositAmount,
      isValid: true,
    });
  }, [startDate, endDate, product]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-warm-gray-700 mb-1">Ngày Nhận Máy</label>
          <div className="relative">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-vintage-sepia-200 bg-vintage-sepia-50 rounded-lg text-sm focus:outline-none focus:border-vintage-gold text-warm-gray-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-warm-gray-700 mb-1">Ngày Trả Máy</label>
          <div className="relative">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-vintage-sepia-200 bg-vintage-sepia-50 rounded-lg text-sm focus:outline-none focus:border-vintage-gold text-warm-gray-900"
            />
          </div>
        </div>
      </div>

      {validationError && (
        <div className="flex items-center gap-2 text-film-red bg-red-50 p-3 rounded-lg text-xs border border-film-red/20">
          <AlertCircle size={14} />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
};
