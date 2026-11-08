+++
id = "istqb-m2-sdlc-context"
module = "istqb-m2-sdlc"
title = "Testing in the Software Development Lifecycle"
minutes = 14
objectives = ["FL-2.1.1", "FL-2.1.2", "FL-2.1.3", "FL-2.1.4", "FL-2.1.5", "FL-2.1.6"]
videos = [
  { title = "ISTQB Foundation 4.0 — Tutorial 10: 2.1 Impact of SDLC on Testing | Good Practices of Testing (TM Square)", url = "https://www.youtube.com/watch?v=BYquNJp0zRU" },
  { title = "ISTQB Foundation 4.0 — Tutorial 12: Shift Left Approach | Retrospective and Process Improvement (TM Square)", url = "https://www.youtube.com/watch?v=Pb5YIZTtlqo" },
]
diagrams = [
  { title = "Three kinds of lifecycle and shift left", file = "diagrams/sdlc-models-comparison.svg" },
]
+++

## Why the way software is built changes how it is tested (FL-2.1.1)

Software is never built in a vacuum — it is built by following some plan for the order of work. That plan is called a **[software development lifecycle](https://glossary.istqb.org/en_US/term/software-development-lifecycle)** (SDLC): a high-level description of which phases of work happen, and in what relationship to each other. An **SDLC model** is an abstract representation of such a plan.

The three families you must know for the exam:

- **Sequential models** — phases follow one another, each finished before the next begins. Examples: the [waterfall model](https://en.wikipedia.org/wiki/Waterfall_model) and the [V-model](https://en.wikipedia.org/wiki/V-model_(software_development)). Here testers typically join *early* activities — reviewing requirements, doing [test analysis](https://istqb-glossary.page/test-analysis/) and [test design](https://istqb-glossary.page/test-design/) — but because code only appears late, **[dynamic testing](https://istqb-glossary.page/dynamic-testing/)** (actually running the software) cannot happen early.
- **Iterative and incremental models** — the product is built in cycles, each producing a working piece. Examples: the [spiral model](https://en.wikipedia.org/wiki/Spiral_model), [prototyping](https://en.wikipedia.org/wiki/Prototyping#Software_prototyping), and the [Unified Process](https://en.wikipedia.org/wiki/Unified_Process). Here *both* [static testing](https://istqb-glossary.page/static-testing/) and dynamic testing can happen at every [test level](https://istqb-glossary.page/test-level/) in every iteration — and frequent delivery demands fast feedback and extensive [regression testing](https://istqb-glossary.page/regression-testing/).
- **Agile ways of working** — for example [Scrum](https://en.wikipedia.org/wiki/Scrum_(software_development)), [Kanban](https://en.wikipedia.org/wiki/Kanban_(development)), or [Extreme Programming](https://en.wikipedia.org/wiki/Extreme_programming). Agile assumes **change can happen at any time**, so teams favour lightweight [work product](https://en.wikipedia.org/wiki/Software_artifact) documentation and extensive [test automation](https://istqb-glossary.page/test-automation/) to keep regression testing affordable. Much manual testing is experience-based, without lengthy upfront analysis.

(There are also more detailed **development methods and practices** — ATDD, BDD, DDD, XP, FDD, Kanban, Lean IT, Scrum, TDD — which we meet in the next sections.)

![Three kinds of lifecycle and shift left](diagrams/sdlc-models-comparison.svg)

Why does the model matter to testers? The syllabus says testing **must be adapted to the SDLC to succeed**, and the choice of model changes:

- the **scope and timing** of test activities (which test levels and [test types](https://istqb-glossary.page/test-type/) get used, and when);
- the **level of detail** of test documentation;
- the **choice of test techniques** and the overall test approach;
- the **extent of test automation**;
- the **role and responsibilities** of a tester.

## Good practices that work in every lifecycle (FL-2.1.2)

Whatever the model, some practices are always right. The syllabus lists four — memorize them, they are prime K1 exam material:

1. **For every development activity there is a corresponding test activity**, so that everything produced gets quality control — requirements are reviewed, designs are reviewed, code is tested.
2. **Each test level has its own specific objectives** (see the next lesson), so testing is comprehensive *without* everybody re-doing the same checks redundantly.
3. **Test analysis and design for a level begin during the corresponding development phase** — test work for a phase starts while that phase is happening, honouring the *early testing* principle.
4. **Testers review work products as soon as drafts exist**, so defects are found as early as possible — supporting shift left.

## Writing the tests first: TDD, ATDD, BDD (FL-2.1.3)

Some approaches go further than "test early" — they write the **tests before the code**. The syllabus names three; be able to recall which is which:

- **[Test-driven development](https://istqb-glossary.page/test-driven-development/) (TDD)**: directs the coding through test cases. A test is written first, then just enough code to satisfy it, then both are refactored (restructured cleanly).
- **[Acceptance test-driven development](https://istqb-glossary.page/acceptance-test-driven-development/) (ATDD)**: derives tests from **[acceptance criteria](https://istqb-glossary.page/acceptance-criteria/)** (the conditions a feature must meet to be accepted by the business) as part of designing the system.
- **[Behavior-driven development](https://istqb-glossary.page/behavior-driven-development/) (BDD)**: expresses the desired behaviour as test cases in a simple, readable form of natural language — usually the *Given / When / Then* format — which stakeholders can understand, and which is then translated into automated tests.

All three implement the early-testing principle and follow shift left, because the tests exist before the code does.

## When testing meets operations: DevOps (FL-2.1.4)

**[DevOps](https://glossary.istqb.org/en_US/term/devops)** is an organizational approach that gets development (including testing) and operations — the people who run live systems — working together toward common goals. Its technical heart is the **[delivery pipeline](https://glossary.istqb.org/en_US/term/delivery-pipeline)**: a chain of automated steps (a **[CI/CD](https://en.wikipedia.org/wiki/CI/CD)** pipeline — continuous integration, continuous delivery) that builds, tests and releases code changes quickly.

From the testing perspective, the syllabus highlights real benefits: fast feedback on whether a change broke something, automated regression testing that reduces the risk of regressions, better visibility of non-functional [quality characteristics](https://istqb-glossary.page/quality-characteristic/), and less repetitive manual testing. But DevOps is not free: someone must define and maintain the pipeline and its CI/CD tools, and test automation takes real effort to establish and keep running. And even in a highly automated pipeline, **manual testing — especially from the user's perspective — is still needed**.

## Shift left (FL-2.1.5)

The early-testing principle has a nickname: **[shift left](https://glossary.istqb.org/en_US/term/shift-left)**. Picture the project as a left-to-right timeline; "shift left" means moving test activities *earlier* on that timeline — not waiting for code, or even for components to be integrated. Crucially, it does **not** mean neglecting the testing that happens later — later testing still matters.

Good practices that illustrate shift left:

- **Reviewing specifications from the testers' perspective** — reviews of requirements often catch ambiguities, incompleteness and inconsistencies before any code exists.
- **Writing test cases before the code is written**, and running the code in a [test harness](https://istqb-glossary.page/test-harness/) during implementation.
- **Using CI, and better still CD**, so every code submission gets fast, automated feedback.
- **Performing [static analysis](https://istqb-glossary.page/static-analysis/) of the source code before dynamic testing** (or as part of an automated process).
- **Starting [non-functional testing](https://istqb-glossary.page/non-functional-testing/) (for example performance checks) at component level**, where possible, instead of waiting for a complete system in a representative environment.

Shift left may cost extra training, effort or money *early* — the expectation is that it **saves effort and cost later**, because defects are cheapest when found early. One practical condition: the stakeholders must be convinced and bought into the idea.

## Retrospectives: improving the process itself (FL-2.1.6)

A **[retrospective](https://glossary.istqb.org/en_US/term/retrospective)** is a meeting held at the end of a project or iteration (or whenever needed, depending on the lifecycle) where the participants — not only testers, but also developers, architects, the product owner, business analysts — discuss three questions: what worked and should be kept, what didn't and could be improved, and how to make improvements stick. Results are recorded and normally become part of the test completion report.

For testing, typical benefits include more effective and efficient testing, better-quality [testware](https://istqb-glossary.page/testware/), team bonding and learning, a better test basis (requirements improve when their deficiencies are addressed), and better cooperation between development and testing. A retrospective only matters if its recommended improvements are actually followed up.

## In plain terms

- The lifecycle model a team follows shapes the scope, timing, documentation, techniques, automation and roles of testing.
- Four good practices hold in every lifecycle: a test activity for every development activity, distinct objectives per level, early test analysis and design, and early reviewer involvement.
- TDD, ATDD and BDD all write tests before code; they differ in where the tests come from.
- DevOps connects development and operations with automated pipelines — fast feedback, but real setup and maintenance effort.
- Shift left moves testing earlier without cancelling it later; retrospectives make the process itself improve.

## Check yourself

1. In a waterfall project, which testing work can testers do early — and which must wait?
2. Name the four good testing practices that apply regardless of lifecycle model.
3. Which of TDD, ATDD and BDD is driven by acceptance criteria, and which uses Given/When/Then?
4. Why does shift left usually cost more early and save money later?
