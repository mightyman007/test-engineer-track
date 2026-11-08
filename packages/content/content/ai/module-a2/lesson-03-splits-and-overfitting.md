+++
id = "ai-m2-splits-and-overfitting"
module = "ai-m2-how-machines-learn"
title = "Train, Validate, Test — and the Art of Memorizing"
minutes = 12
objectives = ["A2-3", "A2-4"]
videos = [
  { title = "Machine Learning Fundamentals: Cross Validation (StatQuest with Josh Starmer)", url = "https://www.youtube.com/watch?v=fSytzGwwBVw" },
]
diagrams = [
  { title = "Training vs validation error as training progresses", file = "diagrams/overfitting-curve.svg" },
]
+++

## Don't test with the questions the model studied (A2-3)

Here is the exam-hall rule of machine learning. Before any training happens, the labeled examples are split three ways:

- **Training set** — the study material: what the model learns from.
- **Validation set** — the practice exam: held-out examples used *during* development to tune the approach and catch trouble early.
- **Test set** — the final exam: touched exactly once, at the very end, to report honest performance. ([More on the three splits](https://en.wikipedia.org/wiki/Training,_validation,_and_test_data_sets))

Why the ceremony? Because a model graded only on questions it has studied tells you nothing. The entire business of machine learning is performing on **examples it has never seen** — so the final measurement must use examples kept out of its studies from the start.

## Overfitting: memorizing the practice exam (A2-4)

**[Overfitting](https://en.wikipedia.org/wiki/Overfitting)** is the classic failure: the model doesn't learn the pattern, it *memorizes the examples* — including their noise and quirks. On training data it looks brilliant. On new data it stumbles, because the quirks it memorized don't repeat in real life.

Student analogy: someone who memorized last year's exam paper letter-by-letter aces a rerun of that exact paper — and fails a new one.

The mirror-image failure is **underfitting**: the model is *too simple* to capture even the training pattern, like a student who read only the chapter titles. It performs poorly everywhere.

![Training vs validation error as training progresses](diagrams/overfitting-curve.svg)

## The validation set is the alarm

Read the diagram again: training error only ever goes down — memorization guarantees that — so training performance **cannot warn you** of anything. The alarm lives in the validation set: when validation error starts climbing while training error keeps falling, the model has crossed from learning into memorizing.

And the test set stays sealed until the end. If the team "peeks" at test results and keeps tuning, the test set silently becomes a validation set — and the final reported number flatters the model. Treat peeking as what it is: a process defect that corrupts the one honest measurement you had.

## Why data quality still dominates

The splits protect the *measurement*; the data still decides the *ceiling*:

- **Mislabeled examples** teach wrong lessons — and if labels are wrong in the test set too, even the honest score is measured against a wrong answer key.
- **Duplicates leaking across splits** inflate scores: if near-identical examples sit in both training and test, the model is graded partly on questions it studied. Testers, hunt for leaks — they are a classic quiet defect.
- **Stale data** can win the split game and still lose in production: the world keeps moving after training day.

## What testers take away (A2-4)

When you review or test an AI feature, the splits hand you sharp questions:

- What data was it trained on, and how does that differ from the users it will serve?
- Is the reported score from the untouched test set — or from a peeked one?
- How does validation performance compare with what users actually experience?

Those questions are the difference between "the demo worked" and "the feature works".

## In plain terms

- Split before training: training set = study, validation set = practice exam, test set = the final exam, used once.
- Overfitting = memorizing examples including their noise; underfitting = too simple to learn anything at all.
- Training-only metrics cannot warn you; the validation curve can.
- Data quality and split hygiene decide whether any reported number means anything.

## Check yourself

1. Why must the test set be used exactly once?
2. What does it mean when validation error rises while training error keeps falling?
3. Near-duplicate emails ended up in both the training and test sets. What does that do to the reported accuracy?
