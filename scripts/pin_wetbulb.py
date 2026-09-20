#!/usr/bin/env python3
"""Pin the Stull (2011) wet-bulb closed form — the values asserted in wbgt.test.ts.

Kept as a script rather than a magic number in the test so the pin is reproducible by anyone
reading the repo: run this, compare stdout with the pinned table in src/lib/wbgt.test.ts.
"""
import math


def stull(dry_bulb_c: float, rh_percent: float) -> float:
    """Psychrometric wet-bulb temperature, Stull (2011), J. Appl. Meteor. Climatol. 50:2267-2269."""
    rh = min(max(rh_percent, 1.0), 100.0)
    t = dry_bulb_c
    return (
        t * math.atan(0.151977 * math.sqrt(rh + 8.313659))
        + math.atan(t + rh)
        - math.atan(rh - 1.676331)
        + 0.00391838 * rh**1.5 * math.atan(0.023101 * rh)
        - 4.686035
    )


PINS = [(20, 50), (30, 50), (35, 60), (42, 50), (25, 80), (38, 25), (15, 95)]

if __name__ == "__main__":
    print("Stull (2011) wet-bulb pinned values (mirror in src/lib/wbgt.test.ts):")
    for t, rh in PINS:
        print(f"  [{t}, {rh}, {stull(t, rh):.4f}]")
    print("\nsaturation check (RH=100, wet bulb should equal dry bulb):")
    for t in (5, 15, 25, 35, 42):
        print(f"  T={t}: deviation {abs(stull(t, 100) - t):.3f} C")
