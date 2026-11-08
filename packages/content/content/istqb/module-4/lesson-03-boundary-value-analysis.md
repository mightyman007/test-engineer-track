+++
id = "istqb-m4-boundary-values"
module = "istqb-m4-blackbox"
title = "Boundary Value Analysis"
minutes = 14
objectives = ["FL-4.2.2"]
videos = [
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 31 | Boundary Value Analysis | Test Techniques | ISTQB Tutorials (TM Square)", url = "https://www.youtube.com/watch?v=XW4sI3JJSzg" },
  { title = "ISTQB Foundation Level: 4.2.2 Boundary Value Analysis (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=Xpv9FDsLlgY" },
]
diagrams = [
  { title = "Fence posts at the boundary: 2-value versus 3-value coverage items", file = "diagrams/bva-edges.svg" },
]
+++

## Why boundaries break software (FL-4.2.2)

Decades of defect data point at one family of hiding places: **edges**. A developer writing `<` where they meant `<=`, a loop that runs one time too many, an off-by-one in a range check — these are among the most common defects in software. **[Boundary value analysis](https://istqb-glossary.page/boundary-value-analysis/)** (BVA) is [equivalence partitioning](https://istqb-glossary.page/equivalence-partitioning/)'s sharpened sibling: instead of picking *any* value from each [equivalence partition](https://istqb-glossary.page/equivalence-partition/), it picks the values **at and around the partition edges**, because developers are more likely to make errors with those boundary values.

The syllabus names the two defect shapes BVA is hunting: boundaries **misplaced** to positions above or below their intended positions, and boundaries **omitted altogether**.

One restriction matters before anything else: **BVA can only be used for ordered partitions** — partitions whose elements have an order (numbers, dates, sizes). "Ordered" is what makes a *boundary* meaningful; there is no "edge" of the set {red, green, blue}.

## Boundary values: the fence posts of a partition

The syllabus's definition is crisp: **the minimum and maximum values of a partition are its boundary values**. Think of each partition as a fence segment and the boundary values as its fence posts. One more rule completes the picture: **if two elements belong to the same partition, all elements between them must also belong to that partition** — partitions of ordered data are contiguous ranges, so every partition has well-defined posts.

Take the shipping rule "free shipping for orders of $75 or more, paid shipping below $75" with whole-dollar amounts:

- paid partition: $0 … $74 → boundary values **$74** (maximum)
- free partition: $75 … and up → boundary values **$75** (minimum)

The two partitions *share* an edge: $74 and $75 are the boundary pair at that edge.

## 2-value versus 3-value BVA

The syllabus defines **two versions of BVA**, which differ in how many **coverage items** each boundary value produces:

- **2-value BVA**: for each boundary value there are **two coverage items** — this boundary value and its **closest neighbor belonging to the adjacent partition**. For the shipping boundary: the items are **$74 and $75** (the neighbor of 74 across the edge is 75; the neighbor of 75 is 74). 100% 2-value coverage means exercising every identified boundary value (plus, as counted here, its adjacent neighbor).
- **3-value BVA**: for each boundary value there are **three coverage items** — this boundary value and **both its neighbors**. For the shipping boundary: 74 brings {73, 74, 75} and 75 brings {74, 75, 76}, so the coverage items are **73, 74, 75, 76**. Note that in 3-value BVA **some coverage items may not be boundary values themselves** ($73 and $76 are ordinary mid-partition values).

**3-value BVA is more rigorous than 2-value BVA** — it may detect defects that 2-value BVA overlooks. The syllabus's own illustration: if the decision `if (x ≤ 10)` is incorrectly implemented as `if (x = 10)`, no 2-value test data (x = 10, x = 11) can detect the defect — but **x = 9**, which comes from 3-value BVA, is likely to catch it. The extra "outside" neighbor gives the boundary a second independent probe.

![Fence posts at the boundary: 2-value versus 3-value coverage items](diagrams/bva-edges.svg)

## Coverage counting without double-counting

For both versions, coverage is measured as the number of coverage items exercised divided by the total number identified, expressed as a percentage. The practical K3 skill — and a classic exam trap — is **counting the items without double-counting**: when two boundary values sit at the same edge (74 and 75), their coverage items overlap, and you must count **distinct** values, not items-per-boundary summed blindly.

Worked count for the shipping rule, one boundary pair, whole dollars:

- **2-value BVA**: {74, 75} → **2 distinct test values**.
- **3-value BVA**: {73, 74, 75, 76} → **4 distinct test values**.

Now scale that intuition to a multi-tier rule and the arithmetic generalizes: each *shared edge* between two partitions contributes a boundary pair; 2-value BVA covers each pair with the two values forming it; 3-value BVA stretches one value further on each side.

## Worked example: the discount tiers (FL-4.2.2)

A discount calculator applies: **0% for purchases under $50; 5% for $50–$99; 10% for $100–$199; 15% for $200 and above** (whole-dollar amounts). The partitions share three edges, giving six boundary values: **49 and 50, 99 and 100, 199 and 200**.

- **2-value BVA**: the coverage items are each boundary value plus its closest neighbor in the adjacent partition — which here are already the boundary values themselves: {49, 50, 99, 100, 199, 200} → **6 distinct test values** for 100% 2-value coverage.
- **3-value BVA**: each boundary value needs both neighbors, stretching one value deeper into each partition: {48–51}, {98–101}, {198–201} → **12 distinct test values**.

Same specification, same partitions — only the *rigor* changed, and the test set grew from 6 to 12. That is the 2-vs-3 trade-off in one glance.

## In plain terms

- BVA exercises partition **edges** because developers err there — boundaries get misplaced above/below their intended positions or omitted entirely. It requires **ordered** partitions; boundary values are a partition's **minimum and maximum**.
- **2-value BVA**: per boundary value, 2 coverage items — the boundary value + its closest neighbor in the *adjacent* partition.
- **3-value BVA**: per boundary value, 3 coverage items — the boundary value + **both** neighbors; more rigorous, may catch defects 2-value misses (the `x ≤ 10` vs `x = 10` case).
- Count **distinct** values at shared edges — boundary values' coverage items overlap, and blind per-boundary sums double-count.

## Check yourself

1. Why does BVA require *ordered* partitions?
2. A partition runs from 1 to 100 and the adjacent partition above it runs from 101 to 200. Name the two boundary values at the shared edge, then give the 2-value and the 3-value coverage item sets for that edge.
3. For the discount tiers above, EP needs 4 test values (one per partition) while 2-value BVA needs 6. What extra assurance does the boundary pair buy over the partition representatives?
4. A developer implements "free shipping for orders over $75" (strictly greater). Which 2-value BVA test value fails, and why is the *other* boundary value not enough?
