import { TaxConfiguration, TaxObligation, Receipt, Payment } from '../types';

/**
 * Tax Authorities Database - Reference to major tax authorities by country
 */
export const TAX_AUTHORITIES = {
  MW: {
    code: 'MRA',
    name: 'Malawi Revenue Authority',
    country: 'Malawi',
    website: 'https://www.mra.mw',
    taxYearStart: '01-01'
  },
  ZA: {
    code: 'SARS',
    name: 'South African Revenue Service',
    country: 'South Africa',
    website: 'https://www.sars.gov.za',
    taxYearStart: '03-01'
  },
  KE: {
    code: 'KRA',
    name: 'Kenya Revenue Authority',
    country: 'Kenya',
    website: 'https://www.kra.go.ke',
    taxYearStart: '01-01'
  },
  ZM: {
    code: 'ZRA',
    name: 'Zambia Revenue Authority',
    country: 'Zambia',
    website: 'https://www.zra.org.zm',
    taxYearStart: '01-01'
  },
  UG: {
    code: 'URA',
    name: 'Uganda Revenue Authority',
    country: 'Uganda',
    website: 'https://www.ura.go.ug',
    taxYearStart: '07-01'
  },
  TZ: {
    code: 'TRA',
    name: 'Tanzania Revenue Authority',
    country: 'Tanzania',
    website: 'https://www.tra.go.tz',
    taxYearStart: '07-01'
  },
  GH: {
    code: 'GRA',
    name: 'Ghana Revenue Authority',
    country: 'Ghana',
    website: 'https://www.gra.gov.gh',
    taxYearStart: '01-01'
  },
  NG: {
    code: 'FIRS',
    name: 'Federal Inland Revenue Service',
    country: 'Nigeria',
    website: 'https://www.firs.gov.ng',
    taxYearStart: '01-01'
  },
  GB: {
    code: 'HMRC',
    name: 'Her Majesty\'s Revenue and Customs',
    country: 'United Kingdom',
    website: 'https://www.gov.uk/hmrc',
    taxYearStart: '04-06'
  },
  US: {
    code: 'IRS',
    name: 'Internal Revenue Service',
    country: 'United States',
    website: 'https://www.irs.gov',
    taxYearStart: '01-01'
  }
};

/**
 * Calculate total revenue from receipts for a period
 */
export function calculateTotalRevenue(
  receipts: Receipt[],
  startDate?: string,
  endDate?: string
): number {
  return receipts
    .filter(r => {
      if (!startDate || !endDate) return true;
      return r.date >= startDate && r.date <= endDate;
    })
    .reduce((sum, r) => sum + r.amount, 0);
}

/**
 * Calculate total expenses from payments for a period
 */
export function calculateTotalExpenses(
  payments: Payment[],
  startDate?: string,
  endDate?: string
): number {
  return payments
    .filter(p => {
      if (!startDate || !endDate) return true;
      return p.date >= startDate && p.date <= endDate && 
             (p.status === 'approved' || p.status === 'paid');
    })
    .reduce((sum, p) => sum + p.amount, 0);
}

/**
 * Calculate net profit (revenue - expenses)
 */
export function calculateNetProfit(revenue: number, expenses: number): number {
  return revenue - expenses;
}

/**
 * Calculate profit margin percentage
 */
export function calculateProfitMargin(profit: number, revenue: number): number {
  if (revenue === 0) return 0;
  return (profit / revenue) * 100;
}

/**
 * Calculate deductible expenses based on tax configuration
 */
export function calculateDeductibleExpenses(
  payments: Payment[],
  taxConfig: TaxConfiguration,
  startDate?: string,
  endDate?: string
): number {
  return payments
    .filter(p => {
      const dateMatch = !startDate || !endDate || 
                        (p.date >= startDate && p.date <= endDate);
      const isDeductible = taxConfig.deductibleExpensesCategories.includes(p.categoryId);
      const isApproved = p.status === 'approved' || p.status === 'paid';
      return dateMatch && isDeductible && isApproved;
    })
    .reduce((sum, p) => sum + p.amount, 0);
}

/**
 * Calculate non-deductible expenses
 */
export function calculateNonDeductibleExpenses(
  payments: Payment[],
  taxConfig: TaxConfiguration,
  startDate?: string,
  endDate?: string
): number {
  return payments
    .filter(p => {
      const dateMatch = !startDate || !endDate || 
                        (p.date >= startDate && p.date <= endDate);
      const isNonDeductible = taxConfig.nonDeductibleExpensesCategories.includes(p.categoryId);
      const isApproved = p.status === 'approved' || p.status === 'paid';
      return dateMatch && isNonDeductible && isApproved;
    })
    .reduce((sum, p) => sum + p.amount, 0);
}

