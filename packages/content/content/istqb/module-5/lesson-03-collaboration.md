+++
id = "istqb-m5-collaboration"
module = "istqb-m5-whitebox"
title = "Collaboration-Based Test Approaches"
minutes = 12
objectives = ["FL-4.5.1", "FL-4.5.2", "FL-4.5.3"]
videos = [
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 40 | Collaborative User Story Writing | Agile Method | CTFL Tutorial (TM Square)", url = "https://www.youtube.com/watch?v=gMYUeRvUELo" },
  { title = "ISTQB Foundation Level: 4.5.1 Collaborative User Story Writing (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=TuktIZLK_TY" },
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 41 | Acceptance Criteria | Test Design Techniques | CTFL Tutorials (TM Square)", url = "https://www.youtube.com/watch?v=WM-rOg7YbQw" },
  { title = "ISTQB Foundation Level: 4.5.2 Acceptance Criteria (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=4jKY-e2Yx_k" },
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 42 | Acceptance Test Driven Development | Test Design Techniques (TM Square)", url = "https://www.youtube.com/watch?v=fr5fK4jZ934" },
  { title = "ISTQB Foundation Level: 4.5.3 Acceptance Test driven Development (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=fPY3-t1Hls0" },
]
diagrams = [
  { title = "From three-amigos conversation to living documentation: the BDD pipeline", file = "diagrams/bdd-gwt-flow.svg" },
]
+++

## Avoiding defects together (FL-4.5.1)

Every technique in sections 4.2–4.4 aims at **defect detection** — finding defects that already exist. The syllabus's final category changes the goal: [collaboration-based test approaches](https://glossary.istqb.org/en_US/term/collaboration-based-test-approach) also focus on **defect avoidance through collaboration and communication**. If business, development and testing perspectives shape a requirement together, the misunderstandings that would later become defects (especially **defects of omission** — requirements nobody implemented, which you met in white-box testing's blind spot) are caught before any code exists.

## User stories and the 3 C's (FL-4.5.1)

