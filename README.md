## How to run the project

```bash
nvm use
npm i
```

Create a `.env` file in the root of the project:

```
AI_API_KEY=<your key here>
```

Then:

```bash
npm run dev
```

## Switching AI vendors

The project talks to the model through the [Vercel AI SDK](https://ai-sdk.dev), which is vendor-neutral. Exactly one file
names a vendor: **`src/llm/model.ts`**

```ts
import { anthropic } from "@ai-sdk/anthropic";

export const extractionModel = anthropic("claude-haiku-4-5");
```

Everything downstream — the prompt, the extraction schema, the error mapping, the
service, the routes — depends only on `extractionModel`, so a vendor swap is four
small edits.

**1. Install the provider package**

```bash
npm rm @ai-sdk/anthropic
npm i @ai-sdk/openai        # or @ai-sdk/google, @ai-sdk/mistral, ...
```

**2. Point `src/llm/model.ts` at it**

```ts
import { openai } from "@ai-sdk/openai";

export const extractionModel = openai("gpt-5");
```

# My approach

General:
Though this reflects a real world scenario, it's also a tech test, so I wanted to keep any over-engineering/flaunting of extra solutions to a minimum.
I explain more about this in Assumptions.

AI:
AI was used incrementally and under heavy guidance throughout. I find it especially useful when querying for documentation, writing tests and initial project scaffolding.

Tooling:
I tend to lean toward relying on well-tested out of the box solutions for business cases that have been solved.
Zod for schema validation, Vercel's ai library for the llm abstraction layer and also the marshalling of the llm output into the schema.

Code setup:
I stuck to a conventional express app setup here, both because it's what I'm comfortable with and because I find it readable and navigable.
Separation of concerns is ensured with routes => controllers => services. I added import aliases out of personal preference (I know they aren't that useful in a codebase of this size).

# Assumptions

1: Complexity and the single-response model

While building this the first assumption I had to make was that it's not a complete process, but a part of one. Or an analogue of that part.
In reality a single HTTP request is a poor model for a patient transcript, because it doesn't allow you to resolve incomplete information. The single-request framing and the requirement of validation for the output almost implied a fail scenario for insufficient information, but that would be a mistake. We have to therefore imagine that this is one part of an ongoing conversation, and the 'errors' of validation will be resolved by a conversational loop, where the LLM is trying to fill and update a checklist, and our validation is leading either to:

A) Missing fields: ["urgency", "symptoms"]
or
B) Validation complete exit with recommended_action.

As a result missing fields (owed to vagueness/absence) are `null`.

The expected returned JSON did not cater for any mechanism around an action like 'seek clarification', and so for that reason, along with the fact that this is a tech test, I decided not to implement more than the framework for a single-request. In principle a conversation could still be maintained by a downstream service that receives the output, and then makes a decision on whether to enquire further.

2: Confidence
I gave the LLM the task of grading it's own homework.
This was an interesting one, and for the tech test I had to make the assumption of 'this will be good enough' that I wouldn't make in real life. LLMs are not good/great at determining confidence levels, in fact they routinely are overconfident. Generally the solution is to not trust the llm's outputted confidence and rely on something independent of it. I had to look into some better ways of getting this score, because I didn't know off the top of my head:

- Running multiple instances of the model, and averaging the score. Though this still assumes that the model is at least decent at gauging its own confidence, which is a somewhat dubious proposition.
- Token probabilities: Some models pass on `logprobs` which are the probabilities attached to individual tokens at the time of generation, i.e. the token `urgent` at 0.99. This is more trustworthy because it's the actual scoring the model does under the hood for that token, rather than the heavily abstracted 'confidence' it ascribes to the transcript as a whole. The difficulty is in parsing logprobs to find the relevant value for your schema output, because it's a scoring per-token.
- Schema and rule validation: this would be comparing its confidence score to the actual fields it generates along with the transcript.
