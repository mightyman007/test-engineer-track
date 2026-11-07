+++
id = "istqb-m1-why-testing"
module = "istqb-m1-fundamentals"
title = "Why Testing Is Necessary"
minutes = 12
objectives = ["FL-1.2.1", "FL-1.2.2", "FL-1.2.3", "FL-1.2.4"]
videos = [
  { title = "ISTQB Foundation 4.0 — Tutorial 3: 1.2 Why Testing is Necessary (TM Square)", url = "https://www.youtube.com/watch?v=ZKibwfwgEl8" },
  { title = "Failure, Fault, and Error — Software Development Process (Georgia Tech / Udacity)", url = "https://www.youtube.com/watch?v=k3WYCi9IlsI" },
]
diagrams = [
  { title = "Error, defect, failure: the chain", file = "diagrams/error-defect-failure.svg" },
]
+++

## The chain: [error](https://istqb-glossary.page/error/), [defect](https://istqb-glossary.page/defect/), [failure](https://istqb-glossary.page/failure/) (FL-1.2.1)

Software fails for human reasons. The syllabus describes a chain of three linked events, and the exam expects you to tell them apart:

- An **error** is a human mistake — a person does something incorrect. A developer types the wrong condition, an analyst writes an ambiguous requirement. Errors happen under time pressure, fatigue, inexperience, distraction, or simply because the problem itself is complicated.
- A **defect** is the flaw that the error leaves behind in a work product — usually code, but also documents and other artefacts. "Bug" and "fault" mean the same thing. The defect sits there quietly until the flawed part is used.
- A **failure** is what an end user or tester *sees*: the system deviates from its expected delivery, service or result. A crash, a wrong total, a page that never loads.

The chain runs **error → defect → failure**, and each link is conditional. Not every error produces a defect (a typo might be caught before saving), and not every defect produces a failure — some flawed code paths are never executed, or the mistake is masked by other code. That is why "we tested it and it worked" never means "it is defect-free".

Two wrinkles matter for the exam:

- **Failures without defects.** The environment can cause failures on its own: [radiation](https://en.wikipedia.org/wiki/Radiation_hardening), electromagnetic fields, pollution, overheating hardware. A system can crash with a perfectly correct program inside it.
- **Imperfect testing.** A test that finds no defect even though one exists is a **[false negative](https://istqb-glossary.page/false-negative-result/)** — the most dangerous kind, because it hides the problem. A test that reports a failure when the software actually meets its specification is a **[false positive](https://istqb-glossary.page/false-positive-result/)** — annoying and expensive, but the honest work is to re-check the test before blaming the code.

![Error, defect, failure: the chain](diagrams/error-defect-failure.svg)

**[Root cause](https://istqb-glossary.page/root-cause/)** analysis asks the final question: what process or condition produced the error in the first place? Removing the root cause — better training, clearer requirements, review checklists — prevents whole families of future defects, not just this one.

## How much testing is enough? (FL-1.2.2)

There is no fixed answer, because **testing is context dependent**. The level of rigour — how much testing, how formal, how documented — depends on the circumstances of the project:

- **Risk.** A failure in a heart monitor or a flight-control system can hurt people; a failure in a puzzle game annoys someone. Safety and money raise the bar.
- **Project and product constraints** — deadlines, budget, team experience, the maturity of the requirements.
- **Domain and regulation.** Medical, aviation, banking and similar domains carry legal obligations that force specific, documented levels of testing.

So a two-person startup testing a marketing site and a bank testing a payment engine should test *differently* — not because one team is lazy, but because the consequences of failure differ. Rigour is a decision, and it should be a deliberate one.

## The human mind: [bias](https://en.wikipedia.org/wiki/Cognitive_bias) and [heuristics](https://en.wikipedia.org/wiki/Heuristic) (FL-1.2.3)

Testing is done by people, and people have predictable blind spots. The syllabus highlights two ideas:

- **Cognitive biases** — systematic errors in how we judge things. The classic in testing is **[confirmation bias](https://en.wikipedia.org/wiki/Confirmation_bias)**: we look for evidence that supports what we already believe. A developer convinced their code is correct writes tests that confirm it works — and never probes the edges where it breaks. Good testers deliberately hunt for disconfirming evidence.
- **Heuristics** — practical rules of thumb that guide decisions without guaranteeing the best answer. "Start testing as early as possible" and "focus on high-risk areas first" are heuristics: usually right, occasionally wrong, always worth having.

Biases and heuristics explain why two competent testers find different defects, and why independent eyes (Lesson 5) add value.

## Other ways testing helps (FL-1.2.4)

Finding failures is only the headline. Testing also contributes in quieter ways:

- **It feeds decisions.** Test results give managers objective evidence for go/no-go decisions and for judging risk of inadequate quality.
- **It prevents defects.** Testers reviewing requirements and designs catch problems before they become expensive code.
- **It smooths the flow of work.** When testing happens continuously alongside development (as in agile teams), problems surface while they are still small, and rework shrinks.
- **It represents the user.** Testers act as a stand-in for users' needs and expectations, asking "would a real person succeed with this?"
- **It confirms compliance** with contractual, legal and regulatory requirements.

And to place testing inside the bigger quality picture: **[quality assurance](https://istqb-glossary.page/quality-assurance/)** aims to *prevent* defects by improving processes, while **[quality control](https://istqb-glossary.page/quality-control/)** — which includes testing — aims to *detect* problems in the product itself. Testing is a product-oriented activity that QA relies on; QA is the broader, process-oriented discipline.

## In plain terms

- Errors are human mistakes; defects are the flaws they leave; failures are what users see.
- Not every defect fails, and some failures have no defect behind them (environment).
- Rigour follows context: risk, constraints, domain and regulation decide how much testing is enough.
- Confirmation bias lurks in every team; heuristics are the practical rules that keep testing sensible.
- Testing also prevents defects, informs decisions, represents users, and supports compliance.