A [user story](https://istqb-glossary.page/user-story/) represents a feature that will be valuable to a user or purchaser of the system. Its three critical aspects — the **"3 C's"** — are:

- **Card** — the medium describing the user story (an index card, an entry on an electronic board),
- **Conversation** — explains how the software will be used (documented or verbal), and
- **Confirmation** — the acceptance criteria.

The most common format: *"As a [role], I want [goal to be accomplished], so that I can [resulting business value for the role]"*, followed by the acceptance criteria. Authorship should be **collaborative** — techniques such as brainstorming and mind mapping — so the team gains a **shared vision of what should be delivered**, taking into account **three perspectives: business, development and testing**.

Good user stories are **Independent, Negotiable, Valuable, Estimable, Small and Testable** (**INVEST**). And the syllabus offers a practical sniff test: if a stakeholder **does not know how to test** a user story, that may mean the story is **not clear enough**, does not reflect something **valuable** to them — or they just need help testing it.

## Acceptance criteria (FL-4.5.2)

[Acceptance criteria](https://istqb-glossary.page/acceptance-criteria/) are the **conditions that an implementation of the user story must meet to be accepted by stakeholders** — which is why they can be viewed as the [test conditions](https://istqb-glossary.page/test-condition/) the tests should exercise. They usually result from the Conversation. Their jobs:

- **define the scope** of the user story,
- **reach consensus** among stakeholders,
- **describe both positive and negative scenarios**,
- **serve as the basis for user story acceptance testing**, and
- **allow accurate planning and estimation**.

There are several ways to write them; the two most common formats are:

- **Scenario-oriented** — e.g. the **Given/When/Then** format used in BDD (next section), and
- **Rule-oriented** — e.g. a bullet-point verification list, or a tabulated input→output mapping.

Most acceptance criteria fit one of these two; a team may also use a **custom format, as long as the acceptance criteria are well-defined and unambiguous**.

## BDD: behavior as the shared language (FL-4.5.2)

[Behavior-driven development](https://istqb-glossary.page/behavior-driven-development/) (BDD) expresses the desired behavior of an application with **test cases written in a simple form of natural language, easy for stakeholders to understand — usually in the Given/When/Then format** — and those test cases **should then automatically be translated into executable tests**. Given sets the scene (preconditions), When performs the action under discussion, Then asserts the expected outcome. Because the scenarios are written in plain language that developers, testers and business stakeholders all read the same way, the format itself becomes a shared vocabulary — the wider BDD movement calls this a *ubiquitous language* — and the executable suite that results describes the system's behavior so well that it doubles as *living documentation* (both terms come from the broader BDD literature, beyond the CTFL syllabus).

![From three-amigos conversation to living documentation: the BDD pipeline](diagrams/bdd-gwt-flow.svg)

The collaboration pattern behind it is the **"three amigos"** conversation — business, development and testing perspectives resolving one story's behavior together — which produces the scenario, which becomes the executable test, which stays behind as documentation that cannot go stale without a test failing. (Like *ubiquitous language* and *living documentation*, "three amigos" comes from the broader BDD literature — beyond the CTFL syllabus vocabulary.)

## ATDD: tests before code (FL-4.5.3)

[Acceptance test-driven development](https://istqb-glossary.page/acceptance-test-driven-development/) (ATDD) is a [test-first approach](https://istqb-glossary.page/test-first-approach/): **test cases are created prior to implementing the user story** — they *are* the specification the code must satisfy. The test cases are created by team members with **different perspectives** (customers, developers, testers) and may be executed manually or automated.

The first step is a **specification workshop**, where the user story and (if not yet defined) its acceptance criteria are analyzed, discussed and written by the team members — **incompleteness, ambiguities and defects in the user story are resolved during this process**. Then the test cases are created, by the team as a whole or by a tester individually, **based on the acceptance criteria** and readable as **examples of how the software works** (examples and tests are the same thing here — the terms are used interchangeably). During this test design, any technique from sections 4.2–4.4 may be applied.

The syllabus's ordering guidance: **first the positive test cases**, confirming correct behavior without exceptions or error conditions; **then negative testing**; **finally** cover **non-functional quality characteristics** (e.g. performance efficiency, usability). Test cases should be expressed so **stakeholders understand them** — natural-language sentences involving the necessary **preconditions, inputs and postconditions**.

Two discipline rules: the test cases **must cover all the characteristics of the user story and should not go beyond it** (the acceptance criteria may detail issues from the story), and **no two test cases should describe the same characteristics**. When the test cases are captured in a format supported by a test automation framework, developers automate them while implementing the feature — and the acceptance tests become **executable requirements**.

## In plain terms

- Collaboration-based approaches aim at **defect avoidance** through collaboration and communication — business, development and testing shaping requirements together.
- **User stories**: Card/Conversation/**Confirmation** (the 3 C's); "As a [role], I want [goal], so that [business value]"; collaborative authorship builds a shared vision; **INVEST** qualities; a stakeholder who cannot test a story is a warning light.
- **Acceptance criteria**: conditions an implementation must meet to be accepted = the test conditions; used to scope the story, reach consensus, cover positive *and* negative scenarios, drive acceptance testing, and enable planning; written **scenario-oriented** (Given/When/Then) or **rule-oriented** (bullets, input→output tables) — or a custom format if well-defined and unambiguous.
- **BDD**: plain-language Given/When/Then scenarios that are automatically translated into executable tests.
- **ATDD**: tests **before** code, born in a specification workshop; positive → negative → non-functional; understandable natural language with preconditions, inputs, postconditions; cover everything in the story, nothing beyond it, no duplicates; automated where the framework allows → **executable requirements**.

## Check yourself

1. A user story reads: "As a logged-in customer, I want to reset my password, so that I can regain access to my account." Identify the three C's in it, and name the aspect that turns it from documentation into a test basis.
2. Write one scenario-oriented and one rule-oriented acceptance criterion for "transfer between own accounts is only allowed when the target account is verified." Which format would you pick to feed an automation framework, and why?
3. In ATDD, why does the specification workshop count as testing activity even though no test case exists yet?
4. A team writes four acceptance tests for one user story; two of them exercise the same characteristic. Which syllabus rule do they break, and what does the rule buy them?
