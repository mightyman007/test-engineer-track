+++
id = "istqb-m6-risk"
module = "istqb-m6-managing"
title = "Risk Management"
minutes = 14
objectives = ["FL-5.2.1", "FL-5.2.2", "FL-5.2.3", "FL-5.2.4"]
videos = [
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 50 | Risk Identification | Risk Assessment | CTFL Tutorials (TM Square)", url = "https://www.youtube.com/watch?v=e7B_bmPJRr0" },
  { title = "ISTQB Foundation Level: 5.2.1 Risk Definition and Risk Attributes (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=YcNh2e7gxBs" },
  { title = "ISTQB FOUNDATION 4.0 | Tutorial 51 | Product Risk Analysis | Risk Control | Test Management | CTFL (TM Square)", url = "https://www.youtube.com/watch?v=Za2ncjgeJKc" },
  { title = "ISTQB Foundation Level: 5.2.2 Project Risks and Product Risks (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=L1wsFYEBy3Q" },
  { title = "ISTQB Foundation Level: 5.2.3 Product Risk Analysis (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=w7lrZfoZSso" },
  { title = "ISTQB Foundation Level: 5.2.4 Product Risk Control (ASTQB — ISTQB in the U.S. and Globally)", url = "https://www.youtube.com/watch?v=WGXT6h5iOJs" },
]
diagrams = [
  { title = "A 5×5 risk matrix: likelihood × impact, with the worked example's two defects plotted", file = "diagrams/risk-matrix.svg" },
]
+++

## What a risk is (FL-5.2.1)

