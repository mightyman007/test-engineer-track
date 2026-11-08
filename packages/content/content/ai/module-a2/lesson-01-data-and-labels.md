+++
id = "ai-m2-data-and-labels"
module = "ai-m2-how-machines-learn"
title = "Data, Features, and Labels: the Spam Filter's Diet"
minutes = 12
objectives = ["A2-1", "A2-5"]
videos = [
  { title = "How Machine Learning Works, End to End (KodeKloud)", url = "https://www.youtube.com/watch?v=du1B6633-hU" },
]
diagrams = [
  { title = "The machine-learning pipeline, from data to predictions", file = "diagrams/ml-pipeline.svg" },
]
+++

## Learning needs examples (A2-1)

A machine-learning system learns from **[training data](https://en.wikipedia.org/wiki/Training,_validation,_and_test_data_sets)**: a collection of examples, each one a record of something the system should eventually judge. No examples, no learning — it is that basic.

Each example has two parts:

- **[Features](https://en.wikipedia.org/wiki/Feature_(machine_learning))** — the *inputs*: the observable details the system will judge by. Think of them as the columns you'd fill in to describe each example.
- **[Labels](https://en.wikipedia.org/wiki/Labeled_data)** — the *answers*: what we want the system to predict for each example. The label is the correct answer attached to the example.

## Worked example: teaching a spam filter (A2-1)

Say we are building the classic: a spam filter. For each email in the training data we record features and a label:

- Email 1 — sender: known marketing domain; 14 links; subject in ALL CAPS → label: **spam**
- Email 2 — sender: your colleague; 0 links; plain subject → label: **not spam**
- Email 3 — sender: unknown domain; 9 links; contains "free money" → label: **spam**
- Email 4 — sender: your bank; 1 link; standard wording → label: **not spam**

After enough examples like these, the training process finds the pattern: *many links + shouty subject + unknown sender → spam*. The filter has learned a judgment that nobody wrote as a rule — and it now applies that judgment to mail its trainers never saw.

![The machine-learning pipeline, from data to predictions](diagrams/ml-pipeline.svg)

## The labels have a formal name: ground truth (A2-5)

One more term, and it is a gift to testers: the labeled answers are called **[ground truth](https://en.wikipedia.org/wiki/Ground_truth)** — the agreed "what is actually true" that the model is judged against. It is the same idea as the oracle in classic testing: something that tells you what the *right* output was. When an AI team says a model is "92% accurate", that number means nothing until you ask: *accurate against which ground truth?*

## Why data quality dominates everything (A2-5)

The pipeline above has one uncomfortable property: **errors flow from the data into the behavior, silently.**

- **Wrong labels teach wrong lessons.** If newsletters get labeled "spam", the model confidently learns to bury newsletters — and will repeat that mistake millions of times a day.
- **Missing variety creates blind spots.** Train a spam filter only on English spam and a spam wave written in another language sails straight through.
- **Old data goes stale.** Spam tactics change weekly; a model trained on last year's spam judges this year's spam poorly.

That is why practitioners say **garbage in, garbage out** — and why AI teams often spend more effort on [data cleansing](https://en.wikipedia.org/wiki/Data_cleansing) than on clever model design. For a tester this reframes the product: an AI feature is only as good as its least-credible data, and the data pipeline is as much a test target as the model itself.

## In plain terms

- Training data = examples; features = the inputs to judge by; labels = the answers to predict.
- The spam filter learned "many links + ALL CAPS + unknown sender → spam" from examples, not from a rule.
- Labels are the ground truth — the oracle that AI systems, and their testers, are measured against.
- Garbage in, garbage out: data quality dominates outcomes, so the data deserves first-class testing.

## Check yourself

1. In a music-recommendation dataset, name one plausible feature and the label.
2. Why does one mislabeled example cause more damage than one odd feature value?
3. A model scores 92% against its labels. Why is that number only as trustworthy as the labels themselves?
