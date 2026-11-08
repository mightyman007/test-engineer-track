+++
id = "istqb-m2-test-levels"
module = "istqb-m2-sdlc"
title = "Test Levels: Who Tests What, and When"
minutes = 14
objectives = ["FL-2.2.1"]
videos = [
  { title = "ISTQB Foundation 4.0 — Tutorial 13: 2.2.1 Test Levels & Test Types | Component Testing (TM Square)", url = "https://www.youtube.com/watch?v=YYbphLjv-7Y" },
  { title = "ISTQB Foundation Level: 2.2 Test Levels and Test Types (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=NA8szjRpvHs" },
]
diagrams = [
  { title = "The five test levels", file = "diagrams/test-levels-pipeline.svg" },
]
+++

## What a [test level](https://istqb-glossary.page/test-level/) is (FL-2.2.1)

A **[test level](https://istqb-glossary.page/test-level/)** is a group of test activities that are organized and managed together. Each level is its own instance of the test process, aimed at the software at a particular stage of its growth — from single components up to complete systems, and systems of systems.

Levels exist so that testing can be comprehensive without being redundant. Two practical notes from the syllabus:

- In **sequential** lifecycles, the exit criteria of one level often form the entry criteria of the next: system testing doesn't begin until component testing has met its goals. In some **iterative** models this doesn't apply — development activities may span several levels, and levels may overlap in time.
- Levels are kept distinct by their attributes: the **[test object](https://istqb-glossary.page/test-object/)** (what is tested), the **test objectives**, the **[test basis](https://istqb-glossary.page/test-basis/)** (the documents the tests are derived from), the typical **defects and failures** looked for, and the **approach and responsibilities** (who does the testing).

## The five levels, one by one

**1. Component testing** (also known as **[unit testing](https://en.wikipedia.org/wiki/Unit_testing)**) — testing components in isolation: one piece on its own, with everything around it replaced by simple fakes. Because pieces rarely run alone, this level often needs special support such as **[test harnesses](https://istqb-glossary.page/test-harness/)** (scaffolding code that drives the piece and feeds it test data) or unit test frameworks. It is **normally performed by the developers themselves, in their development environments**.

**2. Component integration testing** (also known as unit integration testing) — testing the **interfaces and interactions between components**: do the pieces, each of which may work alone, also work *together*? This level is heavily dependent on the chosen **integration strategy** (see below).

![The five test levels](diagrams/test-levels-pipeline.svg)

**3. System testing** — testing the **overall behaviour and capabilities of the entire system or product**: end-to-end tasks ([functional testing](https://istqb-glossary.page/functional-testing/)) and [quality characteristics](https://istqb-glossary.page/quality-characteristic/) such as how fast or how usable it is ([non-functional testing](https://istqb-glossary.page/non-functional-testing/)). Some non-functional characteristics are best tested on a complete system in a representative environment — you can't meaningfully judge usability on a half-built product. Simulations may stand in for parts that aren't available. System testing **may be performed by an independent test team**, and is related to the **specifications** for the system.

**4. System integration testing** — testing the interfaces between *your* system and **other systems and external services** it must talk to (payment providers, other companies' software, legacy databases). It needs suitable test environments, **preferably similar to the real operational environment**.

**5. Acceptance testing** — focusing on **[validation](https://istqb-glossary.page/validation/)**: demonstrating that the system is ready for deployment and fulfils the **users' business needs**. Ideally it is **performed by the intended users**. Its main forms: **[user acceptance testing](https://en.wikipedia.org/wiki/Acceptance_testing#User_acceptance_testing)** (UAT), **[operational](https://istqb-glossary.page/operational-acceptance-testing/)** acceptance testing (does operations staff — backups, restarts — find it workable?), **[contractual](https://istqb-glossary.page/contractual-acceptance-testing/)** and **[regulatory](https://istqb-glossary.page/regulatory-acceptance-testing/)** acceptance testing (against contracts and laws), and **[alpha testing](https://en.wikipedia.org/wiki/Alpha_test)** and **[beta testing](https://en.wikipedia.org/wiki/Beta_test)** (done at the developing or user site, typically by potential or existing customers before wide release).

## Three ways to order integration

When components are combined for component integration testing, the *order* matters. The syllabus names three strategies:

- **Big-bang** — wait until everything is ready, then combine all components at once. Simple to schedule, but when something fails you have little idea *where* to look.
- **Top-down** — start from the highest-level components (the ones that call the others) and integrate downwards; lower components may be simulated by [stubs](https://istqb-glossary.page/stub/) until they exist.
- **Bottom-up** — start from the lowest-level components and integrate upwards; the higher-level callers may be simulated by [drivers](https://istqb-glossary.page/test-driver/) until they exist.

## In plain terms

- Test levels group test activities that are managed together; they differ in test object, objectives, test basis, typical defects, and who is responsible.
- Component testing: single pieces, by developers, with harnesses. Component integration: the pieces' interfaces, ordered by a strategy (big-bang, top-down, bottom-up).
- System testing: the whole system's behaviour and quality characteristics, often by an independent team. System integration: our system against other systems, in realistic environments.
- Acceptance testing: the users' business needs, ideally by the users themselves — UAT, operational, contractual, regulatory, alpha, beta.

## Check yourself

1. Which two attributes are used to tell test levels apart, and why does that matter?
2. Who normally performs component testing, and what extra support does it often need?
3. Your system must talk to a payment provider operated by another company — which level covers this, and what kind of environment does it need?
4. What distinguishes acceptance testing from system testing in purpose and in testers?
