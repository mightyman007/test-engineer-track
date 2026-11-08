+++
id = "istqb-m6-monitoring"
module = "istqb-m6-managing"
title = "Test Monitoring, Test Control and Test Completion"
minutes = 12
objectives = ["FL-5.3.1", "FL-5.3.2", "FL-5.3.3"]
videos = [
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 52 | Test Monitoring & Test Control | Test Metrics | ISTQB Tutorials (TM Square)", url = "https://www.youtube.com/watch?v=ug4d1wvfvI4" },
  { title = "ISTQB Foundation Level: 5.3.1 Metrics Used in Testing (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=oR0iTNEiu-s" },
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 53 | Test Progress Report | Test Summary Report | CTFL Tutorials (TM Square)", url = "https://www.youtube.com/watch?v=Fp9iw5Ein-I" },
  { title = "ISTQB Foundation Level: 5.3.2 Purpose, Content and Audience for Test Reports (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=51SzGHxL1Zk" },
  { title = "ISTQB Foundation Level: 5.3.3 Communicating the Status of Testing (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=dUEB9ddm_2I" },
]
diagrams = [
  { title = "The test-monitoring dashboard: metric families and where their numbers come from", file = "diagrams/monitoring-metrics.svg" },
]
+++

## Watching the work, then steering it (FL-5.3.1)

**[Test monitoring](https://istqb-glossary.page/test-monitoring/)** is concerned with **gathering information about testing** — information used to assess test progress and to measure whether the [exit criteria](https://istqb-glossary.page/exit-criteria/) (or the test tasks associated with them) are satisfied, such as meeting the targets for coverage of product risks, requirements, or acceptance criteria. **[Test control](https://istqb-glossary.page/test-control/)** uses that information to provide — in the form of **control directives** — guidance and the necessary corrective actions to achieve the most effective and efficient testing.

Examples of control directives:

- **reprioritizing tests** when an identified risk becomes an issue;
- **re-evaluating whether a test item meets entry criteria or exit criteria** due to rework;
- **adjusting the test schedule** to address a delay in the delivery of the test environment;
- **adding new resources** when and where needed.

The two are a pair: monitoring *measures*, control *acts* — and the metrics below are what monitoring measures with.

Test metrics are gathered to show progress against the planned test schedule and budget, the current quality of the test object, and the effectiveness of the test activities with respect to the test objectives or an iteration goal. Common test metrics (by family):

- **Project progress metrics** — e.g., task completion, resource usage, test effort
- **Test progress metrics** — e.g., test case implementation progress, test environment preparation progress, number of test cases run/not run, passed/failed, test execution time
- **Product quality metrics** — e.g., availability, response time, mean time to failure
- **Defect metrics** — e.g., number and priorities of defects found/fixed, defect density, defect detection percentage
- **Risk metrics** — e.g., residual risk level
- **Coverage metrics** — e.g., requirements coverage, code coverage
- **Cost metrics** — e.g., cost of testing, organizational cost of quality

![The test-monitoring dashboard: metric families and where their numbers come from](diagrams/monitoring-metrics.svg)

## Test reports and their audiences (FL-5.3.2)

Test reporting summarizes and communicates test information **during and after** testing. Two report types do different jobs:

**Test progress reports** support **ongoing test control**: they must provide enough information to modify the test schedule, resources, or test plan when deviations or changed circumstances demand it. They are usually generated **on a regular basis** (e.g., daily, weekly) and include:

- the testing period;
- test progress (ahead or behind schedule), including notable deviations;
- impediments for testing, and their workarounds;
- test metrics;
- new and changed risks within the testing period;
- testing planned for the next period.

**Test completion reports** summarize **a specific test activity** (a test level, test cycle, iteration) and can give information for subsequent testing. One is prepared during test completion, when a project, test level or test type is complete and — ideally — its exit criteria have been met. Typical contents:

- test summary;
- testing and product quality evaluation **based on the original test plan** (test objectives and exit criteria);
- deviations from the test plan (e.g., differences from the planned schedule, duration, effort);
- testing impediments and workarounds;
- test metrics based on test progress reports;
- unmitigated risks and defects not fixed;
- lessons learned relevant to the testing.

Different audiences require different information and influence the **degree of formality and the frequency** of reporting: progress reporting to others on the same team is often **frequent and informal**, while completion reporting follows a **set template and occurs only once**. The ISO/IEC/IEEE 29119-3 standard includes templates and examples for both (the test progress report is there called a test status report).

## Communicating the status of testing (FL-5.3.3)

The best means of communicating test status depends on test management concerns, organizational test strategies, regulatory standards, or — for self-organizing teams — the team itself. The options:

- **verbal communication** with team members and other stakeholders;
- **dashboards** (e.g., CI/CD dashboards, task boards, and burn-down charts);
- **electronic communication channels** (e.g., email, chat);
- **online documentation**;
- **formal test reports**.

One or more options can be combined. More formal communication suits **distributed teams**, where direct face-to-face communication is not always possible due to geographical distance or time differences. And because typically **different stakeholders are interested in different types of information, communication should be tailored** accordingly — the burn-down chart that satisfies the team may need a risk-and-exits summary for a regulator.

## Test completion, the activity (FL-5.3.2)

Test completion collects data from completed test activities to **consolidate experience, testware, and other relevant information**. It happens at **project milestones**: when a test level is completed, an agile iteration finishes, a test project completes (or is cancelled), a software system is released, or a maintenance release is completed. The companion activity from module 1's test process supplies the housekeeping: unresolved defects get change requests or product backlog items; useful testware is identified and **archived or handed over** to the appropriate teams; the test environment is shut down to an agreed state; and the activities are analyzed for **lessons learned** — all of which feeds the test completion report above.

## In plain terms

- **Monitoring gathers** information (metrics) to assess progress and check exit criteria; **control acts** on it via control directives — reprioritizing tests, re-evaluating entry/exit criteria after rework, adjusting schedules, adding resources.
- Seven metric families: project progress, test progress, product quality, defect (defect density, defect detection percentage), risk (residual risk level), coverage (requirements/code), cost.
- **Progress reports** (regular, support ongoing control): period, progress vs schedule, impediments and workarounds, metrics, new/changed risks, next period's plan. **Completion reports** (once, from a template, after exit criteria are met): summary, evaluation against the original plan's objectives and exit criteria, deviations, impediments, metrics, unmitigated risks and unfixed defects, lessons learned.
- Communication options: verbal, dashboards (CI/CD, task boards, burn-down charts), electronic channels, online documentation, formal reports — more formal for distributed teams, and always tailored to what each stakeholder needs.
- **Test completion** runs at milestones: archive or hand over testware, shut down the environment to an agreed state, turn unresolved defects into change requests or backlog items, capture lessons learned, and produce the test completion report.

## Check yourself

1. The test schedule slips because the test environment arrived late. Write one control directive for this situation, and name which metric family would have surfaced the risk earliest.
2. A stakeholder receives a weekly two-pager listing passed/failed counts, impediments, and next week's plan. Which report is it, which contents make you sure, and what would have to change for it to become the other report type?
3. Why can "we met 92% of the coverage targets but the payment module still has two unfixed critical defects" appear in a completion report without contradiction — i.e., what two completion-report sections is that sentence feeding?
4. Your testers are split across three time zones. Which communication option does the syllabus expect to become more formal, and why?
