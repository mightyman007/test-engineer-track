+++
id = "istqb-m1-seven-principles"
module = "istqb-m1-fundamentals"
title = "The Seven Testing Principles"
minutes = 10
objectives = ["FL-1.3.1"]
videos = [
  { title = "ISTQB Foundation 4.0 — Tutorial 4: 1.3 Testing Principles (TM Square)", url = "https://www.youtube.com/watch?v=wp-JZWLPuWE" },
]
diagrams = [
  { title = "The seven testing principles", file = "diagrams/seven-principles.svg" },
]
+++

## Rules that have outlived every fad

Over decades of practice, testers have noticed the same truths appearing again and again, in every technology and every industry. The ISTQB syllabus collects seven of them as **testing principles**. They are not procedures — they are general guidelines that explain *why* good testing behaves the way it does. The exam loves them, usually in the K1/K2 form: name the principle from a scenario, or explain what it implies.

## The seven principles, one by one (FL-1.3.1)

**1. Testing shows the presence of [defects](https://istqb-glossary.page/defect/), not their absence.** Testing can demonstrate that defects exist, but no amount of testing can prove that none remain. After a clean test run, the honest statement is "we did not find defects", never "there are no defects". Testing *reduces* the probability that undiscovered defects remain — that is all, and that is still valuable.

**2. [Exhaustive testing](https://istqb-glossary.page/exhaustive-testing/) is impossible.** Testing every input, every combination, every path is beyond feasibility except in trivial cases. Because everything cannot be tested, effort must be focused — [test techniques](https://istqb-glossary.page/test-technique/), [test case](https://istqb-glossary.page/test-case/) prioritization, and **[risk-based testing](https://istqb-glossary.page/risk-based-testing/)** are the syllabus's tools for aiming effort where it matters.

**3. Early testing saves time and money.** Defects found early cost little; the same defects found after release cost a fortune (rework, recalls, reputation). So start testing as early as possible — reviewing requirements is testing. This idea is often called "**[shift left](https://www.browserstack.com/guide/what-is-shift-left-testing)**": pull testing towards the beginning of the timeline.

**4. Defects cluster together.** In real systems, a small number of modules typically contains most of the defects — sometimes for a predictable reason (complexity, new code, unfamiliar developers). This is an instance of the [Pareto principle](https://en.wikipedia.org/wiki/Pareto_principle) (roughly "80/20"). Practical consequence: predicted and observed defect clusters drive where testing effort is spent.

**5. Tests wear out (the [pesticide paradox](https://katalon.com/resources-center/blog/pesticide-paradox-in-software-testing)).** Boris Beizer's metaphor: spray the same pesticide repeatedly and the insects build resistance. Run the same tests repeatedly and they become increasingly ineffective at finding *new* defects. Repetition still has value — in [regression testing](https://istqb-glossary.page/regression-testing/) repeated tests confirm nothing broke — but to keep finding fresh defects, existing tests and [test data](https://istqb-glossary.page/test-data/) may need to be modified, and new tests may need to be written.

**6. Testing is context dependent.** There is no single right way to test. An e-commerce site, an avionics controller and a hospital portal are tested with different rigour, different techniques, different documentation — as Lesson 2 showed. Any advice of the form "always test like *this*" should be treated with suspicion.

**7. Absence-of-defects fallacy.** It is a misconception to expect that verifying the software against all specified requirements and fixing every defect found guarantees success: the result could still fail to fulfil the users' needs and expectations, or lose out to competing systems. Correctness against the wrong requirements is still the wrong product — which is why **[validation](https://istqb-glossary.page/validation/)** must accompany [verification](https://istqb-glossary.page/verification/). Quality means usefulness, not just defect-freeness.

![The seven testing principles](diagrams/seven-principles.svg)

## How the principles connect

The seven are not independent slogans; they tell one coherent story. Exhaustive testing is impossible (2), so you must prioritize — and defects cluster (4) tells you where. Early testing (3) and tests wearing out (5) tell you *when* and *how often* to vary your approach. Context dependence (6) warns against copying another project's answers. Presence-not-absence (1) and the absence-of-defects fallacy (7) together draw the honest limit of what testing can promise — and why information about quality, not just defect counts, is testing's real product.

## Check yourself

1. A stakeholder says: "Testing finished with no defects found, so the system is proven correct." Which principle do you cite?
2. Your regression suite has not found a new defect in months, yet users keep filing complaints. Which principle explains it, and what should change?
3. Why does defect clustering justify spending more test effort on a few risky modules instead of spreading effort evenly?
