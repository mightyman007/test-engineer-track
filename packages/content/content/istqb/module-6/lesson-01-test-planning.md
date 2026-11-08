+++
id = "istqb-m6-planning"
module = "istqb-m6-managing"
title = "Test Planning"
minutes = 12
objectives = ["FL-5.1.1", "FL-5.1.2", "FL-5.1.3"]
videos = [
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 44 | Purpose and Context of Test Plan | Test Management | CTFL (TM Square)", url = "https://www.youtube.com/watch?v=akm3S7nofYk" },
  { title = "ISTQB Foundation Level: 5.1.1  Purpose and Content of a Test Plan (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=TOSQxM42x7Y" },
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 45 | Release and Iteration Planning | Test Management | CTFL (TM Square)", url = "https://www.youtube.com/watch?v=J0ooS_5jcWI" },
  { title = "ISTQB Foundation Level: 5.1.2 Tester's Contribution to Iteration and Release Planning (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=4PDP8NPTY6o" },
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 46 | Entry Criteria & Exit Criteria | Test Management | CTFL (TM Square)", url = "https://www.youtube.com/watch?v=K6amWdZhezY" },
  { title = "ISTQB Foundation Level: 5.1.3 Entry Criteria and Exit Criteria (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=6vF3Y9fqJRg" },
]
diagrams = [
  { title = "Inside a test plan: the typical sections and what each one fixes", file = "diagrams/test-plan-scope.svg" },
]
+++

## What a test plan is for (FL-5.1.1)

