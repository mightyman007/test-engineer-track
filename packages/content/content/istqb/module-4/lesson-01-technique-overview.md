+++
id = "istqb-m4-overview"
module = "istqb-m4-blackbox"
title = "Test Techniques Overview"
minutes = 10
objectives = ["FL-4.1.1"]
videos = [
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 29 | Test Techniques Overview | Test Design Techniques | CTFL (TM Square)", url = "https://www.youtube.com/watch?v=RKa7iYwBpOI" },
  { title = "ISTQB Foundation Level: 4.1 Test Techniques Overview (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=Z_oAdF_B7-8" },
]
diagrams = [
  { title = "Three families of test techniques, all fed by the test basis", file = "diagrams/technique-categories.svg" },
]
+++

## Test techniques: the systematic shortcut (FL-4.1.1)

Modules 1–3 gave you the *what* and *when* of testing. This chapter is about the *how*: [test techniques](https://istqb-glossary.page/test-technique/) — systematic ways of turning a [test basis](https://istqb-glossary.page/test-basis/) into tests. Without a technique, test design is guesswork and the set of tests you end up with is whatever occurred to you at the keyboard. A technique supports the tester in [test analysis](https://istqb-glossary.page/test-analysis/) (**what** to test) and [test design](https://istqb-glossary.page/test-design/) (**how** to test).

The payoff the syllabus promises is **a relatively small, but sufficient, set of [test cases](https://istqb-glossary.page/test-case/)**, derived in a systematic way. Exhaustive testing is impossible (you met that principle in module 1), so the real skill is choosing the *right* few tests. Techniques also help you define [test conditions](https://istqb-glossary.page/test-condition/), identify **[coverage items](https://istqb-glossary.page/coverage-item/)** — the things a technique counts, such as partitions, boundaries, table columns or states — and identify [test data](https://istqb-glossary.page/test-data/).

## Three families of techniques (FL-4.1.1)

The syllabus classifies all test techniques into three families, and being able to **distinguish** them is the learning objective of this section:

- **[Black-box test techniques](https://istqb-glossary.page/black-box-test-technique/)** (also called *specification-based* techniques) are based on an analysis of the **specified behavior** of the [test object](https://istqb-glossary.page/test-object/) **without reference to its internal structure**. The test cases are independent of how the software is implemented — so if the implementation changes but the required behavior stays the same, the test cases are **still useful**. This module teaches four of them: equivalence partitioning, boundary value analysis, decision table testing and state transition testing.
- **[White-box test techniques](https://istqb-glossary.page/white-box-test-technique/)** (also called *structure-based* techniques) are based on an analysis of the test object's **internal structure and processing**. Because the test cases depend on how the software is designed, they **can only be created after** the design or implementation exists. Module 5 covers the two Foundation-Level white-box techniques (statement and branch testing).
- **[Experience-based test techniques](https://istqb-glossary.page/experience-based-test-technique/)** use the **knowledge and experience of testers** to design and implement test cases. Their effectiveness depends heavily on the tester's skill. They can detect defects that the black-box and white-box families miss, which makes them **complementary** to those families — not a replacement for them.

![Three families of test techniques, all fed by the test basis](diagrams/technique-categories.svg)

A quick memory hook: **black-box looks at *what* the software should do, white-box looks at *how* it does it, experience-based looks at *where it has hurt before***.

## Coverage: measuring what you exercised (FL-4.1.1)

Every technique in this chapter comes with a way to measure how much of it you have done. **[Coverage](https://istqb-glossary.page/coverage/)** is the degree, expressed as a percentage, to which specified coverage items have been exercised by a test suite. Each technique defines its own coverage items — equivalence partitioning counts *partitions*, boundary value analysis counts *boundary values and their neighbors*, decision table testing counts *table columns*, state transition testing counts *states and transitions* (module 5 adds *statements and branches*).

The counting pattern is always the same:

> **coverage = (coverage items exercised ÷ total coverage items) × 100%**

That uniformity is why coverage is so useful in practice: it turns "did we test enough?" into an arithmetic question you can answer, track over time, and put in a report.

## Choosing a technique — and finishing with it

Which family should you use? The honest answer is **it depends on the context**: the risks attached to the test object, the test basis available (you cannot do white-box design before code exists), the time and budget at hand, and the skills of the team. High-risk areas justify more rigorous techniques (you will see that 3-value boundary analysis is *more rigorous* than 2-value); a thin or outdated specification pushes you toward experience-based work. Real test suites almost always **mix families**.

Coverage also connects to the [exit criteria](https://istqb-glossary.page/exit-criteria/) you met in module 1: a team can *define a specified coverage level in advance* — for example "100% equivalence partition coverage on the discount rules" — and treat reaching it as a measurable condition for stopping test design. Module 6 picks this thread up again in test monitoring and control.

## In plain terms

- Test techniques turn a test basis into a small-but-sufficient set of test cases, systematically — supporting test analysis (what to test) and test design (how to test).
- Three families: **black-box** (specified behavior, implementation-independent), **white-box** (internal structure, needs design/code first), **experience-based** (tester skill; complements the other two).
- Every technique defines its own coverage items; **coverage = items exercised ÷ items identified, as a percentage**.
- Technique choice depends on risk, available test basis, time and team; a specified coverage level can serve as a measurable exit criterion.

## Check yourself

1. A colleague says "we rewrote the payment module completely, so our old black-box tests are useless now." Is the colleague right?
2. Why can white-box test cases not be created before the design or implementation exists?
3. What is a *coverage item*, and why does each technique have its own kind?
4. A test plan states "exit criterion: 100% EP coverage of the registration form's partitions." Which two concepts from this lesson does that sentence combine?
