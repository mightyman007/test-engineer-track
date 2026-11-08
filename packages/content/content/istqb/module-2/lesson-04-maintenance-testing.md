+++
id = "istqb-m2-maintenance"
module = "istqb-m2-sdlc"
title = "Maintenance Testing"
minutes = 10
objectives = ["FL-2.3.1"]
videos = [
  { title = "ISTQB Foundation 4.0 — Tutorial 21: Maintenance Testing | Impact Analysis (TM Square)", url = "https://www.youtube.com/watch?v=p_FLn6F7pOU" },
  { title = "ISTQB Foundation Level: 2.3 Maintenance Testing (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=gxKTmT2qvao" },
]
diagrams = [
  { title = "Maintenance triggers and impact analysis", file = "diagrams/maintenance-triggers.svg" },
]
+++

## Testing a system that is already live (FL-2.3.1)

Everything so far assumed software still being built. **[Maintenance testing](https://istqb-glossary.page/maintenance-testing/)** is different: it deals with changes to an **operational system** — software that real users already depend on. Testing the change means two things: evaluating whether the change itself works, and checking for possible **regressions** in the parts of the system that remain unchanged — which is usually *most* of the system.

How much maintenance testing is needed? The scope typically depends on:

- the **degree of risk** of the change,
- the **size of the existing system**,
- the **size of the change**.

## The three triggers for maintenance testing

The syllabus classifies what sets maintenance testing in motion into three groups:

**1. Modifications.** The most familiar trigger. This includes **planned enhancements** (ordinary release-based work), **corrective changes** (fixing defects), and **unplanned releases** — so-called **hot fixes** applied in a hurry when something is broken in production. Under the [ISO/IEC 14764](https://en.wikipedia.org/wiki/Software_maintenance#Categories) standard, maintenance is categorized as **corrective** (fixing defects), **adaptive** (adjusting to a changed environment), **perfective** (improving performance or maintainability), or **preventive** (stopping problems before they happen).

**2. Upgrades or migrations of the operational environment.** The software didn't change — its *world* did: a new platform, a new operating system, a new data centre. Such a move can require tests associated with the new environment as well as of the changed software. A special case is **data conversion**: when data from another application is migrated into the maintained system, the migrated data needs testing.

**3. Retirement.** Every system eventually reaches the end of its life. Even switching a system *off* can require testing: if long data retention periods apply, the **archiving** of data must be tested — including the **restore and retrieval procedures**, in case some of that data is needed during the archiving period.

![Maintenance triggers and impact analysis](diagrams/maintenance-triggers.svg)

## Impact analysis: the first step of every change

Maintenance almost always involves **[impact analysis](https://istqb-glossary.page/impact-analysis/)** — working out which parts of the system a proposed change could affect. Done **before** the change is made, it helps decide *whether* the change should be made at all, based on the potential consequences elsewhere. Done when planning the testing, it shows the extent of the regression testing: what must be re-checked because it might have been touched, directly or indirectly.

## In plain terms

- Maintenance testing covers changes to live systems: the change itself, plus regressions in the (usually much larger) unchanged rest.
- Three triggers: modifications (planned releases, fixes, hot fixes), environment migrations (including data conversion), and retirement (archiving, restore, retrieval).
- Its scope grows with the risk of the change, the size of the system, and the size of the change.
- Impact analysis comes first: it decides whether to change and how much regression testing to plan.

## Check yourself

1. An urgent fix is deployed on a Saturday afternoon because customers cannot check out. Which maintenance trigger is this?
2. A company moves its order system to a new cloud platform. What must be tested besides the software itself?
3. A 20-year-old payroll system is finally switched off. Why is there still testing to do?
4. What three factors typically determine the scope of maintenance testing?
