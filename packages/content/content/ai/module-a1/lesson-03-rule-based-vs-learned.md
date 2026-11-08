+++
id = "ai-m1-rule-based-vs-learned"
module = "ai-m1-what-is-ai"
title = "Rule-Based vs Learned Systems: the Spell Checker and the Autocomplete"
minutes = 12
objectives = ["A1-3", "A1-4"]
videos = [
  { title = "The AI Choosing Your Videos Was Graded, Not Taught — how machines learn (CGP Grey)", url = "https://www.youtube.com/watch?v=R9OHn5ZF4Uo" },
]
diagrams = [
  { title = "Rule-based vs learned systems, side by side", file = "diagrams/rule-vs-learned.svg" },
]
+++

## The old way: rules written by people (A1-3)

A **[rule-based system](https://en.wikipedia.org/wiki/Rule-based_system)** behaves exactly as its written rules say. The classic form is the **[expert system](https://en.wikipedia.org/wiki/Expert_system)**: encode a human expert's knowledge as if-then rules ("if fever and rash, then consider measles") and let the program apply them. Everything the system does traces back to a rule a person typed.

Your phone's **[spell checker](https://en.wikipedia.org/wiki/Spell_checker)** works largely this way: a dictionary plus rules — flag words that aren't in the dictionary, rank suggested corrections by simple similarity. Nobody learned anything here; the behavior *is* the rules.

## The new way: behavior learned from examples

A **learned system** — what this track means by [machine learning](https://en.wikipedia.org/wiki/Machine_learning) — gets its behavior from examples instead. Engineers don't write the judgment; they collect data, run a training process, and the resulting judgment lives in a large pile of numbers.

The same keyboard that holds your spell checker also holds **[autocomplete](https://en.wikipedia.org/wiki/Autocomplete)**, and that part *is* learned: suggestions come from patterns distilled from billions of sentences — the everyday face of [natural language processing](https://en.wikipedia.org/wiki/Natural_language_processing). No engineer wrote "after 'good', suggest 'morning'"; the pattern emerged from the data.

## Worked contrast: two features, side by side

![Rule-based vs learned systems, side by side](diagrams/rule-vs-learned.svg)

The pair is perfect for testers because both features live on the same keyboard and are judged by the same users — yet they fail differently:

- **The spell checker fails loudly and predictably.** It flags a rare but correct name. Annoying, visible, instantly explainable — and fixable by editing a rule or the dictionary.
- **The autocomplete fails quietly and subtly.** It may suggest a plausible-but-wrong word, or an unfortunate completion in a sensitive context. There is no rule to read or repair; the "why" is buried in the training data.

## What this means for testing (A1-4)

This is the hinge of the whole AI track, so let's say it precisely:

- **Rule-based systems**: behavior is readable, so expected results come from the rules. Test them the way you'd test any software — exercise each rule and its [boundary values](https://istqb-glossary.page/boundary-value-analysis/). Your ISTQB track is earning its keep here.
- **Learned systems**: there is no rule to read. Expected results must come from **labeled examples** — data where the correct answer was agreed in advance — and quality is measured statistically over many inputs, not asserted rule by rule.

Learned behavior also moves when the data moves: retrain on new data and yesterday's answers can shift. That is why AI testing keeps measuring after release — the system you tested is not guaranteed to be the system you ship next.

## In plain terms

- Rule-based: people write the rules; behavior is readable; failures are loud; testing means exercising the rules.
- Learned: data shapes the behavior; nobody can read it; failures are subtle; testing means measuring against labeled examples.
- Spell checker vs autocomplete tells the whole story in one keyboard.
- Retraining can change behavior — so AI testing is never "done once".

## Check yourself

1. Why is a spell checker's failure easier to predict than an autocomplete's?
2. Where do expected results come from for a learned system, given that there is no rule to read?
3. Your team retrains an autocomplete monthly. What does that imply for your test strategy?
