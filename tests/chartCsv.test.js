import { describe, it, expect } from 'vitest';
import { parseCsvText, parseNumberCell, csvToChartPoints } from '../src/pages/WorkspacePage/utils/chartCsv';

describe('parseNumberCell', () => {
  it('reads real-world numbers', () => {
    expect(parseNumberCell('₹1,20,000.50')).toBe(120000.5);
    expect(parseNumberCell('$1,234')).toBe(1234);
    expect(parseNumberCell('(450)')).toBe(-450);
    expect(parseNumberCell('12%')).toBe(12);
    expect(parseNumberCell('1.234,56')).toBe(1234.56);
    expect(parseNumberCell('-7.5')).toBe(-7.5);
    expect(parseNumberCell('7-')).toBe(-7);
    expect(parseNumberCell('0')).toBe(0);
  });
  it('never turns text into a number', () => {
    expect(parseNumberCell('abc')).toBeNull();
    expect(parseNumberCell('')).toBeNull();
    expect(parseNumberCell('N/A')).toBeNull();
    expect(parseNumberCell('1.2.3')).toBeNull();
  });
});

describe('parseCsvText', () => {
  it('handles quotes, commas inside cells, CRLF and BOM', () => {
    const rows = parseCsvText('﻿Name,Amount\r\n"Tiles, 600x600","1,200"\r\n"He said ""hi""",5\r\n');
    expect(rows).toEqual([['Name', 'Amount'], ['Tiles, 600x600', '1,200'], ['He said "hi"', '5']]);
  });
  it('detects semicolon and tab delimiters', () => {
    expect(parseCsvText('a;b\n1;2')).toEqual([['a', 'b'], ['1', '2']]);
    expect(parseCsvText('a\tb\n1\t2')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('csvToChartPoints', () => {
  it('reads label and value, skipping and reporting bad rows instead of zeroing them', () => {
    const r = csvToChartPoints('Item,Cost\nTiles,"1,200"\nPaint,N/A\nCement,300\n');
    expect(r.points).toEqual([{ label: 'Tiles', value: 1200 }, { label: 'Cement', value: 300 }]);
    expect(r.skipped).toEqual([{ row: 3, reason: '"N/A" is not a number' }]);
  });
  it('finds the value column when an id column comes first', () => {
    const r = csvToChartPoints('id,name,amount\n1,Tiles,500\n2,Paint,250');
    expect(r.labelColumn).toBe(1);
    expect(r.valueColumn).toBe(2);
    expect(r.points.map((p) => p.value)).toEqual([500, 250]);
  });
  it('works with no header row', () => {
    const r = csvToChartPoints('Jan,10\nFeb,20');
    expect(r.points).toEqual([{ label: 'Jan', value: 10 }, { label: 'Feb', value: 20 }]);
  });
  it('reads X values for scatter plots', () => {
    const r = csvToChartPoints('Point,Y,X\nA,5,1\nB,7,2', { scatter: true });
    expect(r.points).toEqual([{ label: 'A', value: 5, x: 1 }, { label: 'B', value: 7, x: 2 }]);
  });
  it('explains an unusable file', () => {
    expect(csvToChartPoints('').error).toMatch(/empty/);
    expect(csvToChartPoints('name,city\nA,Pune\nB,Delhi').error).toMatch(/numbers/);
  });
});
