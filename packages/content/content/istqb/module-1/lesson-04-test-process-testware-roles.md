+++
id = "istqb-m1-test-process"
module = "istqb-m1-fundamentals"
title = "The Test Process, Testware, and Roles"
minutes = 14
objectives = ["FL-1.4.1", "FL-1.4.2", "FL-1.4.3", "FL-1.4.4"]
videos = [
  { title = "ISTQB Foundation 4.0 — Tutorial 5: 1.4 Test Activities, Testware & Test Roles, Part 1 (TM Square)", url = "https://www.youtube.com/watch?v=9bx6bIVj5Lg" },
  { title = "ISTQB Foundation 4.0 — Tutorial 6: 1.4 Test Activities, Testware & Test Roles, Part 2 (TM Square)", url = "https://www.youtube.com/watch?v=uktKwGJwdCY" },
]
diagrams = [
  { title = "Test process activities", file = "diagrams/test-process-activities.svg" },
]
+++

## There is no single [test process](https://istqb-glossary.page/test-process/) (FL-1.4.1)

Teams often ask for "the" test process, as if one checklist fits every project. The syllabus is blunt: **there is no universal test process**. The set of activities and their order depend on context — the software development lifecycle, the product and domain, the organization, and the risks involved. A regulated medical device project documents every step; a small web team may run the same activities lightly and continuously. The skill is in *tailoring*: keeping the substance of each activity while adapting its weight and form. What stays constant are the **test activities** themselves — they exist in some shape on every serious project.

## The activities, step by step (FL-1.4.2)

The syllabus names seven groups of test activities. They happen roughly in this order, though they overlap and repeat, and **[test monitoring and control](https://istqb-glossary.page/test-monitoring/)** runs alongside all of them.

**Test planning.** Define the objectives of testing and the approach: what will be tested, by whom, with what techniques, on what schedule, and how results will be judged. Its headline work product is the **[test plan](https://istqb-glossary.page/test-plan/)**.

**Test monitoring and control.** Compare actual progress against the plan — metrics, dashboards — and take **[control](https://istqb-glossary.page/test-control/)** action when reality drifts: re-prioritize, re-allocate, re-plan. Monitoring and control wrap around everything else, from the first day to the last.

**[Test analysis](https://istqb-glossary.page/test-analysis/).** Decide **what to test**. The team studies the **[test basis](https://istqb-glossary.page/test-basis/)** — the documents and information the tests are derived from: requirements, [user stories](https://en.wikipedia.org/wiki/User_story), designs, the architecture — and identifies **[test conditions](https://istqb-glossary.page/test-condition/)**, the things to be verified, along with the associated risks and priorities.

**[Test design](https://istqb-glossary.page/test-design/).** Decide **how to test**. For each priority test condition, create **[test cases](https://istqb-glossary.page/test-case/)** with their expected results, plus [test data](https://istqb-glossary.page/test-data/) and the environment requirements. Test analysis asks "what must be checked?"; test design answers "what exact steps and inputs will check it?"

**[Test implementation](https://istqb-glossary.page/test-implementation/).** Turn designs into something runnable: create **[test procedures](https://istqb-glossary.page/test-procedure/)** (and scripts, including automation), prepare the **[test environment](https://istqb-glossary.page/test-environment/)** and [test data](https://istqb-glossary.page/test-data/), and organize the tests into **[test suites](https://istqb-glossary.page/test-suite/)** so they can be run in sensible batches.

**[Test execution](https://istqb-glossary.page/test-execution/).** Run the tests, record results in a **[test log](https://istqb-glossary.page/test-log/)**, compare actual with expected outcomes, and raise **[defect reports](https://istqb-glossary.page/defect-report/)** for anything that deviates. When fixes arrive, two special kinds of testing follow: **[confirmation testing](https://istqb-glossary.page/confirmation-testing/)** (re-running the failed test to prove the fix) and **[regression testing](https://istqb-glossary.page/regression-testing/)** (re-running existing tests to prove nothing else broke).

**[Test completion](https://istqb-glossary.page/test-completion/).** Wrap the effort up: consolidate the metrics, produce a **[test summary report](https://istqb-glossary.page/test-summary-report/)**, archive the [testware](https://istqb-glossary.page/testware/) for future reuse, and hand the test environment over to maintenance.

![Test process activities](diagrams/test-process-activities.svg)

## [Testware](https://istqb-glossary.page/testware/): what testing produces (FL-1.4.3)

Everything the activities produce — plans, test conditions, test cases, procedures, scripts, data, environment setups, logs, defect reports, summary reports — is **[testware](https://istqb-glossary.page/testware/)**. The word exists for a reason: testware is *software's* documentation's cousin — an asset that must be kept consistent, versioned, and maintained, or it silently rots until nobody trusts it.

Testware is a chain: each activity's output feeds the next activity's input. The link that keeps the chain honest is **[traceability](https://istqb-glossary.page/traceability/)** — the recorded path from each requirement, through the test conditions derived from it, to the test cases covering it and the results they produced. Traceability lets a team answer three exam-worthy questions: *How much of the test basis did we cover?* (coverage evaluation) *If this requirement changes, which tests are affected?* (impact analysis) *Can we show an auditor that everything important was tested?* (auditability).

## Who does what: roles and [independence](https://istqb-glossary.page/independence-of-testing/) (FL-1.4.4)

Two broad role families appear across projects. The **test management role** plans, monitors, and controls the testing effort — a test manager may hold it, but so may a team lead or a project manager. The **testing role** does the hands-on analysis, design, and execution work. One person can wear both hats; several people can share each. Titles vary; the activities do not.

Testers also differ in how **[independent](https://istqb-glossary.page/independence-of-testing/)** they are from the people who wrote the code. The syllabus recognizes four levels, from lowest to highest independence:

1. **No independent tester** — the author tests their own code.
2. **Independent within the team** — another developer, or testers embedded in the same development team, design or execute the tests.
3. **Independent within the organization** — a separate test team or group that does not report to the developers.
4. **Independent from the organization** — testers from outside the company, such as contractors or an [outsourcing](https://en.wikipedia.org/wiki/Outsourcing) vendor.

Independence is a trade-off, not a virtue in itself. Higher independence brings fresh eyes: authors tend to miss their own mistakes because they see what they *meant* to write. Independent testers may also challenge hidden assumptions. The price: outsiders may lack information and context, communication takes effort, and developers can start to feel that quality is "someone else's problem". The syllabus is careful to say that independence is *not* a replacement for developers' understanding of the product — the right level depends on the context.

## In plain terms

- There is no universal test process — tailor the same seven activities to your context.
- Planning → monitoring & control → analysis (what) → design (how) → implementation → execution → completion.
- Testware is testing's output and an asset: keep it consistent and traceable from requirements to results.
- Test management and testing roles are distinct from titles; independence runs on a four-step scale with real benefits and real costs.
