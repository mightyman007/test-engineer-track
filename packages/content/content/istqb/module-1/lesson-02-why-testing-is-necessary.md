+++
id = "istqb-m1-why-testing"
module = "istqb-m1-fundamentals"
title = "Why Testing Is Necessary"
minutes = 12
objectives = ["FL-1.2.1", "FL-1.2.2", "FL-1.2.3"]
videos = [
  { title = "ISTQB Foundation 4.0 — Tutorial 3: 1.2 Why Testing is Necessary (TM Square)", url = "https://www.youtube.com/watch?v=ZKibwfwgEl8" },
  { title = "Failure, Fault, and Error — Software Development Process (Georgia Tech / Udacity)", url = "https://www.youtube.com/watch?v=k3WYCi9IlsI" },
]
diagrams = [
  { title = "Error, defect, failure: the chain", file = "diagrams/error-defect-failure.svg" },
]
+++

## Testing's contributions to success (FL-1.2.1)

Why is testing necessary? The syllabus answers with a list of concrete contributions that testing makes to any project:

- **Cost-effective [defect](https://istqb-glossary.page/defect/) detection.** Testing finds defects inexpensively, and [debugging](https://en.wikipedia.org/wiki/Debugging) — which is *not* a testing activity — removes them. Testing therefore indirectly raises the quality of everything built afterwards.
- **Evidence for decisions.** Measuring the quality of the [test object](https://istqb-glossary.page/test-object/) at each phase of the [software development lifecycle](https://istqb-glossary.page/software-development-lifecycle/) gives project managers objective input for decisions — including the biggest one, whether to release.
- **Indirect representation of users.** Testers stand in for the users whose needs the product must serve; involving a representative set of real users throughout development is usually too costly and impractical.
- **Compliance.** Testing may be required to meet contractual or legal requirements, or to comply with regulatory standards.
- **Prevention, not just detection.** Reviewing requirements and designs stops defects before they exist, and test results double as feedback on how well the team's processes are working.

## Testing and [quality assurance](https://istqb-glossary.page/quality-assurance/) (FL-1.2.2)

People often use "testing" and "quality assurance (QA)" interchangeably. The syllabus draws a firm line between them:

- **Testing** is a **product-oriented, corrective** approach: it examines the thing being built and finds problems in it. Testing is a major form of **[quality control](https://istqb-glossary.page/quality-control/)** — other forms include formal methods (model checking, proof of correctness), simulation, and prototyping.
- **QA** is a **process-oriented, preventive** approach: it works on how the work is done, trusting that a good process, followed correctly, produces a good product. QA covers both the development and the testing processes, and it is the responsibility of everyone on the project.

The two meet in the results: test results are used in testing to fix defects, and in QA as feedback on how well the development and test processes are performing.

## The chain: [error](https://istqb-glossary.page/error/), [defect](https://istqb-glossary.page/defect/), [failure](https://istqb-glossary.page/failure/), [root cause](https://istqb-glossary.page/root-cause/) (FL-1.2.3)

Software fails for human reasons. The syllabus describes a chain of linked events, and the exam expects you to tell them apart:

- An **error** is a human mistake — a person does something incorrect. Errors happen for many reasons: time pressure, complexity of the [work products](https://en.wikipedia.org/wiki/Software_artifact), processes, infrastructure or interactions, or simply because someone is tired or lacks training.
- A **defect** is the flaw that the error leaves behind in a work product — in documentation such as a requirements specification or a test script, in source code, or in supporting artefacts. "Fault" and "bug" mean the same thing. Defects created early in the lifecycle, if undetected, tend to produce further defects later on.
- A **failure** is what an end user or tester *sees*: the system deviates from its expected delivery, service or result. A crash, a wrong total, a page that never loads. Not every defect causes a failure — some flawed code never runs; some defects only fail in specific circumstances.

Three wrinkles matter for the exam:

- **Failures without code defects.** Errors and defects are not the only causes of failures. Failures can also be caused by environmental conditions — such as when [radiation or electromagnetic fields cause defects in firmware](https://en.wikipedia.org/wiki/Single_event_upset). A radiation-induced bit flip can make even correctly written application code fail in the field.
- **Imperfect testing.** A test that finds no defect even though one exists is a **[false negative](https://istqb-glossary.page/false-negative-result/)** — the most dangerous kind, because it hides the problem. A test that reports a failure when the software actually meets its specification is a **[false positive](https://istqb-glossary.page/false-positive-result/)** — annoying and expensive, but the honest response is to re-check the test before blaming the code.
- **Root causes.** A **root cause** is the fundamental reason a problem occurred — the situation that led to the error in the first place. **[Root cause analysis](https://istqb-glossary.page/root-cause-analysis/)**, typically performed when a failure or defect is found, aims to prevent whole families of future failures by addressing that fundamental reason.

![Error, defect, failure: the chain](diagrams/error-defect-failure.svg)

## In plain terms

- Testing pays for itself: it detects defects cost-effectively, informs release decisions, represents users, and satisfies contracts and regulations.
- Testing is product-oriented and corrective — a major form of quality control. QA is process-oriented and preventive, and everyone owns it.
- Errors are human mistakes; defects are the flaws they leave; failures are what users see; root causes are why the errors happened at all.
