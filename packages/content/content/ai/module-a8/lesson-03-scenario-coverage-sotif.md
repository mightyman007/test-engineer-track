+++
id = "ai-m8-scenario-coverage-sotif"
module = "ai-m8-testing-ai-systems"
title = "Scenario Coverage, SOTIF, and Where to Go Next"
minutes = 12
objectives = ["A8-7", "A8-8"]
videos = [
  { title = "SOTIF Explained (ISO 21448 Made Simple) (Walterconsulting)", url = "https://www.youtube.com/watch?v=6Xl3YXBJbTU" },
  { title = "Autonomous Driving Testing - SOTIF - Safety of the Intended Functionality (BTC Embedded Systems)", url = "https://www.youtube.com/watch?v=ZkhtF3gpHK8" },
]
diagrams = [
  { title = "100% code coverage next to 33% scenario coverage", file = "diagrams/scenario-coverage.svg" },
]
+++

## A different unit of coverage (A8-7)

[Code coverage](https://en.wikipedia.org/wiki/Code_coverage) answers a fair question for ordinary software: which lines and branches did the tests execute? For a learned system the answer collapses — **every input executes the same lines**. Whether the frame shows an empty highway or a child behind a stroller, the same forward pass runs over the same weights (module A3). A perception stack can post 100% statement coverage while misclassifying anything, because the behavior under test lives in the weights and the data, not in the code paths. Coverage of the code measures the *carrier*; it cannot see the cargo.

What to count instead is the unit the previous eight modules kept pointing at: **scenarios**. Scenario coverage treats the test space as a grid of *situations* — weather × lighting × road geometry × the agents in it × your own maneuver — and asks what share of the space the suite has actually exercised. The lessons of the track slot straight in: each sensor family fails in its own conditions (A7), thresholds decide what counts (A5), and simulation is how the exercised area grows from a test fleet's hundreds to thousands of variants overnight (A7). And the grid has a cruel shape: **the dangerous cells are rare by definition** — rare enough to be untested, rare enough that nobody knows the model fails there. That is the long tail from the last lesson, drawn as a map. Code coverage of 100% next to scenario coverage of 33% is not a contradiction; it is the honest report of a mature program.

![100% code coverage next to 33% scenario coverage](diagrams/scenario-coverage.svg)

## SOTIF: when nothing breaks but it still isn't safe (A8-8)

Automotive safety has a standard for broken parts: **[ISO 26262](https://en.wikipedia.org/wiki/ISO_26262)**, functional safety — a component *faults*, the fault causes a malfunction, the malfunction causes a hazard. Now consider a lane-keeper that works exactly as designed, every component passing its checks, yet still drifts toward the barrier in one specific combination: a bridge deck, strong side wind, low sun glare. Nothing failed. The intended function itself was **insufficient** for that situation.

That gap is what **SOTIF** — Safety Of The Intended Functionality, published as ISO 21448 — was written for: the absence of unreasonable risk from **functional insufficiencies of the intended functionality** (sensor limits, algorithm blind spots) or from **reasonably foreseeable misuse**. Its scope is explicitly complementary to ISO 26262's: faults stay out, insufficiencies stay in ([a good two-standard comparison](https://www.ptc.com/en/blogs/alm/iso-26262-vs-sotif-iso-pas-21448-whats-the-difference); [a validation-strategy walkthrough](https://www.dspace.com/en/inc/home/news/engineers-insights/navigating-the-road-to-iso-214.cfm)). SOTIF's working vocabulary is a tester's too: a **trigger condition** is the circumstance that turns an insufficiency into a hazard — sun glare at that angle, that bridge, that wind — and hunting trigger conditions *is* scenario coverage under a standards body's name. SOTIF also sorts the world into areas that are **known-safe, known-unsafe, and unknown**; validation's job is to shrink the unknown area — which is the same fight as the sparse grid above.

## Where this track hands off: the CT-AI certification (A8-8)

Everything this track covered — metrics and their traps, non-determinism and data-driven failures, scenario coverage and SOTIF — has a formal home. The **[ISTQB Certified Tester AI Testing (CT-AI)](https://www.istqb.org/certifications/certified-tester-ai-testing)** certification is the International Software Testing Qualifications Board's specialist syllabus on exactly this ground: quality characteristics for AI-based systems, metrics for ML models, testing AI-based systems, and using AI in testing. If you hold the Foundation Level (CTFL), CT-AI is the specialist step beside it — and this track was built to be your on-ramp to it: the same territory, in plain English, with the tester's questions in front throughout. The capstone point of the whole track is the one sentence the nine modules earned: **AI did not change what testing is — evidence about behavior under stated conditions — it changed where the behavior lives, and therefore where you hunt.**

## What testers take away

- **Coverage of the code cannot see learned behavior.** Every input runs the same lines — count situations, not statements.
- **Scenario coverage's map is deliberately drawn toward the rare.** The untested cells are dangerous *because* they are rare; simulation is how the map fills.
- **SOTIF governs failure without fault.** ISO 26262 owns broken components; ISO 21448 owns intended-but-insufficient functionality, and names its triggers — the scenarios to hunt.
- **The unknown area is the deliverable.** A validation report that shrinks known-unsafe and *measures* the unknown is doing SOTIF's job.
- **CT-AI is the named next step** — the certification that formalizes the ground this track walked.

## In plain terms

- Code coverage: lines executed — blind to learned behavior, since every input runs the same lines.
- Scenario coverage: the share of the situation space (weather, lighting, geometry, agents) actually exercised; the rare cells are the risk.
- ISO 26262 = faults (things break). SOTIF/ISO 21448 = insufficiency of the intended function (nothing breaks, still unsafe) plus foreseeable misuse.
- Trigger conditions turn insufficiency into hazard — hunting them is scenario coverage with a standards vocabulary.
- Next step: ISTQB Certified Tester AI Testing (CT-AI).

## Check yourself

1. A stakeholder says: "We're at 100% code coverage on the perception module — why do we need ten thousand simulated scenarios?" Answer in two sentences using this lesson's vocabulary.
2. A component passes every fault-injection test yet behaves unsafely in one narrow, foreseeable situation. Which standard's scope is that, and what is the situation called?
3. Split these three into their standards: a brake actuator's transistor fails intermittently; the camera cannot resolve a pedestrian at 250 m in fog; a driver disables lane-keeping on the highway expecting it to steer unsupervised. Which standard owns each?
