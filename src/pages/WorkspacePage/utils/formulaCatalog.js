/**
 * formulaCatalog — categorized inventory of supported table formulas.
 *
 * Reads SUPPORTED_FORMULAS live from hot-formula-parser so the helper panel
 * always reflects what the engine actually understands — categories curate
 * the common ones; anything uncategorized falls into "More functions".
 * Lookup-style classics (VLOOKUP/HLOOKUP/INDEX/XLOOKUP) are NOT supported by
 * this engine and intentionally absent.
 */
import { SUPPORTED_FORMULAS } from 'hot-formula-parser';

export const FORMULA_CATEGORIES = [
  {
    name: 'Math & aggregation',
    fns: [
      'SUM', 'SUMIF', 'SUMIFS', 'SUMPRODUCT', 'SUMSQ', 'PRODUCT',
      'AVERAGE', 'AVERAGEA', 'AVERAGEIF', 'AVERAGEIFS',
      'MIN', 'MINA', 'MAX', 'MAXA', 'MEDIAN',
      'COUNT', 'COUNTA', 'COUNTBLANK', 'COUNTIF', 'COUNTIFS', 'COUNTUNIQUE',
      'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'TRUNC', 'INT', 'MROUND',
      'MOD', 'ABS', 'POWER', 'SQRT', 'SQRTPI', 'QUOTIENT',
      'SUBTOTAL', 'AGGREGATE', 'LARGE', 'SMALL',
      'RANK.EQ', 'RANK.AVG', 'EVEN', 'ODD', 'SIGN', 'CEILING', 'FLOOR',
      'ADD', 'MINUS', 'MULTIPLY', 'DIVIDE', 'RAND', 'RANDBETWEEN', 'PI', 'EXP', 'LN', 'LOG', 'LOG10'
    ]
  },
  {
    name: 'Logic & comparison',
    fns: [
      'IF', 'AND', 'OR', 'NOT', 'XOR', 'SWITCH', 'CHOOSE',
      'TRUE', 'FALSE', 'EQ', 'NE', 'GT', 'GTE', 'LT', 'LTE',
      'ISBLANK', 'ISNUMBER', 'ISTEXT', 'ISNONTEXT', 'ISLOGICAL', 'ISEVEN', 'ISODD', 'ISBINARY', 'DELTA', 'GESTEP'
    ]
  },
  {
    name: 'Text',
    fns: [
      'CONCATENATE', 'JOIN', 'LEFT', 'RIGHT', 'MID', 'LEN',
      'UPPER', 'LOWER', 'PROPER', 'TRIM', 'CLEAN',
      'FIND', 'SEARCH', 'REPLACE', 'SUBSTITUTE', 'REPT', 'EXACT', 'T',
      'REGEXMATCH', 'REGEXEXTRACT', 'REGEXREPLACE', 'HTML2TEXT',
      'CHAR', 'UNICHAR', 'CODE', 'UNICODE', 'ROMAN', 'ARABIC'
    ]
  },
  {
    name: 'Date & time',
    fns: [
      'TODAY', 'NOW', 'DATE', 'TIME', 'DATEVALUE', 'TIMEVALUE',
      'DAY', 'MONTH', 'YEAR', 'HOUR', 'MINUTE', 'SECOND',
      'WEEKDAY', 'WEEKNUM', 'ISOWEEKNUM', 'DAYS', 'DAYS360', 'DATEDIF',
      'EDATE', 'EOMONTH', 'NETWORKDAYS', 'WORKDAY', 'YEARFRAC'
    ]
  },
  {
    name: 'Financial',
    fns: [
      'PMT', 'PPMT', 'IPMT', 'PV', 'FV', 'FVSCHEDULE', 'RATE', 'NPER', 'RRI',
      'NPV', 'XNPV', 'IRR', 'XIRR', 'MIRR',
      'SLN', 'SYD', 'DB', 'DDB', 'CUMIPMT', 'CUMPRINC',
      'EFFECT', 'NOMINAL', 'PDURATION', 'DOLLARDE', 'DOLLARFR',
      'TBILLEQ', 'TBILLPRICE', 'TBILLYIELD'
    ]
  },
  {
    name: 'Statistics',
    fns: [
      'STDEV.S', 'STDEV.P', 'STDEVA', 'STDEVPA', 'STDEVP', 'STDEVS',
      'VAR.S', 'VAR.P', 'VARA', 'VARPA', 'VARP', 'VARS',
      'CORREL', 'PEARSON', 'RSQ', 'COVARIANCE.P', 'COVARIANCE.S',
      'FORECAST', 'TREND', 'LINEST', 'LOGEST', 'GROWTH', 'SLOPE', 'INTERCEPT', 'STEYX',
      'MODE.SNGL', 'MODE.MULT', 'MODESNGL', 'MODEMULT',
      'PERCENTILE.INC', 'PERCENTILE.EXC', 'QUARTILE.INC', 'QUARTILE.EXC',
      'PERCENTRANK.INC', 'PERCENTRANK.EXC', 'STANDARDIZE', 'Z.TEST',
      'NORM.DIST', 'NORM.INV', 'NORM.S.DIST', 'NORM.S.INV', 'LOGNORM.DIST', 'LOGNORM.INV',
      'BINOM.DIST', 'POISSON.DIST', 'EXPON.DIST', 'SKEW', 'KURT', 'GEOMEAN', 'HARMEAN', 'AVEDEV', 'DEVSQ', 'TRIMMEAN', 'FREQUENCY', 'PROB'
    ]
  },
  {
    name: 'Array & reference',
    fns: [
      'ROW', 'ROWS', 'COLUMN', 'COLUMNS', 'MATCH', 'TRANSPOSE',
      'UNIQUE', 'FLATTEN', 'NUMBERS', 'INTERVAL', 'ARGS2ARRAY', 'REFERENCE'
    ]
  }
];

// The parser's list contains a few duplicate names (CHOOSE, ISODD, SPLIT) —
// dedupe once so UI keys and counts stay clean.
const supportedNames = [...new Set(SUPPORTED_FORMULAS.map(String))];
const supported = new Set(supportedNames);

// Drop any curated name the engine doesn't actually support (never lie to
// the user), then bucket whatever remains into "More functions".
const categorized = new Set(FORMULA_CATEGORIES.flatMap(cat => cat.fns));
const more = supportedNames
  .filter(fn => !categorized.has(fn))
  .sort();

export const CATEGORIES = [
  ...FORMULA_CATEGORIES
    .map(cat => ({ name: cat.name, fns: cat.fns.filter(fn => supported.has(fn)) }))
    .filter(cat => cat.fns.length),
  ...(more.length ? [{ name: 'More functions', fns: more }] : [])
];

export const ALL_FUNCTIONS = supportedNames;

/** Case-insensitive search across the whole catalog → [{name, category}] */
export const searchFunctions = (query) => {
  const q = String(query || '').trim().toUpperCase();
  if (!q) return [];
  const out = [];
  for (const cat of CATEGORIES) {
    for (const fn of cat.fns) {
      if (fn.includes(q)) out.push({ name: fn, category: cat.name });
    }
  }
  return out;
};
