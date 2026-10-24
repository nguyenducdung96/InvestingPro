# Recorded port activity display

User-approved policy: investment dashboards show available recorded values rather than suppressing a whole month, quarter or cumulative period when a few days or weights are missing. This applies to PHP, DVP, VGR, VSC, GMD, HAH, DXP, PSP, CQN and CDN, at issuer and berth level and in regional overviews.

The default issuer metric is recorded DWT. Counts and DWT accumulate the observations available through the stated cutoff. Displayed growth uses the two recorded values and requires a positive prior baseline. Missing raw weights/days are not filled or extrapolated. Periods without observations remain unavailable. Quality metadata, strict full-coverage totals and the advanced strict view remain separate. CQN berth plans retain their distinct semantics and overlapping issuer scopes are never added into a regional total.

For multi-berth scopes, an incomplete daily group retains observed member contributions separately from the strict daily head. The new transient observed fields do not certify that group as complete. A missing daily DWT subtotal no longer suppresses weights from other recorded days in the period.

Northern issuer YTD continues through the labeled cutoff, including the current partial month. The existing CDN completed-month comparison footer retains finished paired months; its headline cumulative KPI continues through cutoff. Small coverage gaps remain in collapsed details rather than prominent missing-period messages. Northern overview values and sorting now use recorded DWT.

Validation: 130 unit/integration tests; affected issuer/berth, northern and central overview desktop/mobile checks, including all nine northern issuers with the last source day absent and a PHP group missing one berth on one day. Typecheck and lint passed. Root AGENTS.md records the policy for subsequent work.
