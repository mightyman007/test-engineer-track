+++
id = "ai-m2-learning-paradigms"
module = "ai-m2-how-machines-learn"
title = "Three Ways Machines Learn"
minutes = 12
objectives = ["A2-2"]
videos = [
  { title = "Supervised vs. Unsupervised Learning (IBM Technology)", url = "https://www.youtube.com/watch?v=W01tIRP_Rqs" },
  { title = "A Gentle Introduction to Machine Learning (StatQuest with Josh Starmer)", url = "https://www.youtube.com/watch?v=Gv9_4yMHFhI" },
]
diagrams = [
  { title = "Three ways machines learn, side by side", file = "diagrams/three-paradigms.svg" },
]
+++

## Supervised: learning with an answer key (A2-2)

**[Supervised learning](https://en.wikipedia.org/wiki/Supervised_learning)** trains on examples where every set of features arrives with its label — like studying with an answer key. The model's job: learn the mapping from features to labels well enough to label *new* examples it has never seen.

Two everyday flavors:

- **Classification** — the label is a category: spam or not spam, cat or dog or bird.
- **Regression** — the label is a number: tomorrow's delivery time, a house price.

The spam filter from the previous lesson is supervised: labeled examples in, learned pattern applied to the whole inbox.

## Unsupervised: finding structure without an answer key

**[Unsupervised learning](https://en.wikipedia.org/wiki/Unsupervised_learning)** gets examples with *no labels*. The model's job is to find structure on its own — to group similar things together, or to spot what doesn't fit.

- **[Clustering](https://en.wikipedia.org/wiki/Cluster_analysis)**: given a pile of customer records, group them into segments — without anyone saying what the "right" segments are. Like sorting a shoebox of photos into look-alike piles without being told the categories.
- **[Anomaly detection](https://en.wikipedia.org/wiki/Anomaly_detection)**: learn what "normal" looks like, then flag what doesn't fit — the way a fraud system blinks at a purchase pattern that breaks your own history.

The tester-relevant catch: with no answer key, there is nothing absolute to check the output against. Two different clusterings can both be "reasonable". A tester must judge whether the structure *makes sense for the product* — a human judgment, not a spec check.

## Reinforcement: learning by trial and error

**[Reinforcement learning](https://en.wikipedia.org/wiki/Reinforcement_learning)** needs neither an answer key nor a pile of examples. Instead, an agent takes actions in an environment and receives **rewards**; it keeps the strategies that score well. It is how a program learned to play Go by playing itself millions of times — the approach behind [AlphaGo](https://en.wikipedia.org/wiki/AlphaGo) — and how recommendation systems learn which suggestions keep you watching.

The tester-relevant catch is sharper here: the system optimizes *the reward you defined*, not *the outcome you meant*. A cleaning robot rewarded for "no dust visible" may learn to hide dust under the sofa. That gap — specified reward versus intended behavior — is a testing problem, and a rich source of surprises.

![Three ways machines learn, side by side](diagrams/three-paradigms.svg)

## Why the paradigm matters to testers

- **Supervised**: failures trace back to labels and data — the ground truth is your test oracle.
- **Unsupervised**: outputs are judged for usefulness, not correctness — testing shifts to human review of the discovered structure.
- **Reinforcement**: the reward function is the real "spec" — review it like a requirement, because a gamed reward is a defect.

## In plain terms

- Supervised = labeled examples and an answer key (spam filters, price predictions).
- Unsupervised = unlabeled examples and structure-finding (customer groups, anomaly alerts).
- Reinforcement = actions, rewards, and trial-and-error strategy (game AI).
- Each paradigm fails differently: wrong labels, meaningless structure, or a gamed reward.

## Check yourself

1. A music app groups listeners into "taste tribes" nobody predefined. Which paradigm is that, and what makes testing it unusual?
2. Why is a reward function comparable to a requirement in classic testing?
3. Give one example each of classification and regression from software you actually use.
