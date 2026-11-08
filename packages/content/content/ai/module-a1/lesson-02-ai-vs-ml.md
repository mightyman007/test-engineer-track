+++
id = "ai-m1-ai-vs-ml"
module = "ai-m1-what-is-ai"
title = "AI vs Machine Learning vs Deep Learning"
minutes = 10
objectives = ["A1-2"]
videos = [
  { title = "AI vs Machine Learning (IBM Technology)", url = "https://www.youtube.com/watch?v=4RixMPF4xis" },
  { title = "Machine Learning vs Deep Learning (IBM Technology)", url = "https://www.youtube.com/watch?v=q6kJ71tEYqM" },
]
diagrams = [
  { title = "AI, machine learning, and deep learning as nested circles", file = "diagrams/ai-nesting.svg" },
]
+++

## Three terms, one diagram (A1-2)

The three terms you will hear constantly are **nesting dolls**, not rivals:

- **[Artificial intelligence](https://en.wikipedia.org/wiki/Artificial_intelligence) (AI)** — the umbrella: any software doing tasks we'd call smart, *however it was built*. A 1990s chess engine that picks moves using hand-written rules and brute-force search is AI, even though nothing in it was learned.
- **[Machine learning](https://en.wikipedia.org/wiki/Machine_learning) (ML)** — a subset of AI where the behavior is **learned from examples** instead of hand-written. Show a program thousands of labeled spam emails and it works out the "spammy" pattern itself.
- **[Deep learning](https://en.wikipedia.org/wiki/Deep_learning) (DL)** — a subset of ML built on [neural networks](https://en.wikipedia.org/wiki/Neural_network_(machine_learning)): many-layered mathematical structures loosely inspired by the brain's wiring. Deep learning powers face unlock, [speech recognition](https://en.wikipedia.org/wiki/Speech_recognition), and modern assistants like [ChatGPT](https://en.wikipedia.org/wiki/ChatGPT).

![AI, machine learning, and deep learning as nested circles](diagrams/ai-nesting.svg)

## Why the nesting matters

Two consequences are worth memorizing:

- **Every deep-learning system is machine learning, and every machine-learning system is AI. The reverse is false in both directions.** A rules-only chess engine is AI without being ML; a spam filter trained on a few thousand labeled emails is ML without being deep learning.
- **The layer predicts the testing experience.** Rule-based AI behaves like classic software — readable rules, predictable failures. Machine learning behaves like a box fed by data. Deep learning behaves like a very large box that can surprise even its own builders.

## When "AI" is really something else

Product pages now say "AI-powered" about nearly everything. Ask the one question that sorts it out: **where did the behavior come from?**

- Written by engineers as explicit rules → AI-flavored, but not machine learning. A spell checker's red underline comes from a dictionary plus rules, not from learning.
- Learned from data → machine learning. The same keyboard's *next-word suggestions* come from learned patterns.
- Learned from data by a many-layered neural network → deep learning. Face unlock is the everyday example.

One product can mix all three: the spell checker may be rule-based while the autocomplete beside it is learned. "AI-powered" on the box tells you nothing; the source of the behavior tells you everything.

## In plain terms

- AI ⊃ ML ⊃ DL — nesting dolls, not competing buzzwords.
- Machine learning = behavior learned from examples; deep learning = ML built on many-layered neural networks.
- Hand-written-rule chess engines are AI but not ML, which is exactly why the layers matter.
- The layer you are testing decides how readable the behavior is — and that decides your whole test approach.

## Check yourself

1. A teammate says "our feature uses deep learning, so it isn't machine learning." What is wrong with that sentence?
2. Why is a rules-only chess engine AI but not machine learning?
3. Classify each: (a) a thermostat that switches on below 20°C, (b) a spam filter trained on labeled email, (c) face unlock.
