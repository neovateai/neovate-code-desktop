import { expect, test } from 'vitest';
import { computeEnsuredWindowWidth } from './windowSizing';

test('uses min width when below max', () => {
  expect(
    computeEnsuredWindowWidth({
      currentWidth: 800,
      minWidth: 1000,
      maxWidth: 1200,
    }),
  ).toEqual({ target: 1000, appliedWidth: 1000 });
});

test('caps target at max width', () => {
  expect(
    computeEnsuredWindowWidth({
      currentWidth: 900,
      minWidth: 1400,
      maxWidth: 1200,
    }),
  ).toEqual({ target: 1200, appliedWidth: 1200 });
});

test('keeps current width when already larger', () => {
  expect(
    computeEnsuredWindowWidth({
      currentWidth: 1300,
      minWidth: 1000,
      maxWidth: 1200,
    }),
  ).toEqual({ target: 1000, appliedWidth: 1300 });
});
