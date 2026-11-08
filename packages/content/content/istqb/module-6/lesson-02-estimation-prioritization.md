+++
id = "istqb-m6-estimation"
module = "istqb-m6-managing"
title = "Estimation, Prioritization, the Pyramid and the Quadrants"
minutes = 14
objectives = ["FL-5.1.4", "FL-5.1.5", "FL-5.1.6", "FL-5.1.7"]
videos = [
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 47 | Test Estimation Techniques | Wide Band Delphi | Extrapolation (TM Square)", url = "https://www.youtube.com/watch?v=9fZyxFqAOXI" },
  { title = "ISTQB Foundation Level: 5.1.4 Estimation Techniques (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=0k0_9NzjUf4" },
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 48 | Test Execution Schedule | Test Prioritization | CTFL Tutorials (TM Square)", url = "https://www.youtube.com/watch?v=VNPkGIqedrc" },
  { title = "ISTQB Foundation Level: 5.1.5 Test Case Prioritization (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=FL_wBjdPHs0" },
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 49 | Test Pyramid | Testing Quadrants | Test Management | CTFL (TM Square)", url = "https://www.youtube.com/watch?v=JXk7rtevWFk" },
  { title = "ISTQB Foundation Level: 5.1.6 Test Pyramid (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=aLXBiEOd35k" },
  { title = "ISTQB Foundation Level: 5.1.7 Testing Quadrants (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=4nsP08ErHwQ" },
]
diagrams = [
  { title = "Four estimation techniques side by side, with their mini-formulas", file = "diagrams/estimation-techniques.svg" },
]
+++

## Estimating test effort (FL-5.1.4)

Test effort estimation predicts the **amount of test-related work needed to meet the test objectives** of a test project. Two honesty rules come with every estimate: tell the stakeholders that the estimate **rests on assumptions** and is **always subject to estimation error**; and remember that estimates for **small tasks are usually more accurate** than for large ones — so when estimating a large task, **decompose it** into smaller tasks and estimate those.

The syllabus describes four techniques:

