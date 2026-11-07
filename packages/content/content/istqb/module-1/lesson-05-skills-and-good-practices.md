+++
id = "istqb-m1-skills-practices"
module = "istqb-m1-fundamentals"
title = "Tester Skills and Good Practices"
minutes = 10
objectives = ["FL-1.5.1", "FL-1.5.2", "FL-1.5.3"]
videos = [
  { title = "ISTQB Foundation 4.0 — Tutorial 7: 1.5 Essential Skills and Practices in Testing, Part 1 (TM Square)", url = "https://www.youtube.com/watch?v=Uj9fPT3XpWk" },
  { title = "ISTQB Foundation 4.0 — Tutorial 8: 1.5 Essential Skills and Practices in Testing, Part 2 (TM Square)", url = "https://www.youtube.com/watch?v=4bEMglp8Wvk" },
]
diagrams = [
  { title = "Test levels and test types", file = "diagrams/test-levels-types.svg" },
]
+++

## The skills good testers bring (FL-1.5.1)

A **skill** is the ability to do something well, built from knowledge, practice and aptitude. The syllabus names the generic skills that make testers effective — classic exam material, so learn them as a list:

- **Testing knowledge** — knowing how to test well, for example by applying [test techniques](https://istqb-glossary.page/test-technique/) to increase the effectiveness of testing.
- **Thoroughness, carefulness, curiosity, attention to detail, and being methodical** — the disciplined habits that identify defects, especially the ones that are difficult to find.
- **Good communication skills, [active listening](https://en.wikipedia.org/wiki/Active_listening), and being a team player** — testers write and speak constantly: [defect reports](https://istqb-glossary.page/defect-report/), test summaries, conversations with developers and stakeholders. A defect report a developer can act on immediately is worth ten vague ones; listening closely is how misunderstandings are caught early.
- **[Analytical thinking](https://en.wikipedia.org/wiki/Analytical_skill), [critical thinking](https://en.wikipedia.org/wiki/Critical_thinking), and [creativity](https://en.wikipedia.org/wiki/Creativity)** — questioning assumptions, weighing evidence, and inventing scenarios nobody documented.
- **Technical knowledge** — understanding the system, its [architecture](https://en.wikipedia.org/wiki/Software_architecture) and its tools well enough to test it meaningfully (you do not need to be a full-time programmer, but you need to speak the language).
- **[Domain knowledge](https://en.wikipedia.org/wiki/Domain_knowledge)** — understanding the business the software serves, so you can understand and communicate with end users and business representatives about what matters.

## The human factor: [bias](https://en.wikipedia.org/wiki/Cognitive_bias) (FL-1.5.1)

Testing is done by people, and people have predictable blind spots — the syllabus itself makes this point in its discussion of skills and psychology.

- **[Cognitive biases](https://en.wikipedia.org/wiki/Cognitive_bias)** are systematic errors in how we judge things. Testers are often the bearers of bad news, and **[confirmation bias](https://en.wikipedia.org/wiki/Confirmation_bias)** — the tendency to seek information that supports what we already believe — can make it hard for authors to accept findings that contradict their expectations. A developer convinced their code is correct writes only tests that confirm it works, and never probes the edges where it breaks. Good testers deliberately hunt for disconfirming evidence, and they deliver bad news in a constructive way, so findings get acted on instead of resented.
- **[Heuristics](https://en.wikipedia.org/wiki/Heuristic)** are practical rules of thumb that guide decisions without guaranteeing the best answer — "start testing as early as possible" or "focus on high-risk areas first". Usually right, occasionally wrong, always worth having.

Biases and heuristics explain why two competent testers find different defects, and why fresh, independent eyes (below) add value.

## The [whole-team approach](https://www.techtarget.com/searchsoftwarequality/definition/Whole-team-approach) (FL-1.5.2)

The **whole-team approach** says simply: *everyone on the team shares responsibility for quality*. One of the important skills for a tester is working effectively in a team context, and this practice — which comes from [Extreme Programming](https://en.wikipedia.org/wiki/Extreme_programming) — builds on exactly that skill. Instead of "developers build, then testers police", any team member with the necessary knowledge and skills can perform a task, everyone is responsible for quality, and the team shares a workspace (physical or virtual) because co-location feeds communication.

The advantages the syllabus expects you to recall:

- **Improved team dynamics, communication and collaboration** — quality issues surface early, in conversation, rather than late, in defect reports.
- **Synergy from diverse skills** — testers collaborate with business representatives on acceptance tests and with developers on test strategy and automation, transferring testing knowledge into the whole team.
- **A shared quality goal** rather than a baton passed over a wall — which removes the adversarial "us vs them" dynamic.

One honest caveat the syllabus adds: the whole-team approach may not always be appropriate — in safety-critical situations, for example, a high level of [test independence](https://istqb-glossary.page/independence-of-testing/) may be needed instead.

## [Independence](https://istqb-glossary.page/independence-of-testing/) of testing (FL-1.5.3)

A certain degree of independence makes a tester more effective at finding defects, because the author's biases and the tester's biases differ — an author rarely spots their own misunderstanding. Independence is not, however, a replacement for familiarity: developers efficiently find many defects in their own code. The syllabus recognizes four levels of test independence, from lowest to highest:

1. **No independence** — the [work product](https://en.wikipedia.org/wiki/Software_artifact) is tested by its author.
2. **Some independence** — the author's peers from the same team test it.
3. **High independence** — testers from outside the author's team but within the organization test it.
4. **Very high independence** — testers from outside the organization, such as contractors or an [outsourcing](https://en.wikipedia.org/wiki/Outsourcing) vendor.

**The main benefit:** independent testers are likely to recognize different kinds of failures and defects than developers do — different backgrounds, different technical perspectives, different biases — and they can verify, challenge, or disprove assumptions made by stakeholders.

**The drawbacks:** independent testers may be isolated from the development team, leading to a lack of collaboration, communication problems, or even an adversarial relationship; developers may lose their sense of responsibility for quality; and independent testers can be seen as a bottleneck or blamed for release delays.

The practical reading: for most projects it is best to use *multiple* levels of independence at once — developers testing their own components, an independent team running system testing, business representatives doing acceptance testing. Match the mix to the context, and manage communication deliberately.

## Where your skills apply: levels and types

Everything above — process, skills, independence, whole-team habits — plays out across the whole landscape of testing. Test activities are organized into **[test levels](https://istqb-glossary.page/test-level/)** (where in the build-up of the system the testing happens) and **[test types](https://istqb-glossary.page/test-type/)** (what quality characteristic you are looking for). Module 2 covers both in depth; the map below is the preview you need for Chapter 1.

![Test levels and test types](diagrams/test-levels-types.svg)

## Good practices to carry forward

Three habits summarize Chapter 1 as a whole:

1. **Follow the [test process](https://istqb-glossary.page/test-process/) — tailored.** Use the activities from Lesson 4 in some form on every project, weighted by context (principle 6).
2. **Collaborate, don't gate-keep.** Practise the whole-team approach; use your communication skills to make quality everyone's business.
3. **Keep testing fresh and honest.** Fight tests wearing out — the [pesticide paradox](https://katalon.com/resources-center/blog/pesticide-paradox-in-software-testing) — by renewing tests and [test data](https://istqb-glossary.page/test-data/); state results truthfully, because testing shows the presence of defects, never their absence.

## Check yourself

1. Name the generic skills required for testing. Which one makes a defect report useful?
2. Your team argues "with a whole-team approach we don't need independent testers." What is the strongest counter-argument — and what truth is in their claim?
3. Why can high independence hurt communication, and what practice fixes it?
