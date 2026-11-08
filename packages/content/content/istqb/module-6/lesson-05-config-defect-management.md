+++
id = "istqb-m6-config-defects"
module = "istqb-m6-managing"
title = "Configuration Management and Defect Management"
minutes = 14
objectives = ["FL-5.4.1", "FL-5.5.1"]
videos = [
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 54 | Configuration Management | Test Management | CTFL (TM Square)", url = "https://www.youtube.com/watch?v=i2Xw13tWpb0" },
  { title = "ISTQB Foundation Level: 5.4 Configuration Management (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=o8dKL02HtgQ" },
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 55 | Defect Management | Defect Report Template | CTFL Tutorials (TM Square)", url = "https://www.youtube.com/watch?v=tBnmtdBu7Hs" },
  { title = "ISTQB Foundation Level: 5.5 Defect Management (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=u5Q70S9C-HU" },
]
diagrams = [
  { title = "A defect's life from discovery to closure, with the rejected and deferred exits", file = "diagrams/defect-workflow.svg" },
]
+++

## Configuration management supports testing (FL-5.4.1)

In testing, [configuration management](https://istqb-glossary.page/configuration-management/) (CM) provides a discipline for **identifying, controlling, and tracking work products** — such as test plans, test strategies, test conditions, test cases, test scripts, test results, test logs, and test reports — as [configuration items](https://istqb-glossary.page/configuration-item/).

Why testers should care about CM mechanics:

- For a **complex configuration item** (e.g., a test environment), CM records the items it consists of, their **relationships, and versions**.
- If a configuration item is **approved for testing, it becomes a baseline** — and from then on it can only be changed **through a formal change control process**. A silently edited test case is not a test case anymore; it is a different, unrecorded one.
- CM keeps a **record of changed configuration items when a new baseline is created**, which makes it possible to **revert to a previous baseline to reproduce previous test results**. "It passed on Tuesday" only means something if Tuesday's exact configuration can be recreated.

To properly support testing, CM ensures:

- all configuration items, including **test items** (individual parts of the test object), are **uniquely identified, version controlled, tracked for changes, and related to other configuration items** so that [traceability](https://istqb-glossary.page/traceability/) can be maintained throughout the test process (module 1 showed what that traceability buys: coverage evaluation, change-impact analysis, audits, understandable reports);
- all identified documentation and software items are **referenced unambiguously in testware**.

Continuous integration, continuous delivery and continuous deployment with their associated testing are typically implemented as part of an automated DevOps pipeline (module 2), in which **automated CM is normally included**.

## Defect management: the workflow (FL-5.5.1)

One of the major test objectives is to find defects, so an established [defect management](https://istqb-glossary.page/defect-management/) process is essential. A vocabulary caveat the syllabus insists on: the reported **anomalies** may turn out to be real defects — or something else, e.g., a **false-positive result or a change request**; working the report through the process is what resolves that. Anomalies may be reported during **any phase of the SDLC**, and the form depends on the SDLC.

At a minimum, the defect management process includes:

- a **workflow** for handling individual defects or anomalies **from discovery to closure**, and
- **rules for their classification**.

The workflow typically comprises activities to **log** the reported anomalies, **analyze and classify** them, **decide on a suitable response** — such as to fix or to keep as is — and finally to **close** the defect report. The process must be followed by **all involved stakeholders**, and it is advisable to handle defects from **static testing** (especially static analysis) in a similar way.

![A defect's life from discovery to closure, with the rejected and deferred exits](diagrams/defect-workflow.svg)

The diagram shows one representative shape of that workflow — report comes in as **new**, gets **triaged** (analyze and classify), is picked up (**in progress**), gets **fixed**, is **verified** by confirmation testing, and is **closed**; the triage decision can also route it to **rejected** (e.g., duplicate or works-as-designed — the anomaly was not a defect) or **deferred** (won't be fixed now), and a failed verification sends it **re-opened**. The syllabus's own status vocabulary for defect reports includes open, deferred, duplicate, waiting to be fixed, awaiting confirmation testing, re-opened, closed and rejected — your project's tool will have its own state names, but every workflow has to answer the same questions: who decides, what happens to a non-defect, and when is it genuinely done.

## What goes into a defect report (FL-5.5.1)

Typical defect reports have three objectives: they **provide those responsible for handling and resolving reported defects with sufficient information to resolve the issue**, they **provide a means of tracking the quality of the work product**, and they **provide ideas for improvement of the development and test process**.

A defect report logged during dynamic testing typically includes:

- a **unique identifier**;
- a **title** with a short summary of the anomaly being reported;
- the **date** the anomaly was observed, the issuing organization, and the **author, including their role**;
- **identification of the test object and test environment**;
- the **context of the defect** — e.g., the test case being run, the test activity being performed, the SDLC phase, and other relevant information such as the test technique, checklist or test data being used;
- a **description of the failure** to enable **reproduction and resolution**, including the test steps that detected the anomaly and any relevant test logs, database dumps, screenshots, or recordings;
- **expected results and actual results**;
- the **severity** of the defect — the **degree of impact** on the interests of stakeholders or requirements;
- the **priority to fix**;
- the **status** of the defect (e.g., open, deferred, duplicate, waiting to be fixed, awaiting confirmation testing, re-opened, closed, rejected).

## Severity is not priority (FL-5.5.1)

The two judgment fields answer different questions, and confusing them is the classic defect-report mistake:

- **Severity** measures the **degree of impact** of the defect on stakeholders' interests or requirements — how bad is the damage if the defect occurs. It is about the defect's *consequence*.
- **Priority to fix** measures how urgently the team should fix it — a scheduling decision balancing severity against release plans, workarounds, and business context. It is about the defect's *treatment order*.

So a one-pixel logo misalignment on the homepage can be **low severity** (trivial impact — nothing breaks) yet **high priority** (the marketing campaign launches tomorrow and the boss wants it fixed first), while a crash in an admin screen that almost nobody opens can be **high severity** (the impact, if it fires, is a crashed session) yet **low priority** (nobody hits it, and a redesign lands next quarter anyway). The fields are computed by different logic — severity from impact, priority from treatment urgency — and a defect report needs both because neither implies the other.

## In plain terms

- **Configuration management** identifies, controls and tracks test work products as configuration items; approved items become **baselines** changeable only through formal change control; new baselines record what changed, so you can **revert to a previous baseline and reproduce previous test results**; CM guarantees unique identification, version control, change tracking and traceability, and unambiguous references in testware; DevOps pipelines automate it.
- **Defect management** needs a workflow (log → analyze and classify → decide a response → close) plus classification rules, applied by all stakeholders, to reports that may end up being false positives or change requests rather than defects; static-analysis findings should flow through the same kind of process.
- A defect report carries: identifier, title, date/organization/author, test object and environment, context, a reproduction-ready failure description (steps, logs, screenshots), **expected and actual results**, **severity** (degree of impact) and **priority to fix**, and **status** (open, deferred, duplicate, waiting to be fixed, awaiting confirmation testing, re-opened, closed, rejected).
- **Severity ≠ priority**: severity is the impact of the defect; priority is the urgency of fixing it. A trivial-but-visible defect can be high priority; a devastating-but-unreachable one can be low priority.

## Check yourself

1. A tester edits ten test cases in the shared repository after they were approved as a baseline, then runs and logs the results. What does configuration management require before those edits become legitimate — and why does "but the edits were improvements" not change the answer?
2. An anomaly report turns out to describe behavior the specification explicitly requires. Name the two things that happen to the report at triage (classification and status), and explain why "false positive" still made the report worth writing.
3. Build the checklist: which defect-report fields would you need to reproduce, judge, and schedule the fix for an anomaly — group the fields by those three jobs.
4. Write one defect scenario where severity and priority land on opposite ends, and one sentence each explaining which judgment produced each value.
