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

A **skill** is the ability to do something well, built from knowledge, practice and aptitude. The syllabus names the generic skills that make testers effective — and this is a classic exam recall item, so learn the list as a list:

- **Technical knowledge** — understanding the system, its [architecture](https://en.wikipedia.org/wiki/Software_architecture) and its tools well enough to test it meaningfully (you do not need to be a full-time programmer, but you need to speak the language).
- **[Test analysis](https://istqb-glossary.page/test-analysis/)** — the ability to examine a [test basis](https://istqb-glossary.page/test-basis/) and decide *what* deserves testing (Lesson 4's analysis activity).
- **[Test design](https://istqb-glossary.page/test-design/)** — the ability to turn "what" into concrete, effective [test cases](https://istqb-glossary.page/test-case/) (techniques for this fill a later module).
- **Communication** — testers write and speak constantly: [defect reports](https://istqb-glossary.page/defect-report/), test summaries, conversations with developers and stakeholders. A defect report that a developer can act on immediately is worth ten vague ones; clear communication also keeps testing respected instead of resented.
- **[Critical thinking](https://en.wikipedia.org/wiki/Critical_thinking)** — the discipline of questioning assumptions, checking evidence, and reasoning about what the results really show. Testers are paid, in large part, to notice what everyone else took for granted.

Beyond the syllabus list, good testers tend to bring curiosity, attention to detail, and domain knowledge. And one more skill from the syllabus matters more than it first appears: being a **good team player** — which is exactly where the [whole-team approach](https://www.techtarget.com/searchsoftwarequality/definition/Whole-team-approach) comes in.

## The [whole-team approach](https://www.techtarget.com/searchsoftwarequality/definition/Whole-team-approach) (FL-1.5.2)

The **[whole-team approach](https://www.techtarget.com/searchsoftwarequality/definition/Whole-team-approach)** says simply: *everyone on the team shares responsibility for quality*. It comes from [Extreme Programming](https://en.wikipedia.org/wiki/Extreme_programming) and is at home in agile development. Instead of "developers build, then testers police", the team — developers, testers, business analysts, product owner — works together with a common quality goal: testers sit in on planning and requirements conversations, developers help with test design and automation, and quality stops being a department.

The advantages the syllabus expects you to recall:

- **Better communication** — quality issues surface early, in conversation, rather than late, in defect reports.
- **A broader mix of skills** applied to the product — everyone contributes their specialty (analysis, coding, domain, UX) to building and checking quality.
- **Quality as a shared goal** rather than a baton passed over a wall — which removes the adversarial "us vs them" dynamic and the "quality gate at the end" delay.

Testers still matter enormously in this model — but as specialists who *enable* the team's testing, not as the only people who do it.

## [Independence](https://istqb-glossary.page/independence-of-testing/) of testing within the team (FL-1.5.3)

Lesson 4 introduced the four levels of **[independence of testing](https://istqb-glossary.page/independence-of-testing/)**. Here is how to *think* about choosing among them — the syllabus wants you to weigh benefits against drawbacks, not memorize a "best" level.

**Benefits of independence:** an independent tester sees the product without the author's blind spots — authors rarely spot their own misunderstandings; independent testers may question assumptions the team has stopped noticing, and they bring testing-specific knowledge and techniques.

**Drawbacks of independence:** high independence can **isolate** testers from the development team — they miss context, learn about changes late, and communicate through slow formal channels; developers may lower their guard ("the test team will catch it"), and misunderstanding of the product can lead to wasted effort on unimportant tests.

The practical reading: within one team you get most of independence's value (fresh eyes) while keeping collaboration (whole-team). Complete separation suits high-risk, contract-heavy work; author-only testing is quick but blindest. **Match the level of independence to the context, and manage communication deliberately** — that balanced statement is what exam answers look like.

## Where your skills apply: levels and types

Everything above — process, skills, independence, whole-team habits — plays out across the whole landscape of testing. Test activities are organized into **[test levels](https://istqb-glossary.page/test-level/)** (where in the build-up of the system the testing happens) and **[test types](https://istqb-glossary.page/test-type/)** (what quality characteristic you are looking for). Module 2 covers both in depth; the map below is the preview you need for Chapter 1.

![Test levels and test types](diagrams/test-levels-types.svg)

## Good practices to carry forward

Three habits summarize Chapter 1 as a whole:

1. **Follow the [test process](https://istqb-glossary.page/test-process/) — tailored.** Use the activities from Lesson 4 in some form on every project, weighted by context (principle 6).
2. **Collaborate, don't gate-keep.** Practise the whole-team approach; use your communication skill to make quality everyone's business.
3. **Keep testing fresh and honest.** Fight the [pesticide paradox](https://katalon.com/resources-center/blog/pesticide-paradox-in-software-testing) by renewing tests; state results truthfully — testing shows the presence of defects, never their absence.

## Check yourself

1. Name the five generic skills for testing. Which one makes a defect report useful?
2. Your team argues "with a whole-team approach we don't need independent testers." What is the strongest counter-argument — and what truth is in their claim?
3. Why can high independence hurt communication, and what practice fixes it?
