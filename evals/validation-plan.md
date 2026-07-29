# Judge validation plan

The semantic judge is not trustworthy merely because its rubric sounds sensible. Before its score
is used in CI, a release decision, or a case-quality claim:

1. Build at least 50 scrubbed examples balanced across narration and letters, including clean
   outputs and single-fault adversarial variants.
2. Have two humans label each example independently using the same rubric; adjudicate disagreements
   and retain both raw labels.
3. Freeze a calibration split and a held-out test split before prompt tuning.
4. Measure per-violation precision and recall, not only an average score. Hard safety failures need
   high recall, while false accusations of failure need acceptable precision.
5. Tune only on the calibration split, then report the held-out confusion matrix and agreement with
   the adjudicated labels.
6. Re-run calibration when the model, prompt, evidence schema, or product policy changes.
7. Keep deterministic checks as the blocking gate. Use the semantic judge initially as a
   non-blocking report until its error profile is acceptable.

Suggested promotion threshold: no missed hard failures in the held-out set, at least 0.90 precision
for hard-failure flags, and documented human-judge disagreement. This is a thesis to validate, not
a current performance claim.
