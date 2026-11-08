+++
id = "ai-m1-what-is-ai"
module = "ai-m1-what-is-ai"
title = "What AI Is — and What It Isn't"
minutes = 10
objectives = ["A1-1", "A1-5"]
videos = [
  { title = "What is Artificial Intelligence? In 5 minutes (Dr. Raj Ramesh)", url = "https://www.youtube.com/watch?v=2ePf9rue1Ao" },
]
diagrams = [
  { title = "AI, machine learning, and deep learning as nested circles", file = "diagrams/ai-nesting.svg" },
]
+++

## What artificial intelligence actually is (A1-1)

**[Artificial intelligence](https://en.wikipedia.org/wiki/Artificial_intelligence) (AI)** is a label for software that does things we normally associate with human intelligence: recognizing what's in a photo, understanding a sentence, predicting what happens next, deciding what to do. Notice what that definition does *not* claim: it doesn't say the software is smart, conscious, or alive. It is software — instructions and data running on ordinary machines — that produces useful judgments.

Here is the working definition this track uses, and it's worth memorizing: **AI is software that makes judgments you cannot fully predict by reading its code alone.** A traditional program's behavior can be traced through its code line by line; an AI feature's behavior was *shaped by data*, so the code shows you the machinery but not the judgments.

## What AI is not

Four myths are worth deflating early, because each one distorts how people test AI features:

- **It isn't a brain.** Nothing in today's AI is conscious or self-aware. It is [algorithms](https://en.wikipedia.org/wiki/Algorithm) — math procedures — running at enormous speed. Tools like [ChatGPT](https://en.wikipedia.org/wiki/ChatGPT) produce fluent language by predicting likely next words, not by reasoning the way you do.
- **It isn't always learning.** Most AI products are trained once and shipped frozen. Your favorite app's model doesn't get smarter overnight unless its makers retrain and redeploy it.
- **It isn't always right — or always wrong.** AI systems are neither magic nor garbage. They get a measurable share of judgments right and a measurable share wrong; the tester's job is to measure those shares.
- **It isn't one technology.** "AI" is an umbrella covering everything from hand-written rule lists to giant neural networks — and the differences matter enormously for testing.

## You already use AI every day (A1-5)

AI stopped being futuristic years ago; it shipped quietly into software you already touch:

- **Email**: spam filters judge every incoming message, and the "Promotions" tab is a model's guess about what each message is.
- **Keyboards**: [autocomplete](https://en.wikipedia.org/wiki/Autocomplete) predicts your next word from patterns learned on enormous amounts of text.
- **Entertainment**: every "recommended for you" row comes from a [recommender system](https://en.wikipedia.org/wiki/Recommender_system) — software that learned viewing patterns.
- **Phones**: [speech recognition](https://en.wikipedia.org/wiki/Speech_recognition) turns your voice into text; face unlock matches your face against a learned pattern.
- **Maps**: arrival-time estimates come from models trained on historical traffic — and the long-term destination of that technology is the [self-driving car](https://en.wikipedia.org/wiki/Self-driving_car).

Run a simple test on any software you use: does it make a *judgment* (is this spam? which word comes next?) that nobody wrote as an explicit rule? Then you are looking at an AI feature.

![AI, machine learning, and deep learning as nested circles](diagrams/ai-nesting.svg)

## Why testers should care

For traditional software we derive expected results from specifications and code: read the rule, predict the behavior, design the test. For an AI feature there is no rule to read — the behavior was learned from examples and lives in numbers nobody can meaningfully review by eye.

So the testing question changes: instead of "does the code follow the rule?", it becomes "how does this behavior perform on examples nobody trained it on?" Answering that needs labeled data and statistics rather than rule tracing — exactly the tools arriving in module A2.

## In plain terms

- AI = software making judgments we associate with human intelligence — no consciousness, no magic, just math at speed.
- Most deployed AI is task-specific and frozen after training; "it learns every day" is usually marketing.
- You already trust AI with your email, your keyboard, your recommendations, and your routes.
- The tester's shift: expected results stop coming from the code and start coming from data and measurement.

## Check yourself

1. Why is "the software figured out what I meant" a better description of an AI feature than "the software was programmed to do what I meant"?
2. Name three AI features in software you used this week, and the judgment each one makes.
3. A teammate says an AI feature can't have bugs because it "learned by itself." How would you respond?