- **Estimation based on ratios.** A metrics-based technique: figures collected from previous projects within the organization yield "standard" ratios for similar projects, which are then applied to the new project. An organization's own historical data is generally the best source. Example: if the previous project's development-to-test effort ratio was 3:2 and the current project expects 600 person-days of development effort, the test effort estimate is 400 person-days.
- **Extrapolation.** Also metrics-based, but it measures **as early as possible in the current project** and, with enough observations, approximates the effort for the remaining work by extrapolating the data (usually with a mathematical model). Very suitable in iterative SDLCs — e.g., estimate the next iteration's test effort as the averaged effort of the last three iterations.
- **Wideband Delphi.** An iterative, **expert-based** technique: each expert estimates **in isolation**; results are collected; if some estimates fall outside the agreed boundaries, the experts discuss; each expert then re-estimates **in isolation** again. The loop repeats until a consensus is reached. **[Planning Poker](https://istqb-glossary.page/planning-poker/)** is a variant of Wideband Delphi commonly used in Agile, with estimates made using cards whose numbers represent effort size.
- **Three-point estimation.** Also expert-based: each expert produces the **most optimistic (a)**, **most likely (m)** and **most pessimistic (b)** estimate, and the final estimate E is their weighted arithmetic mean. In the most popular version:

> **E = (a + 4·m + b) / 6**  and the estimation error is  **SD = (b − a) / 6**

![Four estimation techniques side by side, with their mini-formulas](diagrams/estimation-techniques.svg)

## Three-point estimation worked (FL-5.1.4)

A test-design task is estimated at a = 4, m = 7 and b = 16 person-hours. The weighted mean is E = (4 + 4·7 + 16) / 6 = (4 + 28 + 16) / 6 = 48 / 6 = **8 person-hours**, and the measurement error is SD = (16 − 4) / 6 = 12 / 6 = **2** — so the estimate is reported as **8 ± 2 person-hours, i.e., between 6 and 10**. Compare the naive average of the three numbers, (4 + 7 + 16) / 3 = 9: the three-point formula pulls the estimate toward the most likely value (that is what the factor 4 on m does), and it is the only technique of the four that hands you a stated error bar with the answer.

## Prioritizing test cases into an execution schedule (FL-5.1.5)

Once test cases and test procedures are specified and assembled into [test suites](https://istqb-glossary.page/test-suite/), the suites are arranged into a **[test execution schedule](https://istqb-glossary.page/test-execution-schedule/)** — the order in which they are run. The most commonly used prioritization strategies:

- **Risk-based prioritization** — the order follows the results of risk analysis; test cases covering the most important risks run first.
- **Coverage-based prioritization** — the order follows coverage (e.g., statement coverage): test cases achieving the highest coverage run first. A variant, **additional coverage prioritization**, runs the test case with the highest coverage first, then repeatedly picks the case that adds the **highest additional coverage** to what is already scheduled.
- **Requirements-based prioritization** — the order follows the priorities of requirements traced back to the test cases; requirement priorities are set by stakeholders, and test cases for the most important requirements run first.

Two constraints override any priority order:

- **Dependencies.** If a higher-priority test case depends on a lower-priority one, the lower-priority test case must be executed first.
- **Resource availability.** The required test tools, test environments, or people may only be available in a specific time window — the schedule must respect that.

## The test pyramid (FL-5.1.6)

The [test pyramid](https://istqb-glossary.page/test-pyramid/) is a model showing that different tests may have different **granularity**. It supports teams in test automation and test effort allocation by showing that different test objectives are supported by different levels of test automation. Each layer represents a group of tests, and the direction of the layers is the examinable core: the **higher the layer, the lower the test granularity, the lower the test isolation** (the degree of dependency on other elements of the system) **and the higher the test execution time**.

- **Bottom layer:** small, isolated, fast tests that check a small piece of functionality — so **many** of them are needed for reasonable coverage.
- **Top layer:** complex, high-level, end-to-end tests — slower, checking a large piece of functionality, so only **a few** are needed.

The number and naming of layers varies. The original model (Cohn 2009) has three layers — "unit tests", "service tests", "UI tests"; another popular model uses unit (component) tests, integration (component integration) tests, and end-to-end tests. Other test levels (module 2) can be used too.

## The testing quadrants (FL-5.1.7)

The [testing quadrants](https://istqb-glossary.page/testing-quadrants/) (Marick 2003; Crispin 2008) group test levels with appropriate test types, activities, techniques and work products in Agile development. The model helps test management visualize that all appropriate types and levels are included in the SDLC, that some test types fit certain test levels better than others, and it gives stakeholders a shared vocabulary for test types.

The two axes: tests can be **business facing or technology facing**, and they can **support the team** (guide the development) or **critique the product** (measure its behavior against expectations). The combinations give four quadrants:

| Quadrant | Facing | Mode | Typical contents |
|---|---|---|---|
| Q1 | technology | support the team | component tests, component integration tests — should be automated and included in the [continuous integration](https://istqb-glossary.page/continuous-integration/) process |
| Q2 | business | support the team | functional tests, examples, user story tests, user experience prototypes, API testing, simulations — check the acceptance criteria; manual or automated |
| Q3 | business | critique the product | exploratory testing, usability testing, user acceptance testing — user-oriented, often manual |
| Q4 | technology | critique the product | smoke tests and non-functional tests (except usability tests) — often automated |

## In plain terms

- **Estimation** predicts test-related work; state its assumptions and its error, and split large tasks before estimating. Four techniques: **ratio-based** (organization's historical ratios), **extrapolation** (measure early in *this* project, project the rest — fits iterative SDLCs), **Wideband Delphi** (experts estimate in isolation, discuss outliers, repeat to consensus; Planning Poker variant), **three-point** (E = (a + 4·m + b)/6 with error SD = (b − a)/6).
- **Prioritization** orders the test execution schedule: risk-based, coverage-based (or additional-coverage), requirements-based — always subject to dependencies (a lower-priority test a higher one depends on must run first) and resource availability windows.
- **Test pyramid:** going up a layer means lower granularity, lower isolation, slower tests — so few high-level end-to-end tests on top, many small fast isolated tests at the bottom.
- **Testing quadrants** sort Agile testing on two axes — business vs technology facing, supporting the team vs critiquing the product: Q1 automated component/component-integration tests in CI; Q2 acceptance-criteria-facing functional tests; Q3 user-oriented critique (exploratory, usability, UAT); Q4 technology critique (smoke + non-functional except usability).

## Check yourself

1. Why does the three-point estimate report an error term (± SD) while a simple average of three numbers does not — and which factor in the formula makes the estimate lean toward the most-likely value?
2. Your highest-priority regression test needs data that a lower-priority setup test creates. What must the test execution schedule do, and which syllabus rule is this?
3. In the test pyramid, which property *increases* as you move up the layers — test isolation, test granularity, or test execution time — and which two decrease?
4. A team runs automated smoke tests against every build. Which quadrant is that, and which axis makes it "technology facing" rather than "business facing"?
