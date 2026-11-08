+++
id = "istqb-m3-review-types"
module = "istqb-m3-static"
title = "Review Types and Success Factors"
minutes = 12
objectives = ["FL-3.2.4", "FL-3.2.5"]
videos = [
  { title = "ISTQB FOUNDATION 4.0 — Tutorial 26: Review Types | Informal, Walkthrough, Technical & Inspection | CTFL (TM Square)", url = "https://www.youtube.com/watch?v=_0vHG94JpU8" },
  { title = "ISTQB Foundation Level: 3.2.5 Success Factors for Reviews (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=WdrZNUa5TwA" },
]
diagrams = [
  { title = "The review type ladder: four rungs of formality", file = "diagrams/review-types-ladder.svg" },
]
+++

## A ladder of formality (FL-3.2.4)

**[Reviews](https://istqb-glossary.page/review/)** range from quick corridor chats to heavily documented **[formal reviews](https://istqb-glossary.page/formal-review/)**. The required **level of formality** depends on factors such as the [SDLC](https://glossary.istqb.org/en_US/term/software-development-lifecycle) being followed, the maturity of the development process, the **criticality and complexity** of the [work product](https://en.wikipedia.org/wiki/Software_artifact) being reviewed, **legal or regulatory requirements**, and the need for an **audit trail**. One work product can even be reviewed with different types — e.g., first an informal one and later a more formal one.

Selecting the right review type is key to achieving the required review objectives (see section 3.2.5). The selection is based not only on the objectives but also on **project needs, available resources, the work product type and risks, the business domain, and company culture**.

![The review type ladder: four rungs of formality](diagrams/review-types-ladder.svg)

## The four review types (FL-3.2.4)

These are the commonly used review types — learn each one's **lead role and main objective**, because that is exactly where exam questions like to test you:

- **[Informal review](https://istqb-glossary.page/informal-review/).** Does **not follow a defined process** and does **not require a formal documented output**. The main objective is simply **detecting [anomalies](https://istqb-glossary.page/anomaly/)**. (A quick "please look over this" to a colleague counts.)
- **[Walkthrough](https://istqb-glossary.page/walkthrough/).** **Led by the [author](https://glossary.istqb.org/en_US/term/author)**, and can serve many objectives: evaluating quality and building confidence in the work product, **educating reviewers**, gaining consensus, generating new ideas, motivating and enabling authors to improve, and detecting anomalies. Reviewers *might* perform an individual review before the walkthrough — but this is **not required**.
- **[Technical review](https://istqb-glossary.page/technical-review/).** Performed by **technically qualified reviewers** and **led by a [moderator](https://istqb-glossary.page/moderator/)**. Its objectives: **gain consensus and make decisions regarding a technical problem**, but also detect anomalies, evaluate quality and build confidence in the work product, generate new ideas, and motivate and enable authors to improve.
- **[Inspection](https://istqb-glossary.page/inspection/).** The **most formal** type: it follows the **complete generic process** (see section 3.2.2). The main objective is to find the **maximum number of anomalies**; other objectives are to evaluate quality, build confidence in the work product, and motivate and enable authors to improve. **[Metrics](https://istqb-glossary.page/metric/)** are collected and used to improve the SDLC — including the inspection process itself. And a favourite exam trap: in an inspection, **the author cannot act as the [review leader](https://glossary.istqb.org/en_US/term/review-leader) or the [scribe](https://istqb-glossary.page/scribe/)**.

## What makes reviews succeed (FL-3.2.5)

Several factors determine whether reviews actually pay off. The syllabus's list of **success factors for reviews**:

- **Defining clear objectives and measurable [exit criteria](https://istqb-glossary.page/exit-criteria/)** — and note: **evaluation of participants should never be an objective**.
- **Choosing the appropriate review type** to achieve the given objectives, and to suit the type of work product, the review participants, the project needs and the context.
- **Performing reviews on small chunks**, so reviewers do not lose concentration during the individual review or the review meeting.
- **Providing feedback from reviews** to [stakeholders](https://glossary.istqb.org/en_US/term/stakeholder) and authors so they can improve the product and their activities (see section 3.2.1).
- **Providing adequate time** to participants to prepare for the review.
- **Support from management** for the review process.
- **Making reviews part of the organization's culture**, to promote learning and process improvement.
- **Providing adequate training for all participants**, so they know how to fulfil their role.
- **Facilitating meetings.**

The negative space matters as much as the list itself: using reviews to rank or rate people poisons the safe review environment that reviews depend on, and marathon sessions defeat concentration. If a scenario question shows a manager scoring reviewers, the right answer is always that this is not what reviews are for.

## In plain terms

- Formality is a dial, not a binary — set it by criticality, complexity, regulation, audit needs, process maturity and the SDLC.
- Informal review: no process, no documented output, anomalies only. Walkthrough: author-led, many objectives, preparation optional. Technical review: moderator-led qualified reviewers chasing consensus on technical problems. Inspection: the full generic process, maximum anomalies, metrics, and the author must not be review leader or scribe.
- Success needs clear objectives and measurable exit criteria, the right review type, small chunks, real preparation time, management support, a learning culture, training — and never, ever using reviews to evaluate participants.

## Check yourself

1. A regulatory audit requires documented review evidence with metrics. Which review type fits, and why?
2. Who leads a walkthrough, and why does that choice make sense for its objectives?
3. In an inspection, which two roles is the author not allowed to take?
4. A team lead wants to use review findings in performance appraisals. Which success factor does this violate?
