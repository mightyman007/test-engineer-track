+++
id = "istqb-m8-how-mocks-work"
module = "istqb-m8-readiness"
title = "How Mock Exams Work"
minutes = 8
objectives = []
videos = [
  { title = "ISTQB Foundation Level Sample Questions | SET A | Tutorial 1 | Chapter 1 | ISTQB Mock Questions (TM Square)", url = "https://www.youtube.com/watch?v=1KUs3yP3vSo" },
  { title = "ISTQB Foundation Level CTFL 4.0 Practice Questions and Detailed Explanations (Viral Courses)", url = "https://www.youtube.com/watch?v=nXXv0J9aXiY" },
]
diagrams = [
  { title = "The mock-exam loop: pass each mock, then prove readiness (last-2 average ≥ 80%)", file = "diagrams/exam-readiness-flow.svg" },
]
+++

## What a mock exam is

A mock exam is a full dress rehearsal for the real ISTQB Certified Tester Foundation Level exam, taken at home under the same rules. Each of the five mocks in this track is **blueprint-exact**, which means it reproduces the official exam's shape, not a random grab-bag of questions:

- **40 questions, 1 point each** — the same total as the real exam.
- **60 minutes** — the same time limit; the timer runs and auto-submits at zero, so practice against the clock, not with it paused.
- **Pass at 65%** — 26 of 40 points, the official pass mark.
- **The official chapter draw** — the 40 questions split across the six syllabus chapters exactly as the real exam does (Ch1 8, Ch2 6, Ch3 4, Ch4 11, Ch5 9, Ch6 2), and the K-level mix matches too (K1 8, K2 24, K3 8). A K3 question asks you to *apply* a technique, not recall it — so the mock exercises the same skills in the same proportions as the real thing.

One deliberate difference: **every retake re-draws the questions**. Two attempts at the same mock share the blueprint but rarely share the exact questions, which keeps you honest — you are practicing the syllabus, not memorizing an answer key. The questions are original, written against the learning objectives; no mock leaks "real" exam items, and none is the official sample set (that is public and worth reading too — see the videos below).

## The 80% readiness rule

Passing one mock is **not** readiness. The pass mark is 65%; readiness needs a **higher bar over more evidence**: your readiness score is the **average of your last two mock attempts, and you are ready when that average is 80% or better**.

Why the extra 15 points? Exam-day variance is real: a slightly unlucky draw, a noisy room, one misread question — any of these can cost 5–10%. A learner averaging 80% across two attempts has comfortable margin above the 65% pass line even on a bad day. A learner who scraped 66% once has none. The two-attempt minimum is part of the rule: a single great score could be luck, and a single bad score could be a bad morning. Two attempts smooth both out — the app simply has no readiness reading until you have sat **two** mocks.

The diagram shows the whole loop:

![The mock-exam loop: pass each mock, then prove readiness (last-2 average ≥ 80%)](diagrams/exam-readiness-flow.svg)

Note what the loop does **not** say: it never asks you to game the average. Two strong attempts in a row is the evidence; a strong one followed by a collapse is information, not noise — the average drops, and that is the rule working.

## The weak-area loop

Every mock attempt produces a **per-chapter report** — how many of each chapter's questions you got right. That report is the point of the exercise: it converts "I got 70%" into "**my weakest chapter is 4** — boundary values and decision tables need work."

The workflow between mocks:

1. **Read the report's per-chapter bars** and pick the weakest chapter (ties: pick the chapter with more exam weight).
2. **Go back to that module** — re-read its lessons (especially the worked technique examples) and drill its flashcard deck until the recall is fast again.
3. **Then take the next mock.** Resist the urge to immediately re-sit the same mock "to prove it was a fluke" — retaking without reviewing just re-rolls the dice on the same gaps. The loop is *report → review → retake*, and it is the same [test process](https://istqb-glossary.page/test-process/) idea you teach in Module 6: monitor, compare against [exit criteria](https://istqb-glossary.page/exit-criteria/), act on the gap.

A common rhythm that works: mocks 1 and 2 as **diagnostics** (they establish your baseline and your reading), then the weak-area loop, then mocks 3–5 as **dress rehearsals** — full 60 minutes, no notes, no pausing, treated exactly like exam day.

## In plain terms

- A mock exam is a blueprint-exact rehearsal: 40 questions, 60 minutes, pass at 65%, with the official chapter split (8/6/4/11/9/2) and K-level mix (8/24/8). Retakes re-draw questions within that blueprint.
- Readiness = **average of your last 2 mock attempts ≥ 80%** — a margin above the pass mark, not the pass mark itself. Two attempts minimum; one score is not a reading.
- The weak-area loop turns each report into targeted study: weakest chapter → that module's lessons and flashcards → next mock. Report, review, retake — never just retake.

## Check yourself

1. Your first mock scores 68% — a pass. Why does the app still show no readiness reading, and what two things would you look at before the second attempt?
2. Your last two attempts are 78% and 82%. The average is exactly 80%. Are you ready, and why does the rule use the average rather than the most recent attempt?
3. You scored 75% overall with Ch4 at 4 of 11 and Ch5 at 8 of 9. Which module do you revisit first, and what specifically do you do there before retaking?
4. A friend "studies" by taking the same mock five times in a row until the score climbs. What does the re-draw rule say that practice actually measures?
