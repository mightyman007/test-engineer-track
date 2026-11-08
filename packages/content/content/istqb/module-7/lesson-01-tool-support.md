+++
id = "istqb-m7-tool-support"
module = "istqb-m7-tools"
title = "Tool Support for Testing"
minutes = 10
objectives = ["FL-6.1.1"]
videos = [
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 57 | Tool Support for Testing | Test Tools | CTFL (TM Square)", url = "https://www.youtube.com/watch?v=fT1aY0xKrbo" },
  { title = "ISTQB Foundation Level: 6.1 Tool Support for Testing (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=QmEGxfZXbQM" },
]
diagrams = [
  { title = "The test tool landscape: tool families mapped onto the test-process activities", file = "diagrams/tool-landscape.svg" },
]
+++

## How test tools support testing (FL-6.1.1)

A [test tool](https://istqb-glossary.page/test-tool/) is a software product that supports one or more test activities — planning and control, specification, building initial files and data, test execution and test analysis. [Test tools](https://istqb-glossary.page/test-tool/) **support and facilitate** many test activities; they do not replace them. The syllabus's examples, mapped onto the [test process](https://istqb-glossary.page/test-process/) activities from Module 1:

- **[Test management](https://istqb-glossary.page/test-management/) tools** — increase test process efficiency by facilitating management of the SDLC, [requirements](https://istqb-glossary.page/requirement/), tests, defects and configuration. They track the artifacts and their status across **planning, monitoring and control, and completion** (Module 6's registers, reports and baselines usually live in one).
- **Static testing tools** — support the tester in performing **reviews and [static analysis](https://istqb-glossary.page/static-analysis/)**: checking code and work products *without executing them* (coding-standard violations, unreachable branches, duplicated code — Module 3's static side, at tool speed).
- **Test design and test implementation tools** — facilitate generation of **test cases, test data and test procedures**. The data-generation case is where humans stop being able to keep up: a pricing engine with dozens of rules needs thousands of combinations that no analyst will type by hand. Some of these tools derive tests **from a model** of the system (model-based test design), others generate test data or scaffold test procedures.
- **Test execution and test coverage tools** — facilitate **automated test execution and coverage measurement**: running suites unattended, comparing expected results vs actual results, logging outcomes, and measuring how much of the code the tests exercise.
- **Non-functional testing tools** — allow the tester to perform non-functional testing that is **difficult or impossible to perform manually** — e.g., 5,000 concurrent users for a [load test](https://istqb-glossary.page/load-testing/), or memory-usage profiling. No amount of human clicking produces that load.
- **DevOps tools** — support the DevOps delivery pipeline, workflow tracking, automated build processes and **CI/CD**: every commit can trigger a build and an automated test run, which is what makes regression testing at every change economically possible (Module 2's DevOps delivery pipeline).
- **Collaboration tools** — facilitate **communication** among the team and its stakeholders.
- **Tools supporting scalability and deployment standardization** — e.g., virtual machines and containerization tools, which give testing reproducible, scalable **[test environments](https://istqb-glossary.page/test-environment/)**.
- **Any other tool that assists in testing** — the syllabus's own boundary-case example: **a spreadsheet is a test tool in the context of testing**. "Tool" is a functional category, not a price bracket.

![The test tool landscape: tool families mapped onto the test-process activities](diagrams/tool-landscape.svg)

The mapping matters more than the labels: when a team feels a need ("we re-test too much by hand", "we can't generate this data", "we can't see status"), the need names an **activity**, and the activity names a **tool family** — that is the whole classification skill this chapter asks for (FL-6.1.1).

## What tools cannot do (FL-6.1.1)

The syllabus states the limit in chapter 1 and repeats it here: **testing is largely an intellectual activity**, requiring specialized knowledge, analytical skill, critical thinking and systems thinking. Tools amplify an approach; they don't create one. Concretely, tools cannot:

- **Replace test design thinking.** A tool can generate thousands of test cases and still test the wrong things — deciding *what to test, with what coverage* (Modules 4–5) stays human. This is the classic automation failure (lesson 2 makes it a named risk).
- **Guarantee quality.** Simply acquiring a tool does not improve anything by itself; benefits arrive only with effort (lesson 2's risks). A tool that faithfully executes a weak suite automates weakness.
- **Do work that manual testing does better.** One-off checks, exploratory [test charters](https://istqb-glossary.page/test-charter/), usability judgment and early prototypes often move faster without automation — automating them is a named risk, not a discipline.

## In plain terms

- A [test tool](https://istqb-glossary.page/test-tool/) is any software that supports a test activity — the syllabus lists nine example families: test management, static testing, test design and test implementation (test cases, test data, test procedures), test execution and test coverage (execution, comparison, logging, coverage), non-functional testing (the hard-to-do-manually work), DevOps (pipeline, CI/CD, builds), collaboration (communication), scalability/deployment standardization (VMs, containers), and "any other tool" — a spreadsheet counts.
- Read needs → activities → tool families: the need "we re-test too much by hand" is an execution need; "we can't produce this much data" is a design-and-implementation need; "code violations keep slipping through" is a static-analysis need.
- Tools cannot replace test-design thinking, cannot guarantee quality, and cannot outperform manual testing where human judgment is the point — testing remains a largely intellectual activity.

## Check yourself

1. A teammate proposes buying a test-execution tool so the team no longer has to think about which regression tests matter. Which statement from "What tools cannot do" does that proposal violate, and what would the tool actually do for the regression suite?
2. For each need, name the supporting tool family: (a) re-running 800 regression tests unattended each release; (b) simulating 5,000 concurrent users; (c) one place to track requirements, tests, defects and configuration; (d) failing the build when a coding-standard checker reports violations.
3. Why does the syllabus count a spreadsheet among test tools, and what classification error does that example prevent?
4. A vendor demo shows a tool deriving test cases from a model of the system. Which tool family is that, and which human activity does it accelerate rather than replace?