A [test plan](https://istqb-glossary.page/test-plan/) describes the [test objectives](https://istqb-glossary.page/test-objective/), resources and processes for a test project. The syllabus gives it four jobs:

- It **documents the means and schedule** intended to achieve the test objectives.
- It **helps ensure the performed test activities will meet the established criteria** — the plan is where targets are written down precisely enough to be checked later.
- It **serves as a means of communication** with team members and other stakeholders.
- It **demonstrates that testing will adhere to the existing [test policy](https://istqb-glossary.page/test-policy/) and [test strategy](https://istqb-glossary.page/test-strategy/)** — or explains why the testing will deviate from them.

[Test planning](https://istqb-glossary.page/test-planning/) also has a side effect that experienced managers value more than the document itself: it guides the testers' thinking and **forces the testers to confront the future challenges** related to risks, schedules, people, tools, costs and effort. Writing the plan is a useful way to think through what achieving the objectives will actually take.

One planning habit to unlearn: the plan is not a phase that happens once and dies. Which test activities are included in the [test process](https://istqb-glossary.page/test-process/), how they are implemented, and when they occur are all decided as part of planning — and in iterative development, release planning and iteration planning re-run **every cycle**, with test monitoring and control feeding revisions back into the plan whenever reality deviates (lesson 4 covers that loop). Planning is continuous; the document is just its current snapshot.

## What goes into a test plan (FL-5.1.1)

The typical content of a test plan:

- **Context of testing** — e.g., test scope, test objectives, [test basis](https://istqb-glossary.page/test-basis/)
- **Assumptions and constraints** of the test project
- **Stakeholders** — e.g., roles, responsibilities, relevance to testing, hiring and training needs
- **Communication** — e.g., forms and frequency of communication, documentation templates
- **Risk register** — e.g., product risks, project risks (lesson 3 builds this artifact)
- **[Test approach](https://istqb-glossary.page/test-approach/)** — e.g., test levels, test types, test techniques, test deliverables, [entry criteria](https://istqb-glossary.page/entry-criteria/) and [exit criteria](https://istqb-glossary.page/exit-criteria/), independence of testing, metrics to be collected, test data requirements, test environment requirements, deviations from the test policy and test strategy
- **Budget and schedule**

The ISO/IEC/IEEE 29119-3 standard holds further templates and detail for test plans.

![Inside a test plan: the typical sections and what each one fixes](diagrams/test-plan-scope.svg)

## The tester in release planning and iteration planning (FL-5.1.2)

In iterative SDLCs (module 2), two kinds of planning typically run in parallel — and testers add different value in each:

- **Release planning** looks ahead to the release of a product, defines and **re-defines the product backlog**, and may refine larger [user stories](https://istqb-glossary.page/user-story/) into sets of smaller ones. It is the basis for the test approach and test plan across all iterations. Testers involved here **participate in writing testable user stories and [acceptance criteria](https://istqb-glossary.page/acceptance-criteria/)** (module 5's collaboration techniques), **participate in project and quality risk analyses** (lesson 3), **estimate test effort** associated with user stories (lesson 2), **determine the test approach**, and **plan the testing for the release**.
- **Iteration planning** looks ahead to the end of a single iteration and works on the iteration backlog. Testers involved here **participate in the detailed risk analysis of user stories**, **determine the testability of user stories**, **break down user stories into tasks** (particularly testing tasks), **estimate test effort for all testing tasks**, and **identify and refine functional and non-functional aspects of the test object**.

The split to remember: release planning shapes *what* the testing across the whole release will be; iteration planning turns the current iteration's slice of it into concrete, estimated, risk-analyzed testing tasks.

## Entry criteria and exit criteria (FL-5.1.3)

[Entry criteria](https://istqb-glossary.page/entry-criteria/) define the **preconditions for undertaking a given activity**. If they are not met, the activity is likely to be more difficult, time-consuming, costly and riskier. [Exit criteria](https://istqb-glossary.page/exit-criteria/) define **what must be achieved to declare an activity completed**. Both should be defined for **each test level** (module 2), and they differ based on the test objectives.

Typical **entry criteria**: availability of resources (people, tools, environments, test data, budget, time), availability of testware (test basis, testable requirements, user stories, test cases), and an **initial quality level of the test object** — e.g., all smoke tests have passed.

Typical **exit criteria**: measures of thoroughness (achieved level of coverage, number of unresolved defects, [defect density](https://istqb-glossary.page/defect-density/), number of failed test cases) and binary "yes/no" criteria (planned tests have been executed, static testing has been performed, all defects found are reported, all regression tests are automated).

Two boundary cases the syllabus calls out:

- **Running out of time or budget can also be a valid exit criterion.** Even without other criteria satisfied, ending testing can be acceptable under such circumstances — *if the stakeholders have reviewed and accepted the risk* of going live without further testing. Exit criteria are about explicit, accepted decisions, not about pretending the work finished itself.
- In Agile development, exit criteria are often called the **[Definition of Done](https://istqb-glossary.page/definition-of-done/)** — the team's objective metrics for a releasable item — and the entry criteria a user story must fulfill before development and/or testing start are called the **[Definition of Ready](https://istqb-glossary.page/definition-of-ready/)**.

## In plain terms

- A [test plan](https://istqb-glossary.page/test-plan/) documents test objectives, resources and processes; it fixes the means and schedule, keeps activities aligned with the established criteria, communicates with stakeholders, and shows adherence to test policy and strategy (or explains deviations). Writing it forces the team to confront risks, schedules, people, tools, costs and effort — and it is re-made continuously across release and iteration planning.
- Typical plan content: context, assumptions and constraints, stakeholders, communication, the [risk register](https://glossary.istqb.org/en_US/term/risk-register), the test approach, and budget and schedule (ISO/IEC/IEEE 29119-3 has the templates).
- **Release planning**: testers help write testable user stories and acceptance criteria, join project and quality risk analyses, estimate test effort, determine the test approach, and plan release testing. **Iteration planning**: detailed risk analysis of stories, testability checks, breaking stories into testing tasks, estimating those tasks, refining functional and non-functional aspects.
- **Entry criteria** = preconditions (resources, testware, smoke tests passed); **exit criteria** = what "done" means (thoroughness measures and yes/no criteria) — defined per test level. Out of time or budget is a valid exit criterion when stakeholders accept the residual risk. In Agile: exit criteria ≈ Definition of Done; story entry criteria ≈ Definition of Ready.

## Check yourself

1. Your test plan contains a section explaining why this project will skip the organization's standard scripted technique for one subsystem. Which of the four plan purposes is that section doing, and what would the plan violate if the explanation were missing?
2. A teammate says "release planning and iteration planning are the same meetings with different names." Which two tester contributions belong to *release* planning but not to iteration planning?
3. A build reaches the system-test level with two of its smoke tests failing. Which entry criterion is unmet, and what does the syllabus predict for the activity if testing starts anyway?
4. The project burns its budget with coverage targets unmet. Under what condition can testing still be declared complete, and what Agile term names the opposite kind of criterion (for *starting* work)?
