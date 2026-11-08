+++
id = "istqb-m3-static-basics"
module = "istqb-m3-static"
title = "Static Testing Basics"
minutes = 12
objectives = ["FL-3.1.1", "FL-3.1.3"]
videos = [
  { title = "ISTQB FOUNDATION 4.0 — Tutorial 23: Static Testing Basics | Reviews & Static Analysis | CTFL (TM Square)", url = "https://www.youtube.com/watch?v=6f91vzjEDvg" },
  { title = "ISTQB Foundation Level: 3.1 Static Testing Basics (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=kxTdYOc9_Hg" },
]
diagrams = [
  { title = "Static vs dynamic testing: two routes to defects", file = "diagrams/static-vs-dynamic.svg" },
]
+++

## Testing without running the software (FL-3.1.1)

Everything in the first two modules quietly assumed the same thing: that testing means *running* something. **[Static testing](https://istqb-glossary.page/static-testing/)** breaks that assumption. In static testing the software under test **does not need to be executed** — instead, [work products](https://en.wikipedia.org/wiki/Software_artifact) such as code, process specifications, system architecture specifications or other documents are evaluated either **through manual examination** (that is, [reviews](https://istqb-glossary.page/review/)) or **with the help of a tool** (that is, [static analysis](https://istqb-glossary.page/static-analysis/)).

The [test objectives](https://istqb-glossary.page/test-objective/) of static testing include improving quality, detecting [defects](https://istqb-glossary.page/defect/), and assessing characteristics like **readability, completeness, correctness, testability and consistency**. One more thing that surprises exam candidates: static testing can be applied for **both [verification](https://istqb-glossary.page/verification/) and [validation](https://istqb-glossary.page/validation/)** — it is not just a "check it against the spec" activity.

Static testing is also a team sport. Testers, business representatives (a [Product Owner](https://glossary.istqb.org/en_US/term/product-owner) or business analyst) and developers work together during **example mapping, collaborative [user story](https://glossary.istqb.org/en_US/term/user-story) writing and [backlog refinement](https://glossary.istqb.org/en_US/term/backlog-refinement)** sessions, to make sure user stories meet defined criteria such as the *Definition of Ready* (see section 5.1.3). Review techniques ensure stories are complete, understandable and include testable [acceptance criteria](https://istqb-glossary.page/acceptance-criteria/) — by asking the right questions, testers explore, challenge and help improve the proposed stories.

Static analysis, done by tools, can identify problems **prior to** [dynamic testing](https://istqb-glossary.page/dynamic-testing/) while often requiring **less effort** — no [test cases](https://istqb-glossary.page/test-case/) are required. It is often incorporated into [CI](https://en.wikipedia.org/wiki/CI/CD) frameworks. While it is largely used to detect specific code defects, static analysis also evaluates [maintainability](https://istqb-glossary.page/maintainability/) and security; even spelling checkers and readability tools count as static analysis tools.

## Almost any work product can be examined (FL-3.1.1)

The syllabus is blunt: **almost any work product** can be examined using static testing. Examples include requirement specification documents, [source code](https://en.wikipedia.org/wiki/Source_code), [test plans](https://istqb-glossary.page/test-plan/), test cases, [product backlog](https://glossary.istqb.org/en_US/term/product-backlog) items, [test charters](https://istqb-glossary.page/test-charter/), project documentation, [contracts](https://en.wikipedia.org/wiki/Contract) and models. Yes — the tests themselves (test plans, test cases, test charters) are review candidates too.

Two boundary rules complete the picture:

- **Any work product that can be read and understood can be the subject of a review.** Reviews only need human-readable sense.
- **For static analysis, work products need structure** to check against — such as models, code, or text with a formal syntax. A tool cannot "parse" free-form prose the way a reviewer can.

What is **not** appropriate for static testing? Work products that are difficult for human beings to interpret and that should not be analyzed by tools — the syllabus's example is **third-party executable code**, often excluded for legal reasons.

## Static vs dynamic: two routes to the same defects (FL-3.1.3)

**[Dynamic testing](https://istqb-glossary.page/dynamic-testing/)** and static testing **complement each other**. They share objectives — both support detecting defects in work products — but the syllabus draws five sharp differences:

- Both can lead to defect detection, but **some defect types can only be found by one of them** — neither route covers everything the other can see.
- **Static testing finds defects directly**, while dynamic testing **causes failures** from which the associated defects are determined through subsequent analysis.
- Static testing **more easily detects defects on paths through the code that are rarely executed or hard to reach** with dynamic testing.
- Static testing can be applied to **non-executable work products**; dynamic testing can only be applied to **executable** ones.
- Static testing can measure **quality characteristics that do not depend on executing code** (e.g., maintainability); dynamic testing measures those that do (e.g., [performance efficiency](https://istqb-glossary.page/performance-efficiency/)).

![Static vs dynamic testing: two routes to defects](diagrams/static-vs-dynamic.svg)

Typical defects that are easier and/or cheaper to find through static testing:

- **Defects in requirements** — inconsistencies, ambiguities, contradictions, omissions, inaccuracies, duplications
- **Design defects** — inefficient database structures, poor modularization
- **Certain coding defects** — variables with undefined values, undeclared variables, unreachable or duplicated code, excessive code complexity
- **Deviations from standards** — e.g., missing adherence to naming conventions in coding standards
- **Incorrect interface specifications** — mismatched number, type or order of parameters
- **Specific security vulnerabilities** — e.g., [buffer overflows](https://en.wikipedia.org/wiki/Buffer_overflow)
- **Gaps or inaccuracies in [test basis](https://istqb-glossary.page/test-basis/) coverage** — e.g., missing tests for an acceptance criterion

Notice what is *not* on that list: anything that only misbehaves at runtime — a crash under load, a misaligned button at a particular screen width. Those belong to dynamic testing.

## In plain terms

- Static testing evaluates work products **without executing them** — by reviews (humans) or static analysis (tools) — and serves verification *and* validation.
- Almost any readable work product is fair game for review; static analysis needs structured input (models, code, formal syntax); third-party executable code is usually out of bounds.
- Static testing finds defects **directly**; dynamic testing finds them via **failures**. Some defect types belong to each world exclusively.
- Its sweet spots: defects in requirements and design, dead or duplicated code, standards violations, interface mismatches, certain security vulnerabilities, and coverage gaps in the test basis.

## Check yourself

1. A teammate says "we can't test this contract with the vendor until the system is built." What can you offer instead?
2. Why can static analysis not be run on every document that a review can cover?
3. Name three defect types the syllabus says are easier or cheaper to find by static testing than by executing the code.
4. Why does static testing reach defects on rarely-executed code paths more easily than dynamic testing?
