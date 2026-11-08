+++
id = "istqb-m5-white-box"
module = "istqb-m5-whitebox"
title = "White-Box Test Techniques"
minutes = 14
objectives = ["FL-4.3.1", "FL-4.3.2", "FL-4.3.3"]
videos = [
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 34 | Statement Testing | Statement Coverage | Test Techniques | CTFL (TM Square)", url = "https://www.youtube.com/watch?v=Hh_7umKv2d0" },
  { title = "ISTQB Foundation Level: 4.3.1 Statement Testing and Statement Coverage (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=m1NQNaxbEVo" },
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 35 | Branch Testing & Branch Coverage | Test Case Techniques | CTFL (TM Square)", url = "https://www.youtube.com/watch?v=xZEkzn8Phrg" },
  { title = "ISTQB Foundation Level: 4.3.2 Branch Testing and Branch Coverage (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=L1l1S4_ptWc" },
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 36 | Value of White Box Test Techniques | CTFL Tutorials (TM Square)", url = "https://www.youtube.com/watch?v=v5OiDZBz0yU" },
  { title = "ISTQB Foundation Level: 4.3.3 The Value of White box Testing (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=7TNeVqYiXro" },
]
diagrams = [
  { title = "One control flow, two coverage ladders: statement-only versus branch coverage", file = "diagrams/coverage-illustration.svg" },
]
+++

## Opening the box (FL-4.3.1)

