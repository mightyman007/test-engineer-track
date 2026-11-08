+++
id = "istqb-m3-review-process"
module = "istqb-m3-static"
title = "The Value of Static Testing and the Review Process"
minutes = 14
objectives = ["FL-3.1.2", "FL-3.2.1", "FL-3.2.2", "FL-3.2.3"]
videos = [
  { title = "ISTQB FOUNDATION 4.0 — Tutorial 25: Early Feedback | Review Process | Roles & Responsibility | CTFL (TM Square)", url = "https://www.youtube.com/watch?v=BwqwrcKqX6Q" },
  { title = "ISTQB Foundation Level: 3.2.3 Roles and Responsibilities in Reviews (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=QQTEjAfXR1A" },
]
diagrams = [
  { title = "The review process: five activities in flow", file = "diagrams/review-process-flow.svg" },
]
+++

## Why static testing is worth the effort (FL-3.1.2)

**[Static testing](https://istqb-glossary.page/static-testing/)** can detect [defects](https://istqb-glossary.page/defect/) in the **earliest phases** of the [SDLC](https://glossary.istqb.org/en_US/term/software-development-lifecycle), fulfilling the **principle of early testing** (see section 1.3). Two value claims matter for the exam. First, it can identify defects **which cannot be detected by [dynamic testing](https://istqb-glossary.page/dynamic-testing/) at all** — [unreachable code](https://en.wikipedia.org/wiki/Dead_code), design patterns not implemented as desired, and defects in non-executable [work products](https://en.wikipedia.org/wiki/Software_artifact). Second, even though reviews can be **costly to implement**, overall project costs are usually **much lower** than when no reviews are performed, because less time and effort is spent fixing defects later in the project.

Static testing also lets the team **evaluate the quality of, and build confidence in, work products**. By verifying the documented requirements, [stakeholders](https://glossary.istqb.org/en_US/term/stakeholder) can make sure those requirements describe their **actual needs**. Because it happens early, static testing creates a **shared understanding** among the stakeholders involved and **improves communication** between them — which is why the syllabus recommends involving a **wide variety of stakeholders** in it. Finally, certain code defects can be detected by [static analysis](https://istqb-glossary.page/static-analysis/) **more efficiently** than in dynamic testing, usually resulting in both fewer code defects and a lower overall development effort.

## Early and frequent stakeholder feedback (FL-3.2.1)

Reviews are the flagship of a broader idea: getting stakeholders to look at work products **early and often**. Early and frequent feedback allows the **early communication of potential quality problems**. If there is little stakeholder involvement during the SDLC, the product being developed might not meet the stakeholder's original or *current* vision — and a failure to deliver what the stakeholder wants can result in **costly rework, missed deadlines, blame games, and might even lead to complete project failure**.

Frequent stakeholder feedback throughout the SDLC can **prevent misunderstandings about requirements** and ensure that changes to requirements are understood and implemented earlier. It helps the development team **improve their understanding of what they are building**, and lets them focus on the features that **deliver the most value** to stakeholders and have the most positive impact on identified risks.

## The review process, activity by activity (FL-3.2.2)

The **[ISO/IEC 20246](https://www.iso.org/obp/ui/#iso:std:iso-iec:20246:ed-1:v1:en)** standard defines a **generic review process**: a structured but flexible framework from which a specific review process may be tailored. The rule of thumb: **the more formal the required review, the more of the tasks in each activity will be needed**. And because many work products are too large for a single review, the process may be **invoked multiple times** to cover the whole thing.

The activities of the review process are:

1. **Planning.** The review's **scope** is defined: the purpose, the work product to be reviewed, the [quality characteristics](https://istqb-glossary.page/quality-characteristic/) to be evaluated, the areas to focus on, [exit criteria](https://istqb-glossary.page/exit-criteria/), supporting information such as standards, plus effort and timeframes.
2. **Review initiation.** The goal is that **everyone and everything involved is prepared to start**: every participant has access to the work product under review, understands their role and responsibilities, and receives everything needed to perform the review.
3. **Individual review.** Every reviewer assesses the quality of the work product and identifies [**anomalies**](https://istqb-glossary.page/anomaly/), recommendations and questions by applying one or more review techniques (e.g., checklist-based reviewing, scenario-based reviewing) — and **logs all of them**.
4. **Communication and analysis.** Anomalies are **not necessarily defects**, so they are analyzed and discussed; for every anomaly a decision is made on its **status, ownership and required actions** — typically in a review meeting, where participants also decide the **quality level** of the reviewed work product and the follow-up actions. A **follow-up review** may be required to complete actions.
5. **Fixing and reporting.** For every defect, a **[defect report](https://istqb-glossary.page/defect-report/)** is created so corrective actions can be followed up. Once the exit criteria are reached, the work product can be **accepted**, and the review results are **reported**.

![The review process: five activities in flow](diagrams/review-process-flow.svg)

## Who does what in a review (FL-3.2.3)

Reviews involve various stakeholders, who may take on **several roles**. The syllabus names six principal roles and their responsibilities — memorize the pairing, it is prime K1 recall material:

- **Manager** — decides **what is to be reviewed** and provides resources, such as staff and time, for the review.
- **[Author](https://glossary.istqb.org/en_US/term/author)** — **creates** the work product under review and **fixes** it afterwards.
- **[Moderator](https://istqb-glossary.page/moderator/)** (also known as the **facilitator**) — ensures the **effective running of review meetings**, including mediation, time management, and a **safe review environment** in which everyone can speak freely.
- **[Scribe](https://istqb-glossary.page/scribe/)** (also known as the **recorder**) — **collates anomalies** from reviewers and records review information, such as decisions and new anomalies found during the review meeting.
- **[Reviewer](https://istqb-glossary.page/reviewer/)** — **performs the review**. A reviewer may be someone working on the project, a subject matter expert, or any other stakeholder.
- **[Review leader](https://glossary.istqb.org/en_US/term/review-leader)** — takes **overall responsibility** for the review, such as deciding who will be involved and organizing when and where the review takes place.

More detailed role variants exist in the ISO/IEC 20246 standard, but these six are the examinable set.

## In plain terms

- Static testing pays twice: defects are found early (cheap) and some defects — like unreachable code — are found *only* by static techniques.
- Reviews build shared understanding and better communication; that is why many different stakeholders should take part.
- Little stakeholder feedback is expensive: rework, missed deadlines, blame games, even project failure.
- The generic review process (ISO/IEC 20246) runs **planning → review initiation → individual review → communication and analysis → fixing and reporting**, with more formality meaning more tasks, and six principal roles around the table.

## Check yourself

1. Which defects can static testing find that dynamic testing never can — and why?
2. A project skips stakeholder reviews to move faster. What does the syllabus predict may happen?
3. Recite the five review process activities in order, and say where a follow-up review fits.
4. Who decides *what* gets reviewed, and who takes *overall responsibility* for the review? Why are those different roles?
