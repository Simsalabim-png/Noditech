# Milestone 1 implementation status

## Review authority

- Production baseline: `cb888c6a8cd943a2bdb8a252ebe8236d8743cc8e`
- Baseline artifact: `1ef3926dfc1257a9812fc591a237da5b79ef538900f96dd39287a249874f6c31`
- Independent pre-implementation verdict: `GO WITH REQUIRED CHANGES`
- Working branch: `fix/milestone1-correctness-20260630`
- No merge, deploy, release or tag is authorized.

## Implemented in the draft branch

1. Canonical Celsius state with Celsius/Fahrenheit display projection for active A/A, A/L and L/L temperature fields.
2. Canonical projection and Fahrenheit-valid input ranges for refrigerant suction, liquid-line and measured-discharge temperatures.
3. Fahrenheit-valid input ranges for A/L and L/L liquid temperatures.
4. Fixed Liquid/Liquid COP concepts:
   - cooling COP always equals `Q_cold / P_el`;
   - heating COP always equals `Q_hot / P_el`;
   - active-mode COP is retained only for the active summary/formula.
5. Air/Air blocked values use unavailable/null semantics instead of numeric zero.
6. Air/Air chart points consume the evaluated Air/Air result states and are withheld unless all required values are finite.
7. Air/Air blocked EER styling and bar width are finite-safe.
8. Air/Air Save is disabled by the existing evaluated result state.
9. Numeric golden vectors added for A/A and A/L.
10. Generated Air/Air and Air/Liquid component hashes are recalculated after the final deterministic transform.

## Still required before any release consideration

- GitHub-native Node/build/offline suite.
- Explicit browser unit round-trip tests for A/A, A/L, L/L and refrigerant fields.
- Explicit L/L Heating test proving cooling and heating COP cards remain distinct.
- Explicit initial/blocked A/A test proving zero console errors, no SVG NaN, unavailable result text and disabled save.
- Exact final artifact SHA and replacement A/A/A/L section hashes pinned after the implementation stabilizes.
- Independent review of the exact final branch head.
- New explicit production GO from Simen before any merge or deploy.