A [risk](https://istqb-glossary.page/risk/) is a **potential event, hazard, threat, or situation whose occurrence causes an adverse effect**. Two words do all the exam's work here:

- **[Risk likelihood](https://istqb-glossary.page/risk-likelihood/)** — the probability of the risk occurrence, strictly **greater than zero and less than one** (a risk that cannot happen or is certain to happen is not a risk in this sense).
- **[Risk impact](https://istqb-glossary.page/risk-impact/)** — the consequences (harm) of that occurrence.

Together the two factors express the **[risk level](https://istqb-glossary.page/risk-level/)**, a measure for the risk: **the higher the risk level, the more important is its treatment**. In the quantitative approach the level is computed as the multiplication of likelihood and impact — the arithmetic behind this lesson's risk-matrix example below.

## Project risks and product risks (FL-5.2.2)

Testing is generally concerned with two risk types:

- **[Project risks](https://istqb-glossary.page/project-risk/)** relate to the **management and control of the project**. They include organizational issues (delays in work product deliveries, inaccurate estimates, cost cutting), people issues (insufficient skills, conflicts, communication problems, staff shortage), technical issues (scope creep, poor tool support), and supplier issues (third-party delivery failure, bankruptcy of the supporting company). When they occur they hit the project's **schedule, budget or scope** — the project's ability to achieve its objectives.
- **[Product risks](https://istqb-glossary.page/product-risk/)** relate to the **product's quality characteristics** (e.g., the ISO 25010 quality model). Examples: missing or wrong functionality, incorrect calculations, runtime errors, poor architecture, inefficient algorithms, inadequate response time, poor user experience, security vulnerabilities. When they occur, consequences include user dissatisfaction, loss of revenue, trust and reputation, damage to third parties, high maintenance costs or help-desk overload, criminal penalties — in extreme cases physical damage, injuries or death.

The quick discriminator: a project risk endangers *the project*; a product risk endangers *the users of the product*. The same test suite may respond to both, but the classifications and their consequences are different beasts — and exams love to hand you a mixed list and ask which is which.

## Product risk analysis (FL-5.2.3)

From a testing perspective, the goal of product risk analysis is to create **awareness of product risk to focus the test effort** in a way that **minimizes the residual level of product risk**. Ideally it begins **early in the SDLC**. Product risk analysis consists of two parts:

- **[Risk identification](https://istqb-glossary.page/risk-identification/)** — generating a comprehensive list of risks, using techniques and tools such as brainstorming, workshops, interviews or cause-effect diagrams.
- **[Risk assessment](https://istqb-glossary.page/risk-assessment/)** — categorizing the identified risks, **determining their risk likelihood, risk impact and risk level**, prioritizing them, and proposing ways to handle them. Categorization helps assign mitigation actions, because risks in the same category can usually be mitigated similarly.

Assessment can be **quantitative** (risk level = likelihood × impact) or **qualitative** (the risk level is determined using a **risk matrix**), or a mix of both.

![A 5×5 risk matrix: likelihood × impact, with the worked example's two defects plotted](diagrams/risk-matrix.svg)

The results of product risk analysis directly shape the test approach. They are used to:

- determine the **test scope** to be carried out;
- determine the particular **test levels** and propose **test types** to be performed;
- determine the **test techniques** to be employed and the **coverage** to be achieved;
- **estimate the test effort** required for each task;
- **prioritize testing** in an attempt to find the critical defects as early as possible;
- determine whether **activities in addition to testing** could be employed to reduce risk.

That fifth bullet is the bridge to lesson 2's risk-based prioritization, and the fourth is the bridge to estimation — risk analysis is the input those techniques consume.

## Product risk control (FL-5.2.4)

Product risk control comprises all measures taken in response to identified and assessed product risks. It consists of two halves:

- **[Risk mitigation](https://istqb-glossary.page/risk-mitigation/)** — implementing the actions proposed during risk assessment **to reduce the risk level**.
- **[Risk monitoring](https://istqb-glossary.page/risk-monitoring/)** — making sure the mitigation actions **are effective**, obtaining further information to improve risk assessment, and identifying **emerging risks**.

Once a risk has been analyzed, several response options exist: **risk mitigation by testing, risk acceptance, risk transfer, or a contingency plan**. Note what "acceptance" means: a deliberate, recorded decision to live with the risk — not ignoring it. Actions that mitigate product risks **by testing** include:

- selecting **testers with the right experience and skills** for the given risk type;
- applying an appropriate level of **independence of testing** (module 1);
- performing **reviews and static analysis** (module 3);
- applying the appropriate **test techniques and coverage levels** (module 4);
- applying the appropriate **test types** addressing the affected quality characteristics (module 2);
- performing **dynamic testing, including regression testing**.

The identified, assessed risks and their responses are recorded in the **[risk register](https://glossary.istqb.org/en_US/term/risk-register)** introduced as test-plan content in lesson 1 — which is how risk management stays connected to planning.

## In plain terms

- A risk = potential event whose occurrence causes harm; its two attributes are **likelihood** (probability between 0 and 1, exclusive) and **impact** (the harm); together they give the **risk level** — higher level, more important treatment. Quantitative level = likelihood × impact.
- **Project risks** (organizational, people, technical, supplier) threaten schedule, budget or scope; **product risks** threaten quality characteristics and ultimately users — dissatisfaction, revenue and reputation loss, third-party damage, even criminal penalties or physical harm.
- **Product risk analysis** = risk identification (brainstorming, workshops, interviews, cause-effect diagrams) + risk assessment (categorize, determine likelihood/impact/level, prioritize, propose handling); quantitative by multiplication or qualitative via a risk matrix. Its results set the test scope, levels and types, techniques and coverage, per-task effort, test prioritization, and additional risk-reducing activities — all aimed at minimizing **residual** risk.
- **Product risk control** = risk mitigation (implement the proposed actions) + risk monitoring (check effectiveness, improve assessment, catch emerging risks). Response options: mitigate by testing, accept, transfer, contingency plan. Mitigation by testing ranges from experienced/independent testers through reviews, static analysis, techniques, coverage and test types to dynamic and regression testing.

## Check yourself

1. Why is a likelihood of exactly 1 not a risk likelihood in the syllabus's sense — and what would a qualitative analyst plot on a risk matrix instead of computing a product?
2. "The vendor supplying our test data generator is at risk of bankruptcy" — project or product risk? "The generator rounds currency conversions incorrectly" — and why does the distinction matter for who feels the pain?
3. A team scores each risk 1–5 for likelihood and 1–5 for impact, then orders the test execution schedule by the product. Which risk-analysis stage did the scoring belong to, and which prioritization strategy did the ordering implement?
4. Name two mitigation-by-testing actions for the risk "the payment module's currency handling may mangle amounts", and one non-testing response option the project could instead (or additionally) choose.
