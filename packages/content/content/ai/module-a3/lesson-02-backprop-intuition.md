+++
id = "ai-m3-backprop-intuition"
module = "ai-m3-neural-networks"
title = "Blame Flows Backward"
minutes = 12
objectives = ["A3-3"]
videos = [
  { title = "What is backpropagation really doing? (3Blue1Brown)", url = "https://www.youtube.com/watch?v=Ilg3gGewQ5U" },
]
diagrams = [
  { title = "Backpropagation as blame assignment through a two-layer toy network", file = "diagrams/backprop-blame.svg" },
]
+++

## First, the model has to know it was wrong (A3-3)

Training starts with a judgment the network got wrong — or not wrong *enough right*. To learn from that, the process needs a number measuring the wrongness: the **[loss](https://en.wikipedia.org/wiki/Loss_function)**. If the true answer was 0 and the model predicted 0.9, the loss is large; if it predicted 0.1, the loss is small. Loss is the "how wrong were we" dial, and the goal of training is simply: turn it down.

That framing matters for testers too. Every AI training loop is an error-measurement loop — the whole discipline stands on measuring mistakes honestly, which is the same discipline testing brings to any software.

## Blame assignment, by contribution (A3-3)

Knowing the output was wrong is not enough. The network has thousands of weights — which of them caused the mistake? **[Backpropagation](https://en.wikipedia.org/wiki/Backpropagation)** answers with an idea you already use as a tester: **assign blame in proportion to contribution.**

Picture the toy network from the diagram: two hidden neurons (h1 and h2) feed one output, and the output is wrong by a total error of 1.0. Suppose h2's weights pushed the output strongly while h1's barely moved it. Then:

- **h2's connections carry most of the blame** — say 0.8 of the error — because changing them changes the output a lot.
- **h1's connections carry little** — say 0.2 — because changing them barely moves anything.
- And each hidden neuron passes its own share *further backward* the same way, down to the inputs.

![Backpropagation as blame assignment through a two-layer toy network](diagrams/backprop-blame.svg)

One honest caveat: the real rule weighs each connection's *influence on the error* with slightly more machinery than raw contribution — but the intuition above is genuinely the heart of it, and the machinery exists to make that intuition exact. No calculus is required to *use* or *test* what follows.

## Why the blame travels output → input (A3-3)

Why work backward? Because blame is *relative*: how much a hidden neuron deserves depends on how much the **output** neuron used it. You cannot score the hidden layer until you have scored the layer after it. So the assignment must start where the error is known — the output — and walk backward, layer by layer, each layer's share computed from the layer ahead of it. Forward would mean guessing blame for a layer whose downstream consequences are not yet known.

This ordering is also why training is expensive: every example requires a full pass backward through the whole network.

## From blame to movement

Once every weight knows its share of the blame, learning is a small, repeated move: **each weight steps a little in the direction that reduces its share.** "A little" is doing real work there — how big a step is allowed to be turns out to be one of the most consequential settings in all of machine learning, and it gets its own lesson next.

## What testers take away

Three things worth keeping:

- **A misprediction has a traceable internal cause.** "The model was wrong" can be followed by "these connections carried most of the blame" — AI debugging is measurement plus attribution, not vibes.
- **Training changes numbers, not code.** The "fix" for a wrong prediction is a weight adjustment — which means behavior can shift in *other* inputs too. Regression thinking applies doubly: after retraining, previously-correct behavior must be re-verified.
- **The loss number is the training loop's own oracle.** When a team cannot say what their loss is doing, nobody — including them — knows whether training is working.

## In plain terms

- Loss = the measured wrongness of a prediction; training exists to reduce it.
- Backpropagation = blame assignment: each weight gets a share of the error in proportion to how much it contributed.
- Blame flows output → input, because each layer's share depends on the layers after it.
- Learning = every weight taking a small step against its own share of blame.
- For testers: training rewrites numbers, not code — so retraining is a regression-testing event.

## Check yourself

1. In the toy network, why does h2 receive 0.8 of the blame while h1 receives only 0.2?
2. Why can't blame be assigned starting from the input layer?
3. A team retrains a model to fix one misclassification and re-deploys. From a testing standpoint, what else must be re-verified, and why?
