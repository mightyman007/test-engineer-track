+++
id = "istqb-m2-test-types"
module = "istqb-m2-sdlc"
title = "Test Types: What Are You Looking For?"
minutes = 12
objectives = ["FL-2.2.2", "FL-2.2.3"]
videos = [
  { title = "ISTQB Foundation 4.0 — Tutorial 19: Test Types | White Box Testing | Black Box Testing (TM Square)", url = "https://www.youtube.com/watch?v=UJkhf5-iGxc" },
  { title = "ISTQB Foundation 4.0 — Tutorial 20: Retesting | Confirmation Testing | Regression Testing (TM Square)", url = "https://www.youtube.com/watch?v=w6CM_NA3uFM" },
]
diagrams = [
  { title = "Test types at every test level", file = "diagrams/test-types-matrix.svg" },
]
+++

## What a test type is (FL-2.2.2)

Where a **test level** answers "*where in the build-up are we testing?*", a **[test type](https://istqb-glossary.page/test-type/)** answers "*what are we looking for?*" Test types are groups of test activities related to specific **quality characteristics** — and the crucial exam fact is that **all four types can be applied at every test level**, although the focus differs from level to level.

## Functional testing — *what* the system does

**[Functional testing](https://istqb-glossary.page/functional-testing/)** evaluates the functions a component or system should perform — the "what". Its main objective is checking **functional completeness** (are all the promised functions there?), **functional correctness** (do they do the right thing?), and **functional appropriateness** (are they suited to the tasks?). A test that books a flight and checks the right itinerary appears is functional testing.

## Non-functional testing — *how well* it does it

**[Non-functional testing](https://istqb-glossary.page/non-functional-testing/)** evaluates attributes other than functional behaviour — how *well* the system behaves. The [ISO/IEC 25010](https://en.wikipedia.org/wiki/ISO/IEC_25010) standard names the characteristics: performance efficiency, compatibility, usability, reliability, security, maintainability, portability, and safety.

Three syllabus points worth remembering:

- It is sometimes appropriate to start non-functional testing **early** — even as part of reviews or component testing. Waiting for a complete system is not a law of nature.
- Many non-functional tests ride along on functional ones: the same "book a flight" test, checked for *how long* it takes or *how portable* it is.
- **Late discovery of non-functional defects can seriously threaten a project**, and some non-functional testing needs special environments (a usability lab, a load-test rig).

## Black-box and white-box — two directions of attack

**[Black-box testing](https://glossary.istqb.org/en_US/term/black-box-testing)** is specification-based: tests are derived from documentation **outside** the test object, without looking at its internal structure. Its main objective is checking the system's behaviour against its specification.

**[White-box testing](https://istqb-glossary.page/white-box-testing/)** is structure-based: tests are derived from the system's **implementation or internal structure** — code, architecture, workflows, data flows. Its main objective is **covering the underlying structure** by the tests to an acceptable level (how much of the code your tests actually exercise — more on coverage techniques in a later module).

![Test types at every test level](diagrams/test-types-matrix.svg)

The two are complements, not rivals: black-box asks "does it do what was promised?", white-box asks "have I exercised what's actually inside?".

## Change-related testing: confirmation and regression (FL-2.2.3)

Software changes for two reasons: to **enhance** it (a new feature) or to **fix** it (remove a defect). Every change brings two questions, and each gets its own test type:

**Confirmation testing** (also called **re-testing**) confirms that an **original defect has actually been fixed**. Depending on risk, that can mean re-running all the tests that previously failed, or adding new tests to cover the changes made to fix the defect. When time or money is short, confirmation testing might be reduced to simply re-running the steps that reproduced the original failure and checking it no longer occurs.

**[Regression testing](https://istqb-glossary.page/regression-testing/)** confirms that the change has caused **no adverse consequences** — including a fix that has already passed its confirmation testing. The damage could appear in the same component that was changed, in other components of the same system, or even in other connected systems; it isn't limited to the test object itself and may concern the environment too.

Two practical facts the exam likes:

- **First do an impact analysis** — work out which parts of the software could be affected, so you know how far the regression testing must reach.
- **Regression test suites run many times and keep growing**, which makes regression testing the strongest candidate for **test automation** — start automating early, and in a CI/CD pipeline always include the automated regression tests. Confirmation and regression testing are needed on **all test levels** wherever defects are fixed or changes are made.

## In plain terms

- Test types classify *what you look for*; levels classify *where you are*. All four types apply at every level.
- Functional = what the system does; non-functional = how well it does it (ISO 25010 characteristics).
- Black-box tests come from the outside documentation; white-box tests come from the inside structure.
- Confirmation testing verifies the fix itself; regression testing verifies nothing else broke — impact analysis first, automation strongly advised.

## Check yourself

1. "The invoice totals must sum correctly" versus "the invoice page must load within two seconds" — which type is which?
2. What is the main objective of white-box testing, and where do its tests come from?
3. A defect was fixed yesterday. Which tests confirm the fix, and which tests check nothing else broke?
4. Why is regression testing the top candidate for automation?