/**
 * Calculate taxable income
 */
export function calculateTaxableIncome(
  revenue: number,
  deductibleExpenses: number,
  capitalAllowances: number = 0
): number {
  return Math.max(0, revenue - deductibleExpenses - capitalAllowances);
}

/**
 * Calculate estimated tax liability
 */
export function calculateTaxLiability(
  taxableIncome: number,
  taxRate: number
): number {
  return (taxableIncome * taxRate) / 100;
}

/**
 * Create tax obligation record
 */
export function createTaxObligation(
  orgId: string,
  taxPeriod: string,
  revenue: number,
  deductibleExpenses: number,
  nonDeductibleExpenses: number,
  taxRate: number,
  capitalAllowances: number = 0
): TaxObligation {
  const taxableAmountAfterDeductions = calculateTaxableIncome(
    revenue,
    deductibleExpenses,
    capitalAllowances
  );
  
  const estimatedTaxLiability = calculateTaxLiability(
    taxableAmountAfterDeductions,
    taxRate
  );

  // Default payment deadline - 30 days after period end
  const paymentDeadline = new Date(taxPeriod + '-01');
  paymentDeadline.setMonth(paymentDeadline.getMonth() + 1);
  paymentDeadline.setDate(paymentDeadline.getDate() + 30);

  return {
    id: `tax_${orgId}_${taxPeriod}_${Date.now()}`,
    orgId,
    taxPeriod,
    taxableIncome: revenue,
    deductibleExpenses,
    nonDeductibleExpenses,
    taxableAmountAfterDeductions,
    appliedTaxRate: taxRate,
    estimatedTaxLiability,
    paymentDeadline: paymentDeadline.toISOString().split('T')[0],
    status: 'pending',
    amountPaid: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Calculate quarterly tax obligations for a year
 */
export function calculateQuarterlyTaxObligations(
  orgId: string,
  year: number,
  receipts: Receipt[],
  payments: Payment[],
  taxConfig: TaxConfiguration
): TaxObligation[] {
  const obligations: TaxObligation[] = [];
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const startMonths = [1, 4, 7, 10];

  for (let i = 0; i < 4; i++) {
    const quarterStartDate = `${year}-${String(startMonths[i]).padStart(2, '0')}-01`;
    const quarterEndDate = `${year}-${String(startMonths[i] + 2).padStart(2, '0')}-28`;

    const revenue = calculateTotalRevenue(receipts, quarterStartDate, quarterEndDate);
    const expenses = calculateTotalExpenses(payments, quarterStartDate, quarterEndDate);
    const deductible = calculateDeductibleExpenses(payments, taxConfig, quarterStartDate, quarterEndDate);
    const nonDeductible = calculateNonDeductibleExpenses(payments, taxConfig, quarterStartDate, quarterEndDate);

    const obligation = createTaxObligation(
      orgId,
      `${year}-${quarters[i]}`,
      revenue,
      deductible,
      nonDeductible,
      taxConfig.taxRate
    );

    obligations.push(obligation);
  }

  return obligations;
}

/**
 * Calculate monthly tax obligations for a year
 */
export function calculateMonthlyTaxObligations(
  orgId: string,
  year: number,
  receipts: Receipt[],
  payments: Payment[],
  taxConfig: TaxConfiguration
): TaxObligation[] {
  const obligations: TaxObligation[] = [];

  for (let month = 1; month <= 12; month++) {
    const monthStr = String(month).padStart(2, '0');
    const monthStartDate = `${year}-${monthStr}-01`;
    
    // Calculate end date based on days in month
    const nextMonth = new Date(year, month, 1);
    const lastDay = new Date(nextMonth.getTime() - 1).getDate();
    const monthEndDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

    const revenue = calculateTotalRevenue(receipts, monthStartDate, monthEndDate);
    const deductible = calculateDeductibleExpenses(payments, taxConfig, monthStartDate, monthEndDate);
    const nonDeductible = calculateNonDeductibleExpenses(payments, taxConfig, monthStartDate, monthEndDate);

    const obligation = createTaxObligation(
      orgId,
      `${year}-${monthStr}`,
      revenue,
      deductible,
      nonDeductible,
      taxConfig.taxRate
    );

    obligations.push(obligation);
  }

  return obligations;
}

/**
 * Get tax authority for a country code
 */
export function getTaxAuthorityByCountry(countryCode: string): typeof TAX_AUTHORITIES[keyof typeof TAX_AUTHORITIES] | null {
  return TAX_AUTHORITIES[countryCode as keyof typeof TAX_AUTHORITIES] || null;
}

/**
 * Get available tax authorities
 */
export function getAvailableTaxAuthorities() {
  return Object.values(TAX_AUTHORITIES);
}