Module 4 introduced the three families of [test techniques](https://istqb-glossary.page/test-technique/); this lesson works through the second family. [White-box test techniques](https://istqb-glossary.page/white-box-test-technique/) (also called *structure-based*) derive tests from the test object's **internal structure and processing**, so — unlike black-box tests — they can only be designed once the design or implementation exists. The Foundation syllabus concentrates on two code-related techniques, chosen for their popularity and simplicity: **statement testing** and **branch testing**. (More rigorous white-box techniques exist for safety-critical software, and some white-box coverage has nothing to do with code at all — the syllabus names neuron coverage for neural networks — but those are out of scope here.)

Both techniques work over the same picture: the [control flow graph](https://istqb-glossary.page/control-flow-graph/), which shows the possible sequences in which the source code's statements are executed. Nodes are statements (or parts of them); the arrows between nodes are transfers of control. Almost everything in this lesson is bookkeeping over that graph.

## Statement testing and statement coverage (FL-4.3.1)

In [statement testing](https://istqb-glossary.page/statement-testing/), the coverage items are **executable statements**. The aim is to design test cases that exercise statements until an acceptable level of coverage is reached, measured as:

> **statement coverage = (statements exercised ÷ total number of executable statements) × 100%**

When **100% statement coverage** is achieved, every executable statement in the code has been exercised at least once — so in particular, a statement containing a defect will be executed, which *may* cause a failure demonstrating the defect. The syllabus is careful about both halves of that promise, because exercising a statement **will not detect defects in all cases**:

- Defects can be **data-dependent**: a division by zero that only fails when the denominator happens to be zero is *in* an executed statement, yet a test that feeds a harmless denominator exercises the statement without revealing anything.
- 100% statement coverage **does not ensure that all the decision logic has been tested**: a test suite can run every statement while never taking, say, the false side of an `if` — so whole branches of the code's behavior stay untested.

## Branch testing and branch coverage (FL-4.3.2)

A **branch** is a transfer of control between two nodes of the control flow graph. Every arrow counts: transfers are either **unconditional** (straight-line code — the arrow the code always follows) or **conditional** (a decision outcome — the arrow taken only when a decision resolves a particular way). Conditional branches typically correspond to a true or false outcome of an "if...then" decision, an outcome of a switch/case statement, or a decision to exit or continue in a loop.

In [branch testing](https://istqb-glossary.page/branch-testing/), the coverage items are **branches**, measured as:

> **branch coverage = (branches exercised ÷ total number of branches) × 100%**

100% branch coverage means **all** branches — unconditional *and* conditional — have been exercised. And like statement coverage, it has limits: exercising a branch may not detect defects that require the execution of a specific *path* (a particular sequence of branches) through the code.

## Branch coverage subsumes statement coverage (FL-4.3.2)

Here is the exam's favorite white-box fact, in the syllabus's own words:

> **Branch coverage subsumes statement coverage.** Any set of test cases achieving 100% branch coverage also achieves 100% statement coverage — **but not vice versa**.

The intuition: to travel along every arrow of the graph you must visit every node, but you can visit every node while skipping an arrow (the guard clause in the worked example below does exactly that). One caveat worth knowing: this guarantee needs the *branch* criterion precisely because branches count unconditional arrows too. v4.0 replaced the older "decision coverage" wording (which counted only decision outcomes) partly because "100% decision coverage implies 100% statement coverage" is false for a program with **no decisions at all** — zero outcomes, coverage trivially 100%, statements never executed. Different standards also define "decision" differently. For our purposes: if a computation counts decision outcomes, that is a valid conditional-branch reading; the full branch count adds the unconditional arrows.

![One control flow, two coverage ladders: statement-only versus branch coverage](diagrams/coverage-illustration.svg)

A related idea you may meet in industry — **not examinable at CTFL v4.0** — is the cyclomatic number: a control flow graph with *D* binary decisions has roughly *D + 1* linearly independent paths, and teams have used that count as a complexity budget. Treat it as a decision-count proxy, not a coverage criterion: 100% branch coverage can be reached while whole independent paths stay unexplored.

## Worked example (FL-4.3.1, FL-4.3.2)

A guard clause: the function runs statement S1, then decision D1. When D1 is **true**, S2 runs; both routes (S2, or the skip past it) end at statement S3. One test case triggers the **true** route.

- **Statement coverage:** S1, S2, S3 all ran → **100%** (3 of 3).
- **Branch coverage:** the arrows exercised are S1→D1, D1→S2 (true outcome), S2→S3 — three of the four; the false outcome's arrow D1→S3 was never taken → **75%** (3 of 4). Counting only conditional branches (decision outcomes) gives 1 of 2 = 50%; either way, the lesson is the same: **100% statement coverage, and the false branch was never tested.**

Now widen the flow: after D1 the routes join at S4, and a second decision D2 chooses between S5 (true) and S6 (false). Running the true route of D1 followed by the false route of D1 touches every distinct statement (S1, S2, S3, S4 — S1 and S4 are shared, so no double counting) and takes both outcomes of D1: 100% statement *and* 100% branch coverage. That pairing — statement coverage counts distinct statements, branch coverage counts arrows taken — is the arithmetic behind the exam's computation questions.

## What white-box testing is worth (FL-4.3.3)

The strength all white-box techniques share: the **entire software implementation is taken into account**, which facilitates defect detection **even when the specification is vague, outdated or incomplete**. The mirror-image weakness: if the software fails to implement one or more requirements, white-box testing may not detect the resulting **defects of omission** — code can be perfectly structured and still not do what was never written.

Three more points from the syllabus worth remembering:

- White-box techniques can be used **in static testing** — dry runs of code, and reviewing code not yet ready for execution; pseudocode and other high-level or top-down logic can be modeled with a control flow graph.
- Performing **only black-box testing provides no measure of actual code coverage**.
- White-box coverage measures give an **objective measurement** of coverage, and the information needed to generate additional tests that increase it — and with it, confidence in the code.

That last point connects straight back to module 4's coverage-as-exit-criterion idea: "100% branch coverage of the payment module" is a measurable [exit criterion](https://istqb-glossary.page/exit-criteria/) in a way "we tested the payment module a lot" never will be.

## In plain terms

- White-box (structure-based) techniques derive tests from the **internal structure** of the test object, using the **control flow graph**; they need the design or code to exist first.
- **Statement testing:** coverage items are executable statements; coverage = statements exercised ÷ total statements. 100% means every statement ran — but data-dependent defects can hide, and decision logic may be untested.
- **Branch testing:** coverage items are branches — *all* transfers of control, unconditional and conditional (decision outcomes); coverage = branches exercised ÷ total branches.
- **Branch coverage subsumes statement coverage** (100% branch ⇒ 100% statement, never the reverse); v4.0 prefers "branch" to "decision" wording because different standards define decisions differently and the old implication breaks for programs with no decisions.
- White-box strength: the whole implementation is considered — defects surface even with a vague, outdated or incomplete specification; weakness: **defects of omission** can slip through; and black-box-only testing gives no code-coverage measurement at all.

## Check yourself

1. A test suite achieves 100% statement coverage on a function containing an untested false branch of an `if`. Which coverage criterion is *not* satisfied, and why does the suite still count as 100% on the first criterion?
2. In the guard-clause worked example, why does counting only decision outcomes give 50% while counting all arrows gives 75% — and which count does the syllabus's "branch" mean?
3. A module was built from a specification that turned out to be missing a whole requirement. Why is white-box testing the *wrong* tool to discover that — and what family would you add?
4. Your team tests a REST API purely from its specification. A manager asks "how much of the code did we exercise?" Why can nobody answer that question from the black-box suite alone?
