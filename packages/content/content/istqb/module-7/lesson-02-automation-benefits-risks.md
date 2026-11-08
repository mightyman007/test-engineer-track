+++
id = "istqb-m7-benefits-risks"
module = "istqb-m7-tools"
title = "Benefits and Risks of Test Automation"
minutes = 10
objectives = ["FL-6.2.1"]
videos = [
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 58 | Benefits and Risk of Test Tools | Test Tools | CTFL (TM Square)", url = "https://www.youtube.com/watch?v=PgbZJK-ryzw" },
  { title = "ISTQB Foundation Level: 6.2 Benefits and Risks of Test Automation (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=MBcl_Cx6PFE" },
]
diagrams = [
  { title = "Automation's balance: potential benefits against potential risks, with pilot-to-rollout as the resolution path", file = "diagrams/automation-balance.svg" },
]
+++

## What test automation is — and what acquiring a tool is not (FL-6.2.1)

**[Test automation](https://istqb-glossary.page/test-automation/)** — this chapter's keyword — is the use of software to perform or support test activities, e.g., test management, test design, test execution and results checking. It is a broad idea: automation is not only scripts that click buttons, but any software supporting any test activity (the tool landscape of lesson 1).

The syllabus opens section 6.2 with the sentence that explains most automation failures: **simply acquiring a tool does not guarantee success**. Each new tool requires effort to achieve real and lasting benefits — for **tool introduction, maintenance and training** — and there are risks, which **need analysis and mitigation** (Module 6's risk discipline, applied to tools).

## Potential benefits of test automation (FL-6.2.1)

- **Time saved** by reducing repetitive manual work — e.g., executing [regression tests](https://istqb-glossary.page/regression-testing/), re-entering the same test data, comparing expected results vs actual results, and checking against coding standards.
- **Prevention of simple human errors** through greater **consistency and repeatability** — tests are consistently derived from requirements, test data is created in a systematic manner, and tests are executed by a tool in the same order with the same frequency.
- **More objective assessment** (e.g., coverage) and providing measures that are **too complicated for humans to determine**.
- **Easier access to information about testing** to support test management and test reporting — e.g., statistics, graphs, and aggregated data about test progress, [failure rates](https://istqb-glossary.page/failure-rate/) and test execution duration.
- **Reduced test execution times**, to provide earlier defect detection, faster feedback and faster time to market.
- **More time for testers to design new, deeper and more effective tests** — automation returns hours to the humans, who then spend them on the intellectual work tools cannot do (lesson 1).

## Potential risks of test automation (FL-6.2.1)

- **Unrealistic expectations** about the benefits of a tool — including functionality and ease of use.
- **Inaccurate estimations** of the time, costs and effort required to introduce a tool, maintain test scripts, and change the existing manual test process.
- **Using a test tool when manual testing is more appropriate.**
- **Relying on a tool too much** — e.g., ignoring the need for human critical thinking (false confidence: a green dashboard is only as good as the suite behind it).
- **Dependency on the tool vendor**, which may go out of business, retire the tool, sell the tool to a different vendor, or provide poor support (responses to queries, upgrades, defect fixes).
- **Using open-source software**, which may be abandoned — no further updates available — or whose internal components may require quite frequent updates as further development.
- **The automation tool is not compatible** with the development platform.
- **Choosing an unsuitable tool** that did not comply with the regulatory requirements and/or safety standards.

![Automation's balance: potential benefits against potential risks, with pilot-to-rollout as the resolution path](diagrams/automation-balance.svg)

## Introducing a tool in practice (FL-6.2.1)

The syllabus names the risk categories but not a procedure; the industry-standard response to exactly these risks is a **pilot before rollout**:

1. **Define success criteria up front** — what the tool must demonstrably deliver (e.g., "regression cycle time cut from 3 days to 4 hours with no increase in escaped defects"). Vague expectations are themselves the first risk on the list; measurable criteria are their antidote.
2. **Run a pilot** on a limited, representative scope — one suite, one team — rather than committing the whole test process to the tool at once.
3. **Evaluate the pilot against the agreed criteria**, including the hidden costs the syllabus warns about: script maintenance, training, and the changed manual process.
4. **Roll out, adjust, or abandon** based on the evidence — a cheap, early "no" is a successful pilot, too.

The pilot's scope decision should also weigh the sourcing risks: a **commercial vendor** brings dependency risk (out of business, sold, poor support); an **open-source or in-house alternative** trades that for abandonment/staleness risk and maintenance effort — and both must clear platform compatibility and any regulatory/safety compliance before the pilot even starts.

## In plain terms

- **[Test automation](https://istqb-glossary.page/test-automation/)** = using software to perform or support test activities (management, design, execution, results checking). Acquiring a tool guarantees nothing; real benefits require effort on introduction, maintenance and training, and the risks need analysis and mitigation.
- The six benefits: time saved on repetitive work (regression, data re-entry, comparisons, standards checks); fewer simple human errors via consistency and repeatability; more objective assessment plus measures too complicated for humans; easier access to test information for management and reporting; shorter execution times (earlier defect detection, faster feedback, faster time to market); more time to design deeper tests.
- The eight risks: unrealistic expectations; inaccurate estimates of introduction/maintenance/process-change effort; automating what manual testing does better; over-reliance that ignores critical thinking; vendor dependency; abandoned or fast-churning open source; platform incompatibility; non-compliance with regulatory or safety requirements.
- Introducing a tool: agree success criteria first, pilot on limited scope, evaluate against the criteria (including maintenance and training costs), then roll out, adjust, or abandon. Weigh vendor-vs-open-source sourcing risks before the pilot.

## Check yourself

1. Your regression suite is fully automated and passes 100% nightly, yet three customer-escalated defects last month were never covered by any automated test. Which risk does this illustrate, and which benefit did the suite deliver anyway?
2. A manager estimates "two weeks and it automates everything." Name the syllabus risk, and two cost categories the estimate likely omitted.
3. For each situation, is automation or manual testing more appropriate: (a) 5,000-user load simulation; (b) one-off exploratory session on a brand-new feature; (c) nightly re-run of 800 stable regression cases; (d) judging whether a new onboarding flow *feels* trustworthy?
4. A team picked an open-source automation tool. Which risk from the syllabus list applies specifically because of that sourcing choice, and which two facets does that one risk name? How does a pilot surface them cheaply?
