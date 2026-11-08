+++
id = "ai-m3-gradient-descent"
module = "ai-m3-neural-networks"
title = "Learning Is Rolling Downhill"
minutes = 12
objectives = ["A3-4", "A3-5"]
videos = [
  { title = "Gradient descent, how neural networks learn (3Blue1Brown)", url = "https://www.youtube.com/watch?v=IHZwWFHWa-w" },
]
diagrams = [
  { title = "The loss landscape with too-small, just-right, and too-big learning-rate steps", file = "diagrams/gradient-descent-landscape.svg" },
]
demo = "perceptron"
+++

## The loss landscape (A3-4)

After the last lesson, training reduces to a picture you can hold in your head. Every possible setting of the network's weights produces *some* loss — some amount of wrongness on the training examples. Imagine plotting that: every setting is a location, its loss is the **height** of the ground there. That terrain is the **loss landscape**: hills of bad settings, valleys of good ones, and training is the search for a low valley.

**[Gradient descent](https://en.wikipedia.org/wiki/Gradient_descent)** is how the search moves. At the current setting, the network measures the local slope — which direction is *downhill* — and takes a small step that way. Then it measures again, steps again. No map of the whole landscape exists; the algorithm only ever knows the slope under its feet, and the descent emerges from repetition. The blame assignment from last lesson is exactly how the slope gets measured: each weight's share of blame tells it which way, and how hard, to step.

## The learning rate (A3-5)

How far is "a small step"? That setting is the **[learning rate](https://en.wikipedia.org/wiki/Learning_rate)** — the size of each step down the landscape — and it is the classic too-much/too-little dial:

- **Too big:** each step overshoots the valley it is descending — the ball flies across and lands *higher* on the far wall. The loss bounces up and down, sometimes climbing forever.
- **Too small:** each step barely moves. Training crawls — thousands of steps, enormous cost, and possibly a stalled run that never reaches the valley at all.
- **Just right:** steady, visible progress — loss falling smoothly round after round.

![The loss landscape with too-small, just-right, and too-big learning-rate steps](diagrams/gradient-descent-landscape.svg)

There is no universally correct value; teams tune it per problem, and watching the loss curve is how they know whether they chose well.

## Why many small steps work

The deepest idea here is that **each step is nearly blind** — it knows one slope measurement, nothing about where the valley bottom lies — and yet repetition finds good settings anyway. Downhill steps, taken honestly and often, trace the curve all the way to a low point. That is also why training takes so long in practice: not one clever leap, but thousands of nearly-blind steps, each cheap, adding up to a descent.

## Try it: train a perceptron

Below this section is a working [perceptron](https://en.wikipedia.org/wiki/Perceptron) — the grandfather of neural networks: one neuron, two weights and a bias, drawing a straight boundary between two classes of points. It is trained by the real thing: the animation runs hand-rolled gradient-descent steps — exactly the loop described above — at about a hundred steps per second.

Press **Train** and watch for three things:

- The **loss readout** starts around 0.25 with 23 of 40 points misclassified, and falls smoothly as the steps add up — the ball rolling downhill.
- The **boundary line** swings into place between the two clusters — the weights finding the valley.
- **Errors** hit zero before the press ends; the loss keeps sinking after that as the model grows more confident.

Press **Reset** to restore the starting line, and train again — same start, same steps, same result. That repeatability is not a trick: the steps are deterministic math, and this demo's dataset and sequence are fixed. What you are watching is genuinely what a training loop does, at toy scale.

## What testers take away

- **The loss readout is the training loop's health signal.** "Loss falls smoothly" is what working training looks like; a loss that will not fall is a defect report waiting to be filed — module A2 would check the data first, then the learning rate.
- **The learning rate is a testable dial.** Same data, same code — changing only the step size flips training from converging to diverging. Configuration matters as much as code.
- **Repeatability is a feature you can check.** This demo retrains identically every time; when a real training run does *not* reproduce, that difference is itself a finding worth chasing.

## In plain terms

- Every weight setting has a loss; the landscape metaphor turns training into rolling downhill.
- Gradient descent = measure the local slope, step downhill, repeat — thousands of nearly-blind steps that add up to a descent.
- Learning rate = step size: too big overshoots and bounces, too small crawls, just right falls smoothly.
- The loss curve is the health signal testers should ask about first.
- You trained a real perceptron below — gradient descent is genuinely that simple at heart.

## Check yourself

1. In the demo, why does the loss keep falling even after the error count reaches zero?
2. What would you expect to see in the loss readout if the demo's learning rate were 100× larger — and why?
3. Why does "we tuned the learning rate" count as a change worth regression-testing?
