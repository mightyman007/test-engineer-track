+++
id = "istqb-m4-equivalence-partitioning"
module = "istqb-m4-blackbox"
title = "Equivalence Partitioning"
minutes = 14
objectives = ["FL-4.2.1"]
videos = [
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 30 | Equivalence Partition | Black Box Test Techniques | CTFL (TM Square)", url = "https://www.youtube.com/watch?v=vT94bZw8eXA" },
  { title = "ISTQB Foundation Level: 4.2.1 Equivalence Partitioning (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=D-Qv0ccFR84" },
]
diagrams = [
  { title = "An input domain sliced into valid and invalid partitions, with one test value each", file = "diagrams/ep-partitions.svg" },
]
+++

## Dividing the world into partitions (FL-4.2.1)

**[Equivalence partitioning](https://istqb-glossary.page/equivalence-partitioning/)** (EP) divides data into **[equivalence partitions](https://istqb-glossary.page/equivalence-partition/)** based on the expectation that **all the elements of a given partition are processed in the same way** by the [test object](https://istqb-glossary.page/test-object/). The theory behind the technique: if a test case that tests one value from a partition detects a defect, then a test case testing *any other* value from that same partition should detect the same defect. From that follows the technique's famous economy rule — **one test for each partition is sufficient**.

Why does this work? Because testing 1,000 values from the same partition would mostly be re-running the same experiment. The partition is a hypothesis about *sameness of processing*; one representative per hypothesis is enough to test the hypothesis.

Partitions can be identified for **any data element related to the test object** — not just typed-in fields:

- inputs and **outputs** (yes, you can partition the outputs too),
- configuration items, internal values, **time-related values** (a monthly report generated on the 1st vs the 28th), and
- [interface parameters](https://en.wikipedia.org/wiki/Interface_(computing)).

The partitions may be **continuous or discrete, ordered or unordered, finite or infinite** — but they come with two hard rules: partitions **must not overlap**, and they **must be non-empty** (a partition nobody can enter is not a partition).

## Valid and invalid partitions

A partition containing **valid** values is called a *valid partition*; a partition containing **invalid** values is an *invalid partition*. The syllabus is refreshingly honest that **definitions of valid and invalid may vary among teams and organizations** — for example, valid values may be interpreted as those that should be *processed* by the test object, or as those for which the specification *defines their processing*; invalid values may be those that should be *ignored or rejected*, or those for which *no processing is defined*.

For the exam, what matters is the habit: **for every input, think about both sides** — the values the system should accept *and* the families of values it should refuse. A classic beginner's mistake is partitioning only the happy path. An age field specified as "whole years, 18 to 65" has *three* partitions, not one:

- invalid: below 18 (e.g. 5),
- valid: 18 through 65,
- invalid: above 65 (e.g. 90).

And watch for *implicit* invalid families — non-numeric text, empty input, absurd magnitudes — whenever the specification implies them.

## Measuring EP coverage

In EP, the **coverage items are the equivalence partitions themselves**. To achieve **100% EP coverage**, test cases must exercise **all identified partitions — including the invalid ones** — each partition covered at least once. Coverage is measured as:

> **EP coverage = (partitions exercised by at least one test case ÷ total partitions identified) × 100%**

Notice the trap hiding in that formula: exercising every *valid* partition is **not** 100% coverage if an invalid partition was never touched. Invalid values are where the rejection logic lives — and rejection logic is exactly what developers get wrong.

![An input domain sliced into valid and invalid partitions, with one test value each](diagrams/ep-partitions.svg)

## More than one input: Each Choice coverage

Most real test items have **multiple sets of partitions** — one set per input parameter. A single test case then covers partitions from *several* sets at once (a test with age 30 *and* country "US" covers one partition from each set). The simplest coverage criterion for this situation is **Each Choice coverage**: test cases must exercise **each partition from each set of partitions at least once**.

The key property for the exam: **Each Choice coverage does not take into account combinations of partitions.** If set A has 4 partitions and set B has 3, you do *not* need 4 × 3 = 12 tests — you need at least 4 tests, each pairing one partition from A with one from B, arranged so that every partition on both sides gets its turn. (Pairing partitions deliberately to test *specific combinations* is a different, stronger idea — that is decision table territory, coming up in lesson 4.)

## Worked examples (FL-4.2.1)

**Age field.** Specification: "age in whole years, 18–65; anything else rejected." Partitions: `below 18` (invalid), `18–65` (valid), `above 65` (invalid) → 3 partitions, 3 test values (say 5, 30, 90), 100% coverage with 3 tests.

**Discount tiers.** A web shop gives 0% under $50, 5% from $50, 10% from $100, 15% from $200. Partitioning the *discount rate* (an output!): `0%`, `5%`, `10%`, `15%` — four partitions, one order per tier, done.

**Form field with two inputs.** A signup form takes a username (valid: 3–20 characters) and a password (valid: 8+ characters). Username partitions: `too short`, `valid` — plus implicit families such as `empty`; password partitions: `too short`, `valid`. Each Choice coverage needs every partition of each set exercised at least once — combining them in shared test cases rather than multiplying them.

## In plain terms

- EP slices the data of a test object into partitions whose elements are expected to be **processed identically**; **one test per partition is sufficient**.
- Partition any data element — inputs, outputs, configuration, internal values, time-related values, interface parameters; partitions must not overlap and must be non-empty; they can be continuous/discrete, ordered/unordered, finite/infinite.
- **Valid vs invalid** partitions both count; 100% EP coverage means **every** identified partition (invalid ones included) is exercised at least once; coverage = partitions exercised ÷ partitions identified.
- With several inputs, **Each Choice coverage** requires each partition of each set at least once — deliberately **without** testing combinations.

## Check yourself

1. Why is one test per partition "sufficient" — what assumption makes that reasonable?
2. An input accepts dates in 2026 only. Name the valid partition and two invalid partitions.
3. A date input was partitioned into 5 equivalence partitions. The suite exercises 4 of them. What is the EP coverage — and which kind of missed partition hurts the most?
4. Two sets of partitions have 5 and 4 partitions respectively. What is the minimum number of tests for Each Choice coverage — and what coverage criterion would you need if you wanted to test *combinations*?
