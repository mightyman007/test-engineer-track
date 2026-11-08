+++
id = "istqb-m5-experience-based"
module = "istqb-m5-whitebox"
title = "Experience-Based Test Techniques"
minutes = 12
objectives = ["FL-4.4.1", "FL-4.4.2", "FL-4.4.3"]
videos = [
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 37 | Error Guessing | Experience-Based Techniques Techniques | CTFL (TM Square)", url = "https://www.youtube.com/watch?v=M_fian37Sak" },
  { title = "ISTQB Foundation Level: 4.4.1 Error Guessing (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=pebU3WkYe68" },
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 38 | Exploratory Testing | Experience Based Testing | ISTQB Tutorial (TM Square)", url = "https://www.youtube.com/watch?v=TpmKRcORDqk" },
  { title = "ISTQB Foundation Level: 4.4.2 Exploratory Testing (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=brR4WaEF0u8" },
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 39 | Checklist Based Testing | Test Techniques | ISTQB Tutorial (TM Square)", url = "https://www.youtube.com/watch?v=SdDIU8opT5o" },
  { title = "ISTQB Foundation Level: 4.4.3 Checklist Based Testing (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=xaQC9EWDb8w" },
]
diagrams = [
  { title = "A test charter: target, investigation, timebox — the skeleton of a test session", file = "diagrams/exploratory-charter.svg" },
]
+++

## Testing from experience (FL-4.4.1)

The third family of [test techniques](https://istqb-glossary.page/test-technique/) replaces the systematic counting of partitions, boundaries, tables or graphs with something less tidy and often more lethal: the tester's own head. [Experience-based test techniques](https://istqb-glossary.page/experience-based-test-technique/) use the **knowledge and experience of testers** to design and implement test cases — their effectiveness depends heavily on that skill, and they shine precisely where the systematic families are blind: detecting defects that black-box and white-box techniques miss. They **complement** those families; they do not replace them.

The syllabus teaches three: error guessing, exploratory testing and checklist-based testing.

## Error guessing and fault attacks (FL-4.4.1)

[Error guessing](https://istqb-glossary.page/error-guessing/) anticipates the occurrence of errors, defects and failures based on the tester's knowledge, including:

- **how the application has worked in the past**,
- **the types of errors the developers tend to make** and the defects that result, and
- **the types of failures that have occurred in other, similar applications**.

Where do failures cluster? The syllabus offers a hunting map: **input** (correct input not accepted; parameters wrong or missing), **output** (wrong format, wrong result), **logic** (missing cases, wrong operator), **computation** (incorrect operand, wrong computation), **interfaces** (parameter mismatch, incompatible types), and **data** (incorrect initialization, wrong type).

**Fault attacks** are a way to *implement* error guessing — the disciplined version. The tester creates or acquires a **list of possible errors, defects and failures** (from experience, from defect and failure data, or from common knowledge about why software fails), then designs tests that identify the defects associated with those errors, expose the defects, or cause the failures. The list turns "I have a bad feeling about this input field" into a repeatable set of targeted attacks.

## Exploratory testing (FL-4.4.2)

In [exploratory testing](https://istqb-glossary.page/exploratory-testing/), tests are **simultaneously designed, executed and evaluated while the tester learns about the test object** — learning, exploring more deeply with focused tests, and creating tests for untested areas happen in the same motion. That triple duty is the defining property: there is no separate test design phase to finish before execution starts.

Exploratory testing is often structured with **session-based testing**: the testing happens inside a defined **time box**, guided by a [test charter](https://istqb-glossary.page/test-charter/) containing the test objectives (which may be treated as high-level test conditions). Coverage items are identified and exercised *during* the session; the tester may use test session sheets to document the steps followed and the discoveries made; and the session is usually followed by a **debriefing** — a discussion between the tester and the stakeholders interested in the session's results.

![A test charter: target, investigation, timebox — the skeleton of a test session](diagrams/exploratory-charter.svg)

When is it useful? When **specifications are few or inadequate**, when **time pressure** is significant, and as a **complement** to other, more formal techniques. Exploratory testing can even incorporate other test techniques — an exploratory session may well run equivalence partitions as it goes. Its effectiveness rises with the tester's experience, [domain knowledge](https://en.wikipedia.org/wiki/Domain_knowledge), and essential skills like analytical thinking, curiosity and creativity.

## Checklist-based testing (FL-4.4.3)

In [checklist-based testing](https://istqb-glossary.page/checklist-based-testing/), the tester designs, implements and executes tests to cover **test conditions from a checklist**. Checklists are built from experience, knowledge about what is important to the user, or an understanding of why and how software fails — and they can support functional and non-functional testing alike (the syllabus cites Nielsen's usability heuristics as an example).

Checklists come with composition rules, and the negative ones are exam favorites. A checklist **should not** contain:

- items that **can be checked automatically** (automate those instead),
- items better suited as [entry criteria](https://istqb-glossary.page/entry-criteria/) or [exit criteria](https://istqb-glossary.page/exit-criteria/), or
- items that are **too general**.

Checklist items are often phrased as a **question**, and it should be possible to check each item **separately and directly**; items may refer to requirements, graphical interface properties, quality characteristics or other test conditions.

Checklists age: as developers learn to avoid old mistakes, some entries gradually become **less effective**; new entries are needed for newly found high-severity defects. So checklists should be **regularly updated based on defect analysis** — while taking care **not to let them become too long**.

## High-level or detailed — and when to reach for experience

In the absence of detailed test cases, checklist-based testing provides **guidelines and some degree of consistency**. The granularity matters: if the checklists are **high-level**, some variability in the actual testing is likely — potentially **greater coverage, but less repeatability**. Detailed checklists trade that freedom for predictability.

The same trade-off frames the whole family. Reach for experience-based techniques when the test basis is thin, time is short, or you want attacks the systematic families cannot generate — and remember the standing limits: effectiveness rests on the tester's skill, and the absence of a systematic procedure makes coverage harder to argue after the fact. Mature test suites run both: systematic techniques for measurability, experience-based ones for what the measures miss.

## In plain terms

- Experience-based techniques draw on the **tester's knowledge and experience**; they depend heavily on tester skill and **complement** the systematic families, catching defects those families miss.
- **Error guessing** anticipates errors from past behavior, developer error types and similar applications' failures; **fault attacks** implement it as a list of possible errors → targeted tests. Failure clusters: input, output, logic, computation, interfaces, data.
- **Exploratory testing** designs, executes and evaluates tests **simultaneously while learning**; **session-based testing** structures it with a time box, a charter of test objectives, session sheets and a debrief; most useful with thin specifications, time pressure, or as a complement to formal techniques.
- **Checklist-based testing** covers test conditions from a checklist: items phrased as questions, separately and directly checkable, never automatable/entry-exit/too-general; updated regularly from defect analysis without growing too long; high-level checklists buy coverage at the price of repeatability.

## Check yourself

1. Your team's defect database shows the previous release's worst bugs were all in date parsing. How would error guessing — and specifically a fault attack — turn that history into next release's tests?
2. Why is "simultaneously designed, executed and evaluated while learning" the sentence that separates exploratory testing from every technique in module 4?
3. A checklist item reads: "the build passes continuous integration." Which checklist rule does it break?
4. Two testers receive the same high-level usability checklist. Why might their sessions differ noticeably — and what property of high-level checklists predicts exactly that?
