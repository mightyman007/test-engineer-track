+++
id = "istqb-m1-test-process"
module = "istqb-m1-fundamentals"
title = "The Test Process, Testware, and Roles"
minutes = 14
objectives = ["FL-1.4.1", "FL-1.4.2", "FL-1.4.3", "FL-1.4.4", "FL-1.4.5"]
videos = [
  { title = "ISTQB Foundation 4.0 — Tutorial 5: 1.4 Test Activities, Testware & Test Roles, Part 1 (TM Square)", url = "https://www.youtube.com/watch?v=9bx6bIVj5Lg" },
  { title = "ISTQB Foundation 4.0 — Tutorial 6: 1.4 Test Activities, Testware & Test Roles, Part 2 (TM Square)", url = "https://www.youtube.com/watch?v=uktKwGJwdCY" },
]
diagrams = [
  { title = "Test process activities", file = "diagrams/test-process-activities.svg" },
]
+++

## There is no single [test process](https://istqb-glossary.page/test-process/) (FL-1.4.2)

Teams often ask for "the" test process, as if one checklist fits every project. The syllabus is blunt: **testing is not performed in isolation**, and the way testing is carried out depends on contextual factors — the needs and cooperation of **stakeholders**, the **team members'** skills and experience, the **business domain** (criticality of the [test object](https://istqb-glossary.page/test-object/), identified risks, legal regulations), **technical factors** such as the product's architecture, **project constraints** (scope, time, budget, resources), **organizational factors**, the **[software development lifecycle](https://istqb-glossary.page/software-development-lifecycle/)** in use, and available **tools**. These factors shape the test strategy, the techniques used, the degree of automation, and the required level of coverage.

**How much testing is enough, then?** The same factors decide the level of rigour — how much testing, how formal, how documented. A [failure](https://istqb-glossary.page/failure/) in a hospital heart-rate monitor can hurt people and trigger regulators; a failure in a casual puzzle game annoys someone. So a two-person startup testing a marketing site and a bank testing a payment engine should test *differently* — not because one team is careless, but because the consequences of failure differ. Rigour is a deliberate, context-driven decision.

## The activities, step by step (FL-1.4.1)

The syllabus names seven groups of test activities. They happen roughly in this order, though they overlap, repeat, and are often implemented iteratively or in parallel — and **[test monitoring and control](https://istqb-glossary.page/test-monitoring/)** runs alongside all of them.

**[Test planning](https://istqb-glossary.page/test-planning/)** defines the test objectives and then selects the approach that best achieves those objectives within the constraints imposed by the overall context. Its headline [work product](https://en.wikipedia.org/wiki/Software_artifact) is the **[test plan](https://istqb-glossary.page/test-plan/)**.

**Test monitoring and test control.** [Monitoring](https://istqb-glossary.page/test-monitoring/) means the ongoing checking of all test activities and comparing actual progress against the plan; **[control](https://istqb-glossary.page/test-control/)** means taking the actions necessary to meet the test objectives when reality drifts — re-prioritize, re-allocate, re-plan.

**[Test analysis](https://istqb-glossary.page/test-analysis/).** Decide **what to test**. The team analyzes the **[test basis](https://istqb-glossary.page/test-basis/)** — the documents and information the tests are derived from: requirements, [user stories](https://en.wikipedia.org/wiki/User_story), designs, the architecture — to identify testable features, and defines and prioritizes **[test conditions](https://istqb-glossary.page/test-condition/)**, taking the related risks into account.

**[Test design](https://istqb-glossary.page/test-design/).** Decide **how to test**. Test conditions are elaborated into **[test cases](https://istqb-glossary.page/test-case/)** with their expected results, plus [test data](https://istqb-glossary.page/test-data/) requirements and the [test environment](https://istqb-glossary.page/test-environment/) design. Test analysis asks "what to test?"; test design answers "how to test?".

**[Test implementation](https://istqb-glossary.page/test-implementation/).** Turn designs into something runnable: create or acquire the [testware](https://istqb-glossary.page/testware/) needed for execution — **[test procedures](https://istqb-glossary.page/test-procedure/)**, manual and automated test scripts, test data, **[test suites](https://istqb-glossary.page/test-suite/)** — and build and verify the test environment.

**[Test execution](https://istqb-glossary.page/test-execution/).** Run the tests in accordance with the execution schedule, compare actual results with expected results, log the results, and analyze anomalies to report them as **[defect reports](https://istqb-glossary.page/defect-report/)**. When fixes arrive, two special kinds of testing follow: **[confirmation testing](https://istqb-glossary.page/confirmation-testing/)** (re-running the failed test to prove the fix) and **[regression testing](https://istqb-glossary.page/regression-testing/)** (re-running existing tests to prove nothing else broke).

**[Test completion](https://istqb-glossary.page/test-completion/).** Wrap the effort up at project milestones: create change requests or backlog items for anything unresolved, identify and archive testware that may be useful in the future, shut the test environment down to an agreed state, capture lessons learned — and produce a **[test completion report](https://glossary.istqb.org/en_US/term/test-completion-report)** for the stakeholders.

![Test process activities](diagrams/test-process-activities.svg)

## [Testware](https://istqb-glossary.page/testware/): what testing produces (FL-1.4.3)

Everything the activities produce — the test plan, prioritized test conditions, test cases and charters, test procedures, scripts, test suites, test data, environment setups, test logs, defect reports, and the test completion report — is **testware**: the syllabus's name for the output [work products](https://en.wikipedia.org/wiki/Software_artifact) of testing. Organizations produce, shape, and name their work products very differently; what keeps them trustworthy is proper [configuration management](https://istqb-glossary.page/configuration-management/), which ensures their consistency and integrity. Testware is an asset: unmaintained, it silently rots until nobody trusts it.

## Keeping track: [traceability](https://istqb-glossary.page/traceability/) (FL-1.4.4)

The link that keeps the testware chain honest is **[traceability](https://istqb-glossary.page/traceability/)** — the maintained path from each element of the test basis, through the test conditions and test cases derived from it, to the test results and defects they produced. Accurate traceability supports **coverage evaluation** (to what extent were the test objectives achieved?), makes it possible to **determine the impact of changes** (this requirement changed — which tests are affected?), **facilitates audits** and helps meet IT governance criteria, and makes test progress and completion reports more understandable to stakeholders.

## Who does what: roles in testing (FL-1.4.5)

In this syllabus, two principal roles in testing are covered — and they are defined by *activities*, not by job titles:

- The **test management role** takes overall responsibility for the test process, the test team, and the leadership of the test activities. It is mainly focused on test planning, test monitoring, test control, and test completion. A team leader, a test manager, or even a development manager may perform it; in agile teams, some of its tasks are handled by the whole team.
- The **testing role** takes overall responsibility for the engineering (technical) aspect of testing. It is mainly focused on test analysis, test design, test implementation, and test execution.

Different people may take on these roles at different times — and it is possible for one person to take on both roles at the same time. Titles vary; the activities do not. Testers also differ in how [independent](https://istqb-glossary.page/independence-of-testing/) they are from the code's authors — the four levels of independence and their trade-offs are Lesson 5's topic.

## In plain terms

- There is no universal test process: stakeholders, domain, constraints, lifecycle and tools shape it — including how rigorous testing must be.
- Planning → monitoring & control → analysis (what) → design (how) → implementation → execution → completion.
- Testware is testing's output and an asset; configuration management keeps it consistent.
- Traceability from requirements to results enables coverage evaluation, change-impact analysis, and audits.
- Test management and testing roles are activity-based, not job titles — and one person can wear both hats.
