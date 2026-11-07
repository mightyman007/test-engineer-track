+++
id = "istqb-m1-what-is-testing"
module = "istqb-m1-fundamentals"
title = "What Is Testing?"
minutes = 12
objectives = ["FL-1.1.1", "FL-1.1.2"]
videos = [
  { title = "ISTQB Foundation 4.0 — Tutorial 2: 1.1 What is Testing (TM Square)", url = "https://www.youtube.com/watch?v=WMSNwyBioEc" },
  { title = "What is testing? Testing vs debugging (Software Testing Mentor)", url = "https://www.youtube.com/watch?v=sxoXCyEn8jY" },
]
diagrams = [
  { title = "Testing vs debugging", file = "diagrams/testing-vs-debugging.svg" },
]
+++

## What [software testing](https://en.wikipedia.org/wiki/Software_testing) actually is

When people hear the phrase, they usually picture someone clicking through an app hunting for bugs. That picture is incomplete. In the ISTQB view, **software testing** is a set of activities — not just running the software — whose purpose is to find out how good a piece of work really is and to give decision-makers honest information about it.

The thing being examined is called the **[test object](https://istqb-glossary.page/test-object/)**. It might be a program, but it might also be a requirements document, a design sketch, or a contract. That matters, because problems are cheapest to fix long before any code exists.

Testing also comes in two flavours. **[Static testing](https://istqb-glossary.page/static-testing/)** examines a work product *without* running it — reading a document, reviewing a design, checking code by eye. **[Dynamic testing](https://istqb-glossary.page/dynamic-testing/)** runs the software and watches what it does. Both count as testing. A tester who spots a contradiction in a requirements document is doing exactly as much "real testing" as one who clicks through a login screen.

## What testing is for (FL-1.1.1)

The syllabus lists **typical objectives of testing**. The most important ones:

- **Find [defects](https://istqb-glossary.page/defect/) and [failures](https://istqb-glossary.page/failure/)** in the test object, so they can be dealt with before users meet them.
- **Give stakeholders objective information** — about quality, about risk — so they can make sound decisions, including the decision to release.
- **Prevent defects** in the first place, for example by reviewing requirements and designs before code is written.
- **Verify** that the specified requirements have been fulfilled, and **[validate](https://istqb-glossary.page/validation/)** that the product does what users and other stakeholders actually need.
- **Build confidence** in the quality level of the test object.
- **Reduce the risk** of inadequate software quality, and **check compliance** with contracts, laws and regulations.

Notice what is *not* on that list: "prove the software has no defects". Testing can show that defects are present, but it cannot prove they are absent. That single idea reappears in Lesson 3 as one of the seven testing principles, and it is a favourite exam question.

One more distinction the syllabus draws: **[quality assurance](https://istqb-glossary.page/quality-assurance/) (QA)** and **testing** are related but different. QA is process-oriented — its aim is to *prevent* defects by improving how the work is done. Testing is product-oriented — its aim is to *detect* failures in the thing being built. Testing is one of the tools QA uses; QA is the bigger umbrella. We revisit this in Lesson 2.

## Testing is not [debugging](https://en.wikipedia.org/wiki/Debugging) (FL-1.1.2)

When software misbehaves, two different jobs fix it. The distinction between them is core exam material.

**[Debugging](https://en.wikipedia.org/wiki/Debugging)** is the *development* activity of finding the cause of a failure, understanding it, and removing it from the code. It is done by developers, and it is only ever triggered by an observed failure — nobody debugs software that is working.

**Testing** is the activity of making the failure visible in the first place, describing it precisely (a [defect report](https://istqb-glossary.page/defect-report/)), and later re-checking that the fix worked. Testing finds failures and provides information; debugging locates and removes the causes.

A defect itself is a flaw sitting in the code — for example, a condition written backwards. That flaw may or may not ever produce a visible failure; it only misbehaves when the flawed code actually runs under the right conditions.

![Testing vs debugging](diagrams/testing-vs-debugging.svg)

The two activities feed each other in a loop: testing exposes a failure → debugging removes its cause → testing re-runs to confirm the fix. A fix can also introduce a *new* problem somewhere else, which is why teams re-test after every change.

## In plain terms

- Testing is a set of activities across the whole project, not just "clicking around at the end".
- Its objectives include finding defects, preventing them, informing decisions, verifying and validating, and building confidence.
- Testing can never prove the absence of defects.
- Testing (testers) and debugging (developers) are different jobs that work as a pair.

## Check yourself

1. A reviewer finds a contradiction in a requirements document, before any code exists. Is that testing?
2. Who normally performs debugging, and what triggers it?
3. Why can testing never prove that a system is defect-free?
